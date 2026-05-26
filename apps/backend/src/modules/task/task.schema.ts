import { z } from 'zod';

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
export const taskPriorityEnum = z.enum(['P0', 'P1', 'P2']);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  status: taskStatusEnum.default('TODO'),
  priority: taskPriorityEnum.default('P1'),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
});

export const taskIdParamSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

export const taskProjectParamSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export const getTasksQuerySchema = z.object({
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
