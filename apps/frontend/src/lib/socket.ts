import { io, Socket } from 'socket.io-client';

export let socket: Socket | null = null;

export function connect(): void {
  // TODO: initialise socket connection to backend, attach auth token
  void io;
}

export function disconnect(): void {
  // TODO: disconnect socket and clean up listeners
}
