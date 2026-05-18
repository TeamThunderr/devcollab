import { Server } from 'socket.io';

export function handlePresence(io: Server): void {
  // TODO: track online users per workspace with Redis
  // TODO: emit presence:update to workspace room on connect/disconnect
  void io;
}
