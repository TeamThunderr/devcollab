import { FastifyInstance } from 'fastify';
import * as editorController from './editor.controller';

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.get('/projects/:projectId/files', editorController.getFileTreeHandler);
  fastify.post('/projects/:projectId/files', editorController.createFileHandler);
  
  fastify.get('/projects/:projectId/files/:fileId', editorController.getFileContentHandler);
  fastify.put('/projects/:projectId/files/:fileId', editorController.updateFileHandler);
  fastify.delete('/projects/:projectId/files/:fileId', editorController.deleteFileHandler);
}
