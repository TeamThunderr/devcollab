/**
 * apps/backend/src/modules/ai/ai.routes.ts
 *
 * AI API endpoints:
 *   POST /api/ai/review-code        — SSE code review
 *   POST /api/ai/summarise-project  — SSE project health summary (with due_date/updated_at)
 *   POST /api/ai/standup            — SSE standup from activity_feed (improved metadata)
 *   POST /api/ai/breakdown          — JSON task breakdown
 *   POST /api/ai/wiki-plan          — SSE wiki → week plan + auto-create tasks
 *   POST /api/ai/explain-snippet    — SSE snippet explanation
 *
 * All routes are protected by the authenticate middleware.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authenticate } from "../../middleware/authenticate";
import { verifyProjectAccess } from "../../middleware/rbac.middleware";
import { query } from "../../db/client";
import { emitToProject } from "../../socket/socket";
import { aiConfig } from "../../config/ai.config";
import * as aiService from "./ai.service";

// ─── Local types ──────────────────────────────────────────────────────────────

interface WikiTask {
  title?: unknown;
  description?: unknown;
  priority?: unknown;
  week?: unknown;
}

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

const explainSnippetSchema = z.object({
  code: z.string().min(1).max(20_000),
  language: z.string(),
  title: z.string().optional(),
});

// ─── HTML stripper helper ─────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

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

      const { projectId } = parseResult.data;

      // Fetch real tasks with assignee names, due_date and updated_at from DB
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

      const now = new Date();

      // Build enriched task lines including overdue/stale signals for Gemini
      const taskLines = result.rows
        .map((row) => {
          const overdueFlag =
            row.due_date && new Date(row.due_date) < now && row.status !== "DONE"
              ? " ⚠️ OVERDUE"
              : "";

          const daysSinceUpdate = row.updated_at
            ? Math.floor(
                (now.getTime() - new Date(row.updated_at).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;

          const staleFlag =
            daysSinceUpdate > 2 &&
            (row.status === "IN_PROGRESS" || row.status === "IN_REVIEW")
              ? ` (stuck for ${daysSinceUpdate} days)`
              : "";

          const dueStr = row.due_date
            ? ` due ${new Date(row.due_date).toLocaleDateString()}`
            : "";

          return (
            `- [${String(row.status).toUpperCase()}] ${row.title}${overdueFlag}${staleFlag}` +
            ` (Priority: ${row.priority}, Assignee: ${row.assignee_name ?? "Unassigned"}${dueStr})`
          );
        })
        .join("\n");

      const systemPrompt =
        "You are a project manager assistant for a software development team. " +
        "Analyze the task data and provide a concise project health summary. " +
        "Specifically identify:\n" +
        "1. BLOCKERS: tasks marked as stuck (in same status for too long)\n" +
        "2. OVERDUE: tasks past their due date\n" +
        "3. VELOCITY: how fast is the team moving\n" +
        "4. AT RISK: what might delay the project\n" +
        "Use markdown with emojis. Be direct and actionable.";

      const userPrompt = `Here are the current project tasks:\n\n${taskLines}`;

      await aiService.streamGeminiResponse(reply, userPrompt, systemPrompt);
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

      // Build enriched activity lines with robust metadata extraction
      const activityLines = result.rows
        .map((row) => {
          const meta: Record<string, unknown> =
            (row.metadata as Record<string, unknown>) ?? {};

          const taskTitle = String(
            meta.taskTitle ??
            meta.title ??
            meta.name ??
            meta.task_title ??
            (row.entity_type === "task" ? "a task" : row.entity_type) ??
            "unknown item"
          );

          const time = new Date(row.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return `${row.user_name}: ${row.action} "${taskTitle}" at ${time}`;
        })
        .join("\n");

      const systemPrompt =
        "You are a scrum master assistant. Generate a concise daily standup report " +
        "from the team's activity in the last 24 hours. Group by team member. " +
        "For each member show: what they completed, what they are working on, " +
        "any blockers if detectable. Keep it brief and actionable. " +
        "Use markdown formatting.";

      const userPrompt = `Generate standup from this activity:\n\n${activityLines}`;

      await aiService.streamGeminiResponse(reply, userPrompt, systemPrompt);
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

  // ── POST /api/ai/wiki-plan ──────────────────────────────────────────────────
  // Reads all wiki pages for the project, streams a week-by-week delivery plan,
  // then auto-creates tasks in the DB and emits them via Socket.IO.
  fastify.post(
    "/wiki-plan",
    { preHandler: [authenticate, verifyProjectAccess] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = projectIdSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      const { projectId } = parseResult.data;
      const userId = (request as any).user?.userId as string;

      // Fetch all non-deleted wiki pages for this project
      const wikiResult = await query(
        `SELECT title, content
         FROM wiki_pages
         WHERE project_id = $1
         ORDER BY created_at ASC`,
        [projectId]
      );

      if (wikiResult.rows.length === 0) {
        return reply.status(400).send({
          success: false,
          error:
            "No wiki pages found. Write your project requirements in the Wiki first.",
        });
      }

      // Build wiki context — strip HTML from rich-text content
      const wikiContext = wikiResult.rows
        .map((p) => `## ${p.title}\n${stripHtml(String(p.content ?? ""))}`)
        .join("\n\n---\n\n");

      const systemPrompt =
        "You are a senior engineering manager and project planner. " +
        "Based on the project requirements documentation provided, generate:\n\n" +
        "1. A WEEK-BY-WEEK DELIVERY PLAN (use ## Week 1, ## Week 2 etc)\n" +
        "   - Each week: what will be built, who should own it (by role not name)\n" +
        "   - Realistic timeline based on complexity\n\n" +
        "2. A TASK LIST in this EXACT format at the end:\n" +
        "TASKS_JSON_START\n" +
        '[\n  { "title": "task title", "description": "specific description", "priority": "P0", "week": 1 }\n]\n' +
        "TASKS_JSON_END\n\n" +
        "Rules:\n" +
        "- Maximum 12 tasks total\n" +
        "- Priority MUST be uppercase P0, P1, or P2\n" +
        "- Week number must be 1, 2, 3, or 4\n" +
        "- Tasks must be specific dev tasks (not vague like 'research')\n" +
        "- Order tasks by implementation sequence\n\n" +
        "First write the week plan in markdown, then output the JSON block.";

      const userPrompt = `Here are the project requirements from the wiki:\n\n${wikiContext}`;

      // Set up SSE
      void reply.hijack();
      const origin = process.env.FRONTEND_URL ?? "http://localhost:5173";
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("Transfer-Encoding", "chunked");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.on("error", () => { /* socket already closed */ });

      const geminiClient = new GoogleGenerativeAI(aiConfig.apiKey);

      const models = [aiConfig.model, aiConfig.fallbackModel];
      let succeeded = false;

      for (const modelName of models) {
        if (succeeded) break;
        try {
          const model = geminiClient.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          });

          const result = await model.generateContentStream(userPrompt);
          const fullTextChunks: string[] = [];

          for await (const chunk of result.stream) {
            if (reply.raw.destroyed) break;
            const text = chunk.text();
            if (text) {
              fullTextChunks.push(text);
              // Only stream the plan text portion — stop streaming at JSON block
              const accumulated = fullTextChunks.join("");
              if (!accumulated.includes("TASKS_JSON_START")) {
                reply.raw.write(
                  "data: " + JSON.stringify({ text }) + "\n\n"
                );
              }
            }
          }

          succeeded = true;

          // After full stream, extract the task JSON block and create tasks
          const fullContent = fullTextChunks.join("");
          const jsonMatch = fullContent.match(
            /TASKS_JSON_START\s*([\s\S]*?)\s*TASKS_JSON_END/
          );

          if (jsonMatch) {
            try {
              const tasksData = JSON.parse(jsonMatch[1]) as WikiTask[];
              const createdTasks: unknown[] = [];

              for (const taskData of tasksData.slice(0, 12)) {
                const insertResult = await query(
                  `INSERT INTO tasks
                     (project_id, title, description, priority, status, position, created_by)
                   VALUES (
                     $1, $2, $3, $4, 'TODO',
                     (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE project_id = $1),
                     $5
                   )
                   RETURNING *`,
                  [
                    projectId,
                    String(taskData.title ?? "Untitled task"),
                    String(taskData.description ?? ""),
                    String(taskData.priority ?? "P1").toUpperCase(),
                    userId,
                  ]
                );

                const task = insertResult.rows[0] as Record<string, unknown>;
                createdTasks.push(task);

                // Emit real-time to all project members
                emitToProject(projectId, "task:created", task);
              }

              reply.raw.write(
                "data: " +
                  JSON.stringify({
                    type: "tasks_created",
                    count: createdTasks.length,
                    tasks: createdTasks,
                  }) +
                  "\n\n"
              );
            } catch (parseErr) {
              console.error("[AI] wiki-plan: failed to parse/create tasks:", parseErr);
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          const is429 =
            message.includes("429") || message.toLowerCase().includes("quota");
          if (is429) {
            console.warn(`[AI] wiki-plan: rate-limited on ${modelName}`);
            continue;
          }
          if (!reply.raw.destroyed) {
            reply.raw.write(
              "data: " + JSON.stringify({ error: message }) + "\n\n"
            );
          }
          succeeded = true; // don't retry on non-rate-limit errors
        }
      }

      try {
        if (!reply.raw.destroyed) {
          reply.raw.write("data: [DONE]\n\n");
          reply.raw.end();
        }
      } catch { /* stream already closed */ }
    }
  );

  // ── POST /api/ai/explain-snippet ────────────────────────────────────────────
  fastify.post(
    "/explain-snippet",
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = explainSnippetSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ success: false, error: parseResult.error.flatten() });
      }

      const { code, language, title } = parseResult.data;

      const systemPrompt =
        "You are a senior developer and teacher. Explain the following code snippet clearly.\n" +
        "Cover:\n" +
        "1. **WHAT IT DOES**: Plain English summary (2-3 sentences)\n" +
        "2. **HOW IT WORKS**: Step by step walkthrough of the logic\n" +
        "3. **KEY CONCEPTS**: Any patterns, algorithms, or techniques used\n" +
        "4. **USE CASES**: When would you use this code?\n" +
        "5. **POTENTIAL IMPROVEMENTS**: Any suggestions (be constructive)\n\n" +
        "Use markdown formatting. Be clear enough for a junior developer to understand.";

      const titlePart = title ? ` titled '${title}'` : "";
      const userPrompt = `Explain this ${language} snippet${titlePart}:\n\n${code}`;

      await aiService.streamGeminiResponse(reply, userPrompt, systemPrompt);
    }
  );
}
