import { Server } from 'socket.io';

export function handleTask(io: Server): void {
  // TODO: listen for task:create, task:update, task:move, task:delete events
  // TODO: broadcast changes to workspace room members
  void io;
}
