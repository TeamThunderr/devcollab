/**
 * apps/backend/src/modules/ai/ai.routes.ts
 *
 * AI API endpoints — all streamed via Server-Sent Events except /breakdown.
 * Every route is protected by the authenticate middleware.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
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
  projectId: z.string().uuid("projectId must be a valid UUID"),
});

const breakdownSchema = z.object({
  featureDescription: z.string().min(10).max(1_000),
  projectId: z.string().uuid("projectId must be a valid UUID"),
});

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
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = projectIdSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      const { projectId } = parseResult.data;

      // Fetch real tasks with assignee names from DB
      const result = await query(
        `SELECT
           t.title,
           t.status,
           t.priority,
           t.due_date,
           t.updated_at,
           assignee.name AS assignee_name
         FROM tasks t
         LEFT JOIN users assignee ON assignee.id = t.assignee_id
         WHERE t.project_id = $1
         ORDER BY t.updated_at DESC
         LIMIT 60`,
        [projectId]
      );

      const realTasks: aiService.ProjectTask[] = result.rows.map((row) => ({
        title: row.title,
        status: row.status,
        priority: row.priority,
        assigneeName: row.assignee_name ?? null,
        updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      }));

      await aiService.summariseProject(reply, realTasks);
    }
  );

  // ── POST /api/ai/standup ────────────────────────────────────────────────────
  fastify.post(
    "/standup",
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = projectIdSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      const { projectId } = parseResult.data;

      // Fetch last 24 hours of project activity with user names from DB
      const result = await query(
        `SELECT
           af.action,
           af.entity_type,
           af.metadata,
           af.created_at,
           u.name AS user_name
         FROM activity_feed af
         JOIN users u ON u.id = af.user_id
         WHERE af.project_id = $1
           AND af.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY af.created_at DESC
         LIMIT 50`,
        [projectId]
      );

      const realActivity: aiService.ActivityItem[] = result.rows.map((row) => {
        // Extract the task title from metadata if available
        const taskTitle =
          row.metadata?.taskTitle ??
          row.metadata?.title ??
          row.entity_type ??
          "unknown";
        return {
          userName: row.user_name,
          action: row.action,
          taskTitle: String(taskTitle),
          timestamp: row.created_at?.toISOString?.() ?? row.created_at,
        };
      });

      await aiService.generateStandup(reply, realActivity);
    }
  );

  // ── POST /api/ai/breakdown ──────────────────────────────────────────────────
  fastify.post(
    "/breakdown",
    { preHandler: authenticate },
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
