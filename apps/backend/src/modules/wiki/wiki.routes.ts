import { FastifyInstance } from 'fastify';
import * as wikiController from './wiki.controller';
import { verifyAuth } from '../../middleware/auth.middleware';

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', verifyAuth);
  fastify.get('/projects/:projectId/pages', wikiController.getPagesHandler);
  fastify.post('/projects/:projectId/pages', wikiController.createPageHandler);
  
  fastify.get('/pages/:id', wikiController.getPageHandler);
  fastify.put('/pages/:id', wikiController.updatePageHandler);
  fastify.delete('/pages/:id', wikiController.deletePageHandler);

  fastify.get('/pages/:id/versions', wikiController.getVersionsHandler);
  fastify.post('/pages/:id/versions', wikiController.createVersionHandler);
  fastify.post('/pages/:id/restore/:versionId', wikiController.restoreVersionHandler);

  fastify.post('/upload-image', wikiController.uploadImageHandler);
}
