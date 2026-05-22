import { z } from 'zod';

export const getNotificationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  isRead: z.enum(['true', 'false']).optional(),
  type: z.string().optional()
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsSchema>;
