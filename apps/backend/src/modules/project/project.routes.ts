import { FastifyInstance } from 'fastify';
import { ProjectController } from './project.controller';
import { verifyAuth } from '../../middleware/auth.middleware';
import { Role, verifyWorkspaceAccess, verifyProjectAccess } from '../../middleware/rbac.middleware';

const projectController = new ProjectController();

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', verifyAuth);

  fastify.post('/', { preHandler: [verifyWorkspaceAccess([Role.OWNER, Role.ADMIN])] }, (request, reply) => projectController.createProject(request, reply));
  fastify.get('/', { preHandler: [verifyWorkspaceAccess()] }, (request, reply) => projectController.getProjects(request, reply));

  fastify.get('/:id', { preHandler: [verifyProjectAccess] }, (request, reply) => projectController.getProjectById(request, reply));
  fastify.patch('/:id', { preHandler: [verifyProjectAccess] }, (request, reply) => projectController.updateProject(request, reply));
  fastify.delete('/:id', { preHandler: [verifyProjectAccess] }, (request, reply) => projectController.deleteProject(request, reply));

  // Members routes
  fastify.get('/:id/members', (request, reply) => projectController.getProjectMembers(request, reply));
  fastify.post('/:id/members', (request, reply) => projectController.assignMember(request, reply));
  fastify.delete('/:id/members/:userId', (request, reply) => projectController.removeMember(request, reply));

  // Project Member assignments
  fastify.get('/:id/members', { preHandler: [verifyProjectAccess] }, (request, reply) => projectController.getProjectMembers(request, reply));
  fastify.post('/:id/members', { preHandler: [verifyProjectAccess] }, (request, reply) => projectController.assignProjectMember(request, reply));
  fastify.delete('/:id/members/:userId', { preHandler: [verifyProjectAccess] }, (request, reply) => projectController.removeProjectMember(request, reply));
}
