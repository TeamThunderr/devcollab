/**
 * apps/backend/src/modules/ai/ai.routes.ts
 *
 * AI API endpoints — all streamed via Server-Sent Events except /breakdown.
 * Every route is protected by the authenticate middleware.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
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
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = projectIdSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      // TODO: replace with a real DB query using parseResult.data.projectId
      const realTasks: aiService.ProjectTask[] = []; // Placeholder
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

      // TODO: replace with a real activity query for parseResult.data.projectId
      const realActivity: aiService.ActivityItem[] = []; // Placeholder
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
