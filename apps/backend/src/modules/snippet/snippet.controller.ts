import { FastifyReply, FastifyRequest } from 'fastify';
import { SnippetService } from './snippet.service';
import {
  createSnippetSchema,
  searchSnippetsQuerySchema,
  snippetIdParamSchema,
  snippetProjectParamSchema,
  updateSnippetSchema,
} from './snippet.schema';

const snippetService = new SnippetService();

export class SnippetController {
  async createSnippet(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createSnippetSchema.parse(request.body);
      const snippet = await snippetService.createSnippet(data, request.user!.userId);
      return reply.status(201).send(snippet);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getSnippetsByProject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = snippetProjectParamSchema.parse(request.params);
      const snippets = await snippetService.getSnippetsByProject(projectId);
      return reply.send(snippets);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getSnippetById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = snippetIdParamSchema.parse(request.params);
      const snippet = await snippetService.getSnippetById(id);

      if (!snippet) {
        return reply.status(404).send({ error: 'Snippet not found' });
      }

      return reply.send(snippet);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateSnippet(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = snippetIdParamSchema.parse(request.params);
      const data = updateSnippetSchema.parse(request.body);
      const snippet = await snippetService.updateSnippet(id, request.user!.userId, data);
      return reply.send(snippet);
    } catch (error: any) {
      let statusCode = 400;
      if (error.message === 'Snippet not found') statusCode = 404;
      else if (error.message.includes('Unauthorized')) statusCode = 403;
      return reply.status(statusCode).send({ error: error.message });
    }
  }

  async deleteSnippet(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = snippetIdParamSchema.parse(request.params);
      await snippetService.deleteSnippet(id, request.user!.userId);
      return reply.status(204).send();
    } catch (error: any) {
      let statusCode = 400;
      if (error.message === 'Snippet not found') statusCode = 404;
      else if (error.message.includes('Unauthorized')) statusCode = 403;
      return reply.status(statusCode).send({ error: error.message });
    }
  }

  async searchSnippets(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = snippetProjectParamSchema.parse(request.params);
      const { q } = searchSnippetsQuerySchema.parse(request.query);
      const snippets = await snippetService.searchSnippets(projectId, q);
      return reply.send(snippets);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}
