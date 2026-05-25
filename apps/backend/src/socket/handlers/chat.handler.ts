import { Server, Socket } from 'socket.io';
import { redis } from '../../redis/client';

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('chat:join', async ({ projectId }) => {
    socket.join('chat:' + projectId);
    
    // Mark as seen
    if (redis && socket.data?.user?.userId) {
      await redis.set(
        'chat:seen:' + projectId + ':' + socket.data.user.userId,
        new Date().toISOString()
      );
    }
    socket.emit('chat:joined', { projectId });
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
