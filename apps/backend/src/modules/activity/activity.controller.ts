import { FastifyRequest, FastifyReply } from 'fastify';
import { activityService } from './activity.service';
import { getActivityFeedSchema } from './activity.schema';

export const activityController = {
  async getWorkspaceActivity(request: FastifyRequest<{ Params: { workspaceId: string }, Querystring: any }>, reply: FastifyReply) {
    try {
      const filters = getActivityFeedSchema.parse(request.query);
      const { workspaceId } = request.params;
      
      const feed = await activityService.getActivities(
        workspaceId, request.user!.userId,
        filters,
        request.user!.userId,
        request.membership?.role
      );
      return reply.send(feed);
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async getProjectActivity(
    request: FastifyRequest<{
      Params: { projectId: string };
      Querystring: { page?: string; limit?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { projectId } = request.params;
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));

      const feed = await activityService.getProjectActivities(
        projectId,
        request.user!.userId,
        { page, limit }
      );
      return reply.send(feed);
    } catch (error: any) {
      if (error.message?.startsWith('Forbidden')) return reply.status(403).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
};
