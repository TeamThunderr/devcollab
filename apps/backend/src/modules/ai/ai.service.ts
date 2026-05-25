/**
 * apps/backend/src/modules/ai/ai.service.ts
 *
 * All AI feature logic: streaming SSE helpers, code review,
 * project summary, standup generation, and task breakdown.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { FastifyReply } from "fastify";
import { aiConfig } from "../../config/ai.config";


// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectTask {
  title: string;
  status: string;
  assigneeName: string | null;
  priority: string;
  updatedAt: string;
}

export interface ActivityItem {
  userName: string;
  action: string;
  taskTitle: string;
  timestamp: string;
}

export interface BreakdownTask {
  title: string;
  description: string;
  priority: "p0" | "p1" | "p2";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Shared Gemini client — created once per process */
const geminiClient = new GoogleGenerativeAI(aiConfig.apiKey);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Apply SSE headers to a reply so we can write raw chunks. */
function setSseHeaders(reply: FastifyReply): void {
  void reply.hijack(); // Tell Fastify we're taking over the response

  // reply.hijack() bypasses @fastify/cors, so we must set CORS headers manually
  const origin = process.env.FRONTEND_URL ?? "http://localhost:5173";
  reply.raw.setHeader("Access-Control-Allow-Origin", origin);
  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");

  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("Transfer-Encoding", "chunked");
  // Disable proxy buffering (nginx / reverse proxies) to ensure chunks flush immediately
  reply.raw.setHeader("X-Accel-Buffering", "no");
}

/** Write a single SSE data frame. */
function writeChunk(reply: FastifyReply, payload: Record<string, string>): void {
  reply.raw.write("data: " + JSON.stringify(payload) + "\n\n");
}

// ─── SSE streaming helpers ────────────────────────────────────────────────────



/**
 * Streams a real Gemini response using generateContentStream.
 * Falls back to aiConfig.fallbackModel on a 429 rate-limit error.
 */
export async function streamGeminiResponse(
  reply: FastifyReply,
  prompt: string,
  systemPrompt: string
): Promise<void> {
  setSseHeaders(reply);

  // Absorb EPIPE / ERR_STREAM_WRITE_AFTER_END so they never become
  // unhandled rejections that crash the process.
  reply.raw.on("error", () => { /* socket already closed — ignore */ });

  /** Returns true = handled (success or non-retryable error), false = retry with fallback */
  const tryStream = async (modelName: string): Promise<boolean> => {
    try {
      const model = geminiClient.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: aiConfig.generationConfig.temperature,
          maxOutputTokens: aiConfig.generationConfig.maxOutputTokens,
        },
      });

      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        if (reply.raw.destroyed) break; // client disconnected
        const text = chunk.text();
        if (text) writeChunk(reply, { text });
      }

      return true; // success
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // 429 / quota — signal caller to retry with fallback model
      if (message.includes("429") || message.toLowerCase().includes("quota")) {
        return false;
      }
      // Any other error (invalid model, network, parse failure etc.)
      // Surface it to the client stream so the UI can display it.
      if (!reply.raw.destroyed) {
        writeChunk(reply, { error: message });
      }
      return true; // handled — do not retry
    }
  };

  const succeeded = await tryStream(aiConfig.model);

  if (!succeeded) {
    // Primary model hit rate limit — try fallback
    await tryStream(aiConfig.fallbackModel);
  }

  try {
    if (!reply.raw.destroyed) {
      reply.raw.write("data: [DONE]\n\n");
      reply.raw.end();
    }
  } catch {
    // Stream already closed — nothing to do
  }
}

// ─── AI Services ──────────────────────────────────────────────────────────────

/**
 * Service 1 — Code Review
 * Streams a structured code review with a SCORE:X header line.
 */
export async function reviewCode(
  reply: FastifyReply,
  code: string,
  language: string
): Promise<void> {


  const systemPrompt =
    `You are a senior code reviewer. Review the following ${language} code. ` +
    "Check for: bugs, performance issues, security vulnerabilities, readability problems. " +
    "Start your response with exactly 'SCORE:X' on the first line where X is 1-10. " +
    "Then provide detailed feedback with specific line references where possible. " +
    "Use markdown formatting with headers and code blocks.";

  const userPrompt = `Review this ${language} code:\n\n${code}`;

  await streamGeminiResponse(reply, userPrompt, systemPrompt);
}

/**
 * Service 2 — Project Summary
 * Streams a project health summary with blockers and velocity analysis.
 */
