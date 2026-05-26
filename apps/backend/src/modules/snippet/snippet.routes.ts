import { FastifyInstance } from 'fastify';
import { SnippetController } from './snippet.controller';
import { verifyAuth } from '../../middleware/auth.middleware';
import { verifyProjectAccess } from '../../middleware/rbac.middleware';

const snippetController = new SnippetController();

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', verifyAuth);
  fastify.addHook('preHandler', verifyProjectAccess);
  fastify.post('/', (request, reply) => snippetController.createSnippet(request, reply));
  fastify.get('/project/:projectId', (request, reply) =>
    snippetController.getSnippetsByProject(request, reply),
  );
  fastify.get('/project/:projectId/search', (request, reply) =>
    snippetController.searchSnippets(request, reply),
  );
  fastify.get('/:id', (request, reply) => snippetController.getSnippetById(request, reply));
  fastify.patch('/:id', (request, reply) => snippetController.updateSnippet(request, reply));
  fastify.delete('/:id', (request, reply) => snippetController.deleteSnippet(request, reply));
}
