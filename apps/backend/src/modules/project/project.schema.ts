import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').optional(),
  description: z.string().optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
});

export const getProjectsQuerySchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
});

export const assignMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.string().optional(),
});

export const projectMemberParamSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  userId: z.string().min(1, 'User ID is required'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AssignMemberInput = z.infer<typeof assignMemberSchema>;
