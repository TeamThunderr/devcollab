import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  skills: z.array(z.string()).max(10).optional().nullable(),
  githubLink: z.string().url().optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
