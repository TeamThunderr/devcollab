import { FastifyInstance } from 'fastify';
import { ProjectController } from './project.controller';
import { verifyAuth } from '../../middleware/auth.middleware';

const projectController = new ProjectController();

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', verifyAuth);
  fastify.post('/', (request, reply) => projectController.createProject(request, reply));
  fastify.get('/', (request, reply) => projectController.getProjects(request, reply));
  fastify.get('/:id', (request, reply) => projectController.getProjectById(request, reply));
  fastify.patch('/:id', (request, reply) => projectController.updateProject(request, reply));
  fastify.delete('/:id', (request, reply) => projectController.deleteProject(request, reply));

  // Members routes
  fastify.get('/:id/members', (request, reply) => projectController.getProjectMembers(request, reply));
  fastify.post('/:id/members', (request, reply) => projectController.assignMember(request, reply));
  fastify.delete('/:id/members/:userId', (request, reply) => projectController.removeMember(request, reply));
}
