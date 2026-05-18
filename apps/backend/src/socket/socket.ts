import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';

export async function initSocket(fastify: FastifyInstance): Promise<void> {
  // TODO: attach socket.io Server to fastify HTTP server
  // TODO: configure CORS for socket connections
  // TODO: register authentication middleware for socket
  // TODO: call task, workspace, and presence handlers
  void fastify;
  void Server;
}
