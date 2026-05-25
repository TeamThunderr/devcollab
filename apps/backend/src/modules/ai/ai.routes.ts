/**
 * apps/backend/src/modules/ai/ai.routes.ts
 *
 * AI API endpoints — all streamed via Server-Sent Events except /breakdown.
 * Every route is protected by the authenticate middleware.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
import { verifyProjectAccess } from "../../middleware/rbac.middleware";
import { query } from "../../db/client";
import * as aiService from "./ai.service";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const reviewCodeSchema = z.object({
  code: z.string().min(1).max(50_000),
  language: z.enum([
    "javascript",
    "typescript",
    "python",
    "java",
    "cpp",
    "go",
  ]),
});

const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

const breakdownSchema = z.object({
  featureDescription: z.string().min(10).max(1_000),
  projectId: z.string(),
});

// ─── Data fetchers (pending implementation) ──────────────────────────────────

// ─── Route registration ───────────────────────────────────────────────────────

export default async function aiRoutes(
  fastify: FastifyInstance
): Promise<void> {
  // ── POST /api/ai/review-code ────────────────────────────────────────────────
  fastify.post(
    "/review-code",
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = reviewCodeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      const { code, language } = parseResult.data;
      await aiService.reviewCode(reply, code, language);
      // SSE has taken over the response — do not return or call reply.send()
    }
  );

  // ── POST /api/ai/summarise-project ─────────────────────────────────────────
  fastify.post(
    "/summarise-project",
    { preHandler: [authenticate, verifyProjectAccess] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = projectIdSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      const tasksResult = await query(
        `SELECT t.title, t.status, u.name as assignee_name, t.priority, t.updated_at
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_id
         WHERE t.project_id = $1`,
        [parseResult.data.projectId]
      );
      const realTasks = tasksResult.rows.map(row => ({
        title: row.title,
        status: row.status,
        assigneeName: row.assignee_name,
        priority: row.priority,
        updatedAt: row.updated_at.toISOString(),
      }));

      await aiService.summariseProject(reply, realTasks);
    }
  );

  // ── POST /api/ai/standup ────────────────────────────────────────────────────
  fastify.post(
    "/standup",
    { preHandler: [authenticate, verifyProjectAccess] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = projectIdSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      const activityResult = await query(
        `SELECT u.name as user_name, a.action, t.title as task_title, a.created_at
         FROM activity_feed a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN tasks t ON t.id = a.entity_id AND a.entity_type = 'TASK'
         WHERE a.project_id = $1 AND a.created_at > NOW() - INTERVAL '24 hours'`,
        [parseResult.data.projectId]
      );
      const realActivity = activityResult.rows.map(row => ({
        userName: row.user_name,
        action: row.action,
        taskTitle: row.task_title || 'Item',
        timestamp: row.created_at.toISOString(),
      }));

      await aiService.generateStandup(reply, realActivity);
    }
  );

  // ── POST /api/ai/breakdown ──────────────────────────────────────────────────
  fastify.post(
    "/breakdown",
    { preHandler: [authenticate, verifyProjectAccess] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = breakdownSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      const { featureDescription } = parseResult.data;
      const tasks = await aiService.breakdownTask(featureDescription);

      return reply.send({ success: true, data: { tasks } });
    }
  );
}