export async function summariseProject(
  reply: FastifyReply,
  tasks: ProjectTask[]
): Promise<void> {


  const systemPrompt =
    "You are a project manager assistant for a software development team. " +
    "Analyze the task data and provide a concise project health summary. " +
    "Identify blockers (tasks in same status for too long), team velocity, " +
    "and what is at risk. Use markdown with emojis for visual clarity.";

  const taskLines = tasks
    .map(
      (t) =>
        `- [${t.status}] ${t.title}` +
        ` (Priority: ${t.priority}, Assignee: ${t.assigneeName ?? "Unassigned"})`
    )
    .join("\n");

  const userPrompt = `Here are the current project tasks:\n\n${taskLines}`;

  await streamGeminiResponse(reply, userPrompt, systemPrompt);
}

/**
 * Service 3 — Daily Standup
 * Streams a standup report grouped by team member.
 */
export async function generateStandup(
  reply: FastifyReply,
  activityItems: ActivityItem[]
): Promise<void> {


  const systemPrompt =
    "You are a scrum master assistant. Generate a concise daily standup report " +
    "from the team's activity in the last 24 hours. Group by team member. " +
    "For each member show: what they completed, what they are working on, " +
    "any blockers if detectable. Keep it brief and actionable. " +
    "Use markdown formatting.";

  const activityLines = activityItems
    .map(
      (a) =>
        `${a.userName}: ${a.action} '${a.taskTitle}' at ` +
        new Date(a.timestamp).toLocaleTimeString()
    )
    .join("\n");

  const userPrompt = `Generate standup from this activity:\n\n${activityLines}`;

  await streamGeminiResponse(reply, userPrompt, systemPrompt);
}

/**
 * Service 4 — Task Breakdown
 * Returns a JSON array of subtasks — does NOT stream.
 */
export async function breakdownTask(
  featureDescription: string
): Promise<BreakdownTask[]> {


  const systemPrompt =
    "You are a senior software engineer. Break down the given feature into " +
    "specific, actionable development subtasks. Return ONLY a valid JSON array, " +
    "no markdown, no explanation, just the raw JSON array. " +
    "Each object must have: title (string), description (string), priority (p0/p1/p2). " +
    "Maximum 8 tasks. Order by logical implementation sequence.";

  const userPrompt = `Break down this feature into subtasks: ${featureDescription}`;

  try {
    const model = geminiClient.getGenerativeModel({
      model: aiConfig.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: aiConfig.generationConfig.temperature,
        maxOutputTokens: aiConfig.generationConfig.maxOutputTokens,
      },
    });

    const result = await model.generateContent(userPrompt);
    let raw = result.response.text();

    // Strip markdown code fences if the model wrapped the JSON in them
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    return JSON.parse(raw) as BreakdownTask[];
  } catch (err) {
    // Parse failure or API error
    throw err;
  }
}

/**
 * Service 5 — Wiki Summary
 * Returns a markdown string — does NOT stream.
 */
export async function summarizePage(
  content: string
): Promise<string> {
  const systemPrompt = "You are an expert technical writer. Summarize the following wiki documentation page. Provide a concise, highly readable summary highlighting the main points, purpose, and key takeaways. Use semantic HTML formatting (e.g., <ul>, <li>, <p>, <strong>) instead of Markdown. Do not wrap your response in markdown code blocks (like ```html), return ONLY the raw HTML string.";
  const userPrompt = `Summarize this page:\n\n${content}`;

  const tryGenerate = async (modelName: string): Promise<string> => {
    const model = geminiClient.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: aiConfig.generationConfig.temperature,
        maxOutputTokens: aiConfig.generationConfig.maxOutputTokens,
      },
    });

    const result = await model.generateContent(userPrompt);
    return result.response.text();
  };

  try {
    return await tryGenerate(aiConfig.model);
  } catch (err: any) {
    if (err?.message?.includes("API key not valid") || err?.status === 400) {
      return "⚠️ **AI Summary Unavailable**: Your Gemini API Key is missing or invalid. Please update `GEMINI_API_KEY` in your `.env` file to enable AI features.";
    }
    
    // If rate limited or 503 Service Unavailable, try fallback model
    if (err?.status === 429 || err?.status === 503 || err?.message?.includes("503") || err?.message?.includes("quota")) {
      try {
        return await tryGenerate(aiConfig.fallbackModel);
      } catch (fallbackErr: any) {
        return "⚠️ **AI Summary Unavailable**: The AI service is currently experiencing high demand. Please try again later.";
      }
    }
    
    return "⚠️ **AI Summary Unavailable**: An unexpected error occurred while communicating with the AI service. Please try again later.";
  }
}

