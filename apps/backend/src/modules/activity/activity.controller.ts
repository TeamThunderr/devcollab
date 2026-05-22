import { FastifyRequest, FastifyReply } from 'fastify';
import { activityService } from './activity.service';
import { getActivityFeedSchema } from './activity.schema';

export const activityController = {
  async getWorkspaceActivity(request: FastifyRequest<{ Params: { workspaceId: string }, Querystring: any }>, reply: FastifyReply) {
    try {
      const filters = getActivityFeedSchema.parse(request.query);
      const { workspaceId } = request.params;
      
      const feed = await activityService.getActivities(workspaceId, filters);
      return reply.send(feed);
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
};
