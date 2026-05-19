import { FastifyInstance } from 'fastify';
import { TaskController } from './task.controller';

const taskController = new TaskController();

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', (request, reply) => taskController.createTask(request, reply));
  fastify.get('/project/:projectId', (request, reply) =>
    taskController.getTasksByProject(request, reply),
  );
  fastify.get('/:id', (request, reply) => taskController.getTaskById(request, reply));
  fastify.patch('/:id', (request, reply) => taskController.updateTask(request, reply));
  fastify.delete('/:id', (request, reply) => taskController.deleteTask(request, reply));

  // Comment routes
  fastify.post('/:id/comments', (request, reply) => taskController.addComment(request, reply));
  fastify.get('/:id/comments', (request, reply) => taskController.getComments(request, reply));
}
