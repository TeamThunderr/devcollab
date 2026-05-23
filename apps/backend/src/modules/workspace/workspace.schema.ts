import { z } from 'zod';
import { Role } from '../../middleware/rbac.middleware';

export const createWorkspaceSchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens only'),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).optional().default(Role.MEMBER),
});

export const acceptInviteSchema = z.object({
  token: z.string(),
});

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
