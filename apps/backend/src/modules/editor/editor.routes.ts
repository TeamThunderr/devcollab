import { FastifyInstance } from 'fastify';
import * as editorController from './editor.controller';
import { verifyAuth } from '../../middleware/auth.middleware';

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', verifyAuth);
  fastify.get('/projects/:projectId/files', editorController.getFileTreeHandler);
  fastify.post('/projects/:projectId/files', editorController.createFileHandler);
  
  fastify.get('/projects/:projectId/files/:fileId', editorController.getFileContentHandler);
  fastify.put('/projects/:projectId/files/:fileId', editorController.updateFileHandler);
  fastify.delete('/projects/:projectId/files/:fileId', editorController.deleteFileHandler);

  fastify.get('/projects/:projectId/editor-state', editorController.getEditorStateHandler);
  fastify.put('/projects/:projectId/editor-state', editorController.updateEditorStateHandler);
  fastify.post('/projects/:projectId/execute', editorController.executeCodeHandler);
  fastify.post('/projects/:projectId/terminal', editorController.runTerminalCommandHandler);
}
