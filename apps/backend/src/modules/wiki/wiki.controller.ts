import { FastifyRequest, FastifyReply } from 'fastify';
import { WikiService } from './wiki.service';

const wikiService = new WikiService();

export async function getPagesHandler(
  request: FastifyRequest<{ Params: { projectId: string } }>,
  reply: FastifyReply
) {
  try {
    const { projectId } = request.params;
    const pages = await wikiService.getPages(projectId);
    return reply.send(pages);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function getPageHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const page = await wikiService.getPage(id);
    if (!page) {
      return reply.status(404).send({ message: 'Page not found' });
    }
    return reply.send(page);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function createPageHandler(
  request: FastifyRequest<{
    Params: { projectId: string };
    Body: { workspaceId: string; title: string; content?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { projectId } = request.params;
    const userId = (request as any).user?.id || 'unknown';
    const data = { ...request.body, projectId, createdBy: userId };
    const newPage = await wikiService.createPage(data);
    return reply.status(201).send(newPage);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function updatePageHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { title?: string; content?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const userId = (request as any).user?.id || 'unknown';
    const updatedPage = await wikiService.updatePage(id, { ...request.body, updatedBy: userId });
    return reply.send(updatedPage);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function deletePageHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    await wikiService.deletePage(id);
    return reply.status(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

// Versions

export async function getVersionsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const versions = await wikiService.getVersions(id);
    return reply.send(versions);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function createVersionHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const userId = (request as any).user?.id || 'unknown';
    const version = await wikiService.createVersion(id, userId);
    return reply.status(201).send(version);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

export async function restoreVersionHandler(
  request: FastifyRequest<{ Params: { id: string; versionId: string } }>,
  reply: FastifyReply
) {
  try {
    const { id, versionId } = request.params;
    const userId = (request as any).user?.id || 'unknown';
    const restoredPage = await wikiService.restoreVersion(id, versionId, userId);
    return reply.send(restoredPage);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import util from 'util';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);

export async function uploadImageHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await (req as any).file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const ext = path.extname(data.filename) || '.png';
    const filename = `${crypto.randomUUID()}${ext}`;
    const uploadPath = path.join(__dirname, '../../../uploads', filename);

    await pump(data.file, fs.createWriteStream(uploadPath));

    const imageUrl = `/uploads/${filename}`;
    reply.send({ url: imageUrl });
  } catch (err: any) {
    req.log.error(err);
    reply.status(500).send({ error: 'Image upload failed' });
  }
}
