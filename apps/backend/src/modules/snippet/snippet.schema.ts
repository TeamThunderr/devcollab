import { z } from 'zod';

export const createSnippetSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  language: z.string().min(1, 'Language is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  projectId: z.string().min(1, 'Project ID is required'),
});

export const updateSnippetSchema = z.object({
  title: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const snippetIdParamSchema = z.object({
  id: z.string().min(1, 'Snippet ID is required'),
});

export const snippetProjectParamSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export const searchSnippetsQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
});

export type CreateSnippetInput = z.infer<typeof createSnippetSchema>;
export type UpdateSnippetInput = z.infer<typeof updateSnippetSchema>;
