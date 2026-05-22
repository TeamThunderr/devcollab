import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { CreateSnippetInput, UpdateSnippetInput } from './snippet.schema';

function mapSnippet(snippet: Prisma.SnippetGetPayload<Record<string, never>>) {
  return {
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    code: snippet.code,
    description: snippet.description ?? undefined,
    tags: snippet.tags || [],
    projectId: snippet.projectId,
    createdAt: snippet.createdAt.toISOString(),
    updatedAt: snippet.updatedAt.toISOString(),
  };
}

export class SnippetService {
  async createSnippet(data: CreateSnippetInput) {
    const snippet = await prisma.snippet.create({
      data: {
        title: data.title,
        language: data.language,
        code: data.code,
        description: data.description,
        tags: data.tags || [],
        project: {
          connect: {
            id: data.projectId,
          },
        },
      },
    });

    return mapSnippet(snippet);
  }

  async getSnippetsByProject(projectId: string) {
    const snippets = await prisma.snippet.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return snippets.map(mapSnippet);
  }

  async getSnippetById(snippetId: string) {
    const snippet = await prisma.snippet.findUnique({
      where: { id: snippetId },
    });

    return snippet ? mapSnippet(snippet) : null;
  }

  async updateSnippet(snippetId: string, data: UpdateSnippetInput) {
    try {
      const snippet = await prisma.snippet.update({
        where: { id: snippetId },
        data: {
          title: data.title,
          language: data.language,
          code: data.code,
          description: data.description,
          tags: data.tags !== undefined ? data.tags : undefined,
        },
      });

      return mapSnippet(snippet);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Snippet not found');
      }

      throw error;
    }
  }

  async deleteSnippet(snippetId: string) {
    try {
      await prisma.snippet.delete({
        where: { id: snippetId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Snippet not found');
      }

      throw error;
    }
  }

  async searchSnippets(projectId: string, query: string) {
    const normalizedQuery = query.trim();

    const snippets = await prisma.snippet.findMany({
      where: {
        projectId,
        OR: [
          {
            title: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              has: normalizedQuery,
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return snippets.map(mapSnippet);
  }
}
