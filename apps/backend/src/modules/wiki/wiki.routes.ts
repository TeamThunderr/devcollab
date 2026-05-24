import { FastifyInstance } from 'fastify';
import * as wikiController from './wiki.controller';
import { verifyAuth } from '../../middleware/auth.middleware';

export default async function register(fastify: FastifyInstance): Promise<void> {
  // Public route to allow <img src="..."> to load without Authorization headers
  fastify.get('/images/:id', wikiController.getImageHandler);

  // Authenticated routes
  fastify.register(async (secureFastify) => {
    secureFastify.addHook('preHandler', verifyAuth);
    
    secureFastify.get('/projects/:projectId/pages', wikiController.getPagesHandler);
    secureFastify.post('/projects/:projectId/pages', wikiController.createPageHandler);
    
    secureFastify.get('/pages/:id', wikiController.getPageHandler);
    secureFastify.put('/pages/:id', wikiController.updatePageHandler);
    secureFastify.delete('/pages/:id', wikiController.deletePageHandler);

    secureFastify.get('/pages/:id/versions', wikiController.getVersionsHandler);
    secureFastify.post('/pages/:id/versions', wikiController.createVersionHandler);
    secureFastify.post('/pages/:id/restore/:versionId', wikiController.restoreVersionHandler);

    secureFastify.post('/upload-image', wikiController.uploadImageHandler);
  });
}
