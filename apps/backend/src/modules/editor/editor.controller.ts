import { FastifyRequest, FastifyReply } from 'fastify';
import { EditorService } from './editor.service';
import { z } from 'zod';

const editorService = new EditorService();

export async function getFileTreeHandler(
  request: FastifyRequest<{ Params: { projectId: string } }>,
  reply: FastifyReply
) {
  try {
    const { projectId } = request.params;
    const tree = await editorService.getFileTree(projectId);
    return reply.send(tree);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function createFileHandler(
  request: FastifyRequest<{
    Params: { projectId: string };
    Body: { name: string; type?: string; parentId?: string; content?: string; language?: string; taskId?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { projectId } = request.params;
    const userId = (request as any).user?.id || 'unknown';
    const data = { ...request.body, projectId, createdBy: userId };
    const newFile = await editorService.createFile(data);
    return reply.status(201).send(newFile);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function getFileContentHandler(
  request: FastifyRequest<{ Params: { projectId: string; fileId: string } }>,
  reply: FastifyReply
) {
  try {
    const { projectId, fileId } = request.params;
    const file = await editorService.getFile(projectId, fileId);
    if (!file) {
      return reply.status(404).send({ message: 'File not found' });
    }
    return reply.send(file);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function updateFileHandler(
  request: FastifyRequest<{
    Params: { projectId: string; fileId: string };
    Body: { name?: string; content?: string; language?: string; taskId?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { projectId, fileId } = request.params;
    const updatedFile = await editorService.updateFile(projectId, fileId, request.body);
    if (!updatedFile) {
      return reply.status(404).send({ message: 'File not found' });
    }
    return reply.send(updatedFile);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function deleteFileHandler(
  request: FastifyRequest<{ Params: { projectId: string; fileId: string } }>,
  reply: FastifyReply
) {
  try {
    const { projectId, fileId } = request.params;
    await editorService.deleteFile(projectId, fileId);
    return reply.status(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}
