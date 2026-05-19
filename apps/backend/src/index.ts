import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { pool } from "./db/client";
import { redis } from "./redis/client";
import initSocket from "./socket/socket";
import { aiConfig } from "./config/ai.config";

// Module route imports
import authRoutes from "./modules/auth/auth.routes";
import workspaceRoutes from "./modules/workspace/workspace.routes";
import projectRoutes from "./modules/project/project.routes";
import taskRoutes from "./modules/task/task.routes";
import wikiRoutes from "./modules/wiki/wiki.routes";
import snippetRoutes from "./modules/snippet/snippet.routes";
import editorRoutes from "./modules/editor/editor.routes";
import aiRoutes from "./modules/ai/ai.routes";
import activityRoutes from "./modules/activity/activity.routes";
import paymentRoutes from "./modules/payment/payment.routes";

const server = Fastify({ logger: true });

async function bootstrap() {
  // Register plugins
  await server.register(cors, {
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  });

  await server.register(cookie, {
    secret: process.env.JWT_SECRET ?? "devcollab-cookie-secret",
  });

  // Register module routes
  server.register(authRoutes, { prefix: "/api/auth" });
  server.register(workspaceRoutes, { prefix: "/api/workspaces" });
  server.register(projectRoutes, { prefix: "/api/projects" });
  server.register(taskRoutes, { prefix: "/api/tasks" });
  server.register(wikiRoutes, { prefix: "/api/wiki" });
  server.register(snippetRoutes, { prefix: "/api/snippets" });
  server.register(editorRoutes, { prefix: "/api/editor" });
  server.register(aiRoutes, { prefix: "/api/ai" });
  server.register(activityRoutes, { prefix: "/api/activity" });
  server.register(paymentRoutes, { prefix: "/api/payments" });

  // Health check route
  server.get("/api/health", async (_request, reply) => {
    return reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Verify PostgreSQL connection
  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL connected successfully");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err);
  }

  // Verify Redis connection
  try {
    await redis.ping();
    console.log("✅ Redis connected successfully");
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
  }

  const port = Number(process.env.PORT ?? 3000);

  await server.listen({ port, host: "0.0.0.0" });
  console.log(`🚀 DevCollab backend running on port ${port}`);

  // Initialize Socket.IO server with Redis adapter
  // Must be called after server.listen() so fastify.server is bound to the port
  try {
    await initSocket(server.server);
    console.log("✅ Socket.IO initialized");
  } catch (err) {
    console.error("❌ Socket.IO initialization failed:", err);
  }

  // AI startup check
  if (!aiConfig.apiKey && !aiConfig.mockMode) {
    console.warn(
      "⚠️  GEMINI_API_KEY not set and AI_MOCK_MODE is false — AI features will fail"
    );
  } else if (aiConfig.mockMode) {
    console.log("🤖 AI running in MOCK mode — no API calls will be made");
  } else {
    console.log(`🤖 AI running in LIVE mode — using ${aiConfig.model}`);
  }
}

bootstrap().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
