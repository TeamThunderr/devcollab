import { Server, Socket } from 'socket.io';
import { redis } from '../../redis/client';
import { query } from '../../db/client';

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('chat:join', async ({ projectId }) => {
    if (!projectId) return;

    try {
      const userId = socket.data?.user?.userId;
      const wsRole = socket.data?.workspaceRole;

      if (!userId) {
        socket.emit('error', { message: 'Unauthorized: No user session found' });
        return;
      }

      // Owner and Admin bypass project membership check
      if (wsRole !== 'OWNER' && wsRole !== 'ADMIN') {
        const projCheck = await query(
          'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
          [projectId, userId]
        );
        if (!projCheck.rowCount) {
          console.warn(`[Socket Chat Join Denied] User ${userId} not assigned to project ${projectId}`);
          socket.emit('error', { message: 'Unauthorized: You are not assigned to this project' });
          return;
        }
      }

      socket.join('chat:' + projectId);
      
      // Mark as seen
      if (redis) {
        try {
          await redis.set(
            'chat:seen:' + projectId + ':' + userId,
            new Date().toISOString()
          );
        } catch (err) {
          console.error('Redis chat:seen set failed', err);
        }
      }
      socket.emit('chat:joined', { projectId });
    } catch (err) {
      console.error('[Socket Chat Join Error]', err);
      socket.emit('error', { message: 'Internal server error validating project membership' });
    }
  });

  socket.on('chat:leave', ({ projectId }) => {
    socket.leave('chat:' + projectId);
  });

  socket.on('chat:typing', ({ projectId }) => {
    if (!socket.data?.user) return;
    socket.to('chat:' + projectId).emit('chat:typing', {
      userId: socket.data.user.userId,
      name: socket.data.user.name || socket.data.user.email,
    });
  });

  socket.on('chat:stop-typing', ({ projectId }) => {
    if (!socket.data?.user) return;
    socket.to('chat:' + projectId).emit('chat:stop-typing', {
      userId: socket.data.user.userId,
    });
  });
}

// Export helper to emit from REST routes
export function emitChatMessage(io: Server, projectId: string, event: string, data: any) {
  io.to('chat:' + projectId).emit(event, data);
}
