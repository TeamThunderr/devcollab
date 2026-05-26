import { z } from 'zod';

export const getActivityFeedSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type GetActivityFeedQuery = z.infer<typeof getActivityFeedSchema>;
