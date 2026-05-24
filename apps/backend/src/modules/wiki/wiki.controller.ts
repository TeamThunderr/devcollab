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
    const userId = request.user!.userId;
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
    const userId = request.user!.userId;
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
    const userId = request.user!.userId;
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
    const userId = request.user!.userId;
    const restoredPage = await wikiService.restoreVersion(id, versionId, userId);
    return reply.send(restoredPage);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}

import { pool } from '../../db/client';

export async function uploadImageHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await (req as any).file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const filename = data.filename;
    const contentType = data.mimetype;

    const result = await pool.query(
      'INSERT INTO uploaded_images (filename, content_type, data) VALUES ($1, $2, $3) RETURNING id',
      [filename, contentType, buffer]
    );

    const imageId = result.rows[0].id;
    const imageUrl = `/api/wiki/images/${imageId}`;
    
    reply.send({ url: imageUrl });
  } catch (err: any) {
    req.log.error(err);
    reply.status(500).send({ error: 'Image upload failed' });
  }
}

export async function getImageHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await pool.query('SELECT content_type, data FROM uploaded_images WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return reply.status(404).send({ message: 'Image not found' });
    }
    
    const { content_type, data } = result.rows[0];
    
    reply.header('Content-Type', content_type);
    reply.header('Cache-Control', 'public, max-age=31536000');
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal server error' });
  }
}
