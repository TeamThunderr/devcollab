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

// ─── Mock fixture data ────────────────────────────────────────────────────────
// Temporary — teammate's task/activity API endpoints will replace these.

const mockTasks: aiService.ProjectTask[] = [
  {
    title: "Setup Redis",
    status: "done",
    assigneeName: "Arjun",
    priority: "p0",
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Build Socket.IO",
    status: "inprogress",
    assigneeName: "Arjun",
    priority: "p0",
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Kanban UI",
    status: "inprogress",
    assigneeName: "Riya",
    priority: "p1",
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Auth API",
    status: "inreview",
    assigneeName: "Dev",
    priority: "p0",
    updatedAt: new Date().toISOString(),
  },
  {
    title: "Monaco Editor",
    status: "todo",
    assigneeName: "Sneha",
    priority: "p1",
    updatedAt: new Date().toISOString(),
  },
];

const mockActivity: aiService.ActivityItem[] = [
  {
    userName: "Arjun",
    action: "moved to done",
    taskTitle: "Setup Redis",
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    userName: "Riya",
    action: "moved to inprogress",
    taskTitle: "Kanban UI",
    timestamp: new Date(Date.now() - 7_200_000).toISOString(),
  },
  {
    userName: "Dev",
    action: "moved to inreview",
    taskTitle: "Auth API",
    timestamp: new Date(Date.now() - 1_800_000).toISOString(),
  },
  {
    userName: "Sneha",
    action: "created",
    taskTitle: "Monaco Editor",
    timestamp: new Date(Date.now() - 900_000).toISOString(),
  },
];

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

      // TODO: replace mockTasks with a real DB query using parseResult.data.projectId
      await aiService.summariseProject(reply, mockTasks);
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

      // TODO: replace mockActivity with a real activity query for parseResult.data.projectId
      await aiService.generateStandup(reply, mockActivity);
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
