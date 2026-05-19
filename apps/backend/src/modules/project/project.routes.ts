import { FastifyInstance } from 'fastify';
import { ProjectController } from './project.controller';

const projectController = new ProjectController();

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', (request, reply) => projectController.createProject(request, reply));
  fastify.get('/', (request, reply) => projectController.getProjects(request, reply));
  fastify.get('/:id', (request, reply) => projectController.getProjectById(request, reply));
  fastify.patch('/:id', (request, reply) => projectController.updateProject(request, reply));
  fastify.delete('/:id', (request, reply) => projectController.deleteProject(request, reply));
}
