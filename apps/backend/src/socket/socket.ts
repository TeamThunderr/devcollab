import http from 'http';
import jwt from 'jsonwebtoken';
import IORedis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { query } from '../db/client';
import {
  handlePresenceDisconnect,
  registerPresenceHandlers,
} from './handlers/presence.handler';
import { registerChatHandlers } from './handlers/chat.handler';
import { requireProjectAccess } from '../middleware/projectAccess';

interface JwtPayload {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface SocketUser {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface DevCollabSocketData {
  user: SocketUser;
  workspaceId: string;
  workspaceRole: string;
  activeTasks: Set<string>;
}

interface ClientToServerEvents {
  'join:project': (payload: { projectId: string }) => void;
  'leave:project': (payload: { projectId: string }) => void;
  'join:task': (payload: { taskId: string }) => void;
  'leave:task': (payload: { taskId: string }) => void;
  'presence:ping': (payload: { workspaceId: string; projectId?: string }) => void;
}

interface ServerToClientEvents {
  'joined:project': (data: { projectId: string }) => void;
  'joined:task': (data: { taskId: string }) => void;
  'task:created': (data: unknown) => void;
  'task:updated': (data: unknown) => void;
  'task:moved': (data: unknown) => void;
  'task:deleted': (data: unknown) => void;
  'comment:new': (data: unknown) => void;
  'presence:update': (data: unknown) => void;
  'notification:new': (data: unknown) => void;
  'task:viewing': (data: unknown) => void;
  'task:stopped-viewing': (data: unknown) => void;
  'snippet:created': (data: unknown) => void;
  'snippet:updated': (data: unknown) => void;
  'snippet:deleted': (data: { snippetId: string }) => void;
  error: (data: { message: string }) => void;
  [event: string]: (...args: any[]) => void;
}

type InterServerEvents = Record<string, never>;

type DevCollabServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  DevCollabSocketData
>;

type DevCollabSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  DevCollabSocketData
>;

let io: DevCollabServer;

export async function initSocket(httpServer: http.Server): Promise<void> {
  const rawOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''));

  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, DevCollabSocketData>(httpServer, {
    cors: {
      origin: [...rawOrigins, 'http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
    },
    transports: ['websocket'],
  });

  let redisConnected = false;

  try {
    const pubClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 50, 2000);
      }
    });
    const subClient = pubClient.duplicate();

    await Promise.all([
      pubClient.connect().catch(() => null),
      subClient.connect().catch(() => null)
    ]);

    const { createAdapter } = await import('@socket.io/redis-adapter');
    io.adapter(createAdapter(pubClient, subClient));
    redisConnected = true;
    console.log('✅ Socket.IO Redis adapter attached');
  } catch (err) {
    console.warn('⚠️  Redis unavailable — Socket.IO running in standalone mode');
  }
  void redisConnected;

  io.use((socket: DevCollabSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('unauthorized'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('server_error'));
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;
      if (!decoded.userId || !decoded.email) {
        return next(new Error('unauthorized'));
      }

      socket.data.user = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        avatar: decoded.avatar,
      };

      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket: DevCollabSocket) => {
    const { userId, email } = socket.data.user;
    const workspaceId = socket.handshake.auth?.workspaceId as string | undefined;
    if (!workspaceId) {
      socket.emit('error', { message: 'workspaceId is required in handshake.auth' });
      socket.disconnect(true);
      return;
    }

    try {
      const memberCheck = await query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, userId]
      );
      if (!memberCheck.rowCount) {
        console.warn(`[Socket Auth failed] User ${userId} is not a member of workspace ${workspaceId}`);
        socket.emit('error', { message: 'Unauthorized: You are not a member of this workspace' });
        socket.disconnect(true);
        return;
      }
      
      const workspaceRole = memberCheck.rows[0].role.toUpperCase();
      socket.data.workspaceRole = workspaceRole;
    } catch (err) {
      socket.emit('error', { message: 'Internal server error validating workspace membership' });
      socket.disconnect(true);
      return;
    }

    console.log(`Socket connected: ${socket.id} — user: ${userId} (${email})`);

    socket.data.workspaceId = workspaceId;
    socket.data.activeTasks = new Set<string>();

    socket.join(`workspace:${workspaceId}`);
    socket.join(`user:${userId}`);

    registerPresenceHandlers(io, socket as Parameters<typeof registerPresenceHandlers>[1]);
    registerChatHandlers(io, socket as any);

    socket.on('join:project', async ({ projectId }) => {
      if (!projectId) return;
      try {
        await requireProjectAccess(userId, projectId);
        socket.join(`project:${projectId}`);
        socket.emit('joined:project', { projectId });
      } catch (err) {
        socket.emit('error', { message: 'Unauthorized to join project' });
      }
    });

    socket.on('leave:project', ({ projectId }) => {
      if (!projectId) return;
      socket.leave(`project:${projectId}`);
    });

    socket.on('join:task', async ({ taskId }) => {
      if (!taskId) return;
      try {
        const taskCheck = await query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
        if (taskCheck.rowCount && taskCheck.rowCount > 0) {
          await requireProjectAccess(userId, taskCheck.rows[0].project_id);
          
          socket.join(`task:${taskId}`);
          socket.data.activeTasks.add(`task:${taskId}`);
          socket.emit('joined:task', { taskId });
          io.to(`task:${taskId}`).emit('task:viewing', {
            taskId,
            user: {
              userId: socket.data.user.userId,
              name: socket.data.user.name ?? socket.data.user.email,
              avatar: socket.data.user.avatar ?? null,
            },
          });
        }
      } catch (err) {
        socket.emit('error', { message: 'Unauthorized to join task' });
      }
    });

    socket.on('leave:task', ({ taskId }) => {
      if (!taskId) return;
      socket.leave(`task:${taskId}`);
      socket.data.activeTasks.delete(`task:${taskId}`);
      io.to(`task:${taskId}`).emit('task:stopped-viewing', {
        taskId,
        userId: socket.data.user.userId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} — user: ${userId}`);
      handlePresenceDisconnect(io, socket as Parameters<typeof handlePresenceDisconnect>[1]).catch((err) => {
        console.error(`[disconnect] Presence cleanup failed for socket ${socket.id}:`, err);
      });
    });
  });
}

export function emitToProject(projectId: string, event: string, data: unknown): void {
  if (!io) {
    console.error('emitToProject called before initSocket');
    return;
  }
  io.to(`project:${projectId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    console.error('emitToUser called before initSocket');
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
  if (!io) {
    console.error('emitToWorkspace called before initSocket');
    return;
  }
  io.to(`workspace:${workspaceId}`).emit(event, data);
}

export { io };
export default initSocket;
