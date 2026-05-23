import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fs from "fs";
import { pool } from "./db/client";
import { redis, isRedisAvailable } from "./redis/client";
import initSocket from "./socket/socket";
import { aiConfig } from "./config/ai.config";
import { prisma, pool } from "./db/prisma";

// Module route imports
import authRoutes from "./modules/auth/auth.routes";
import workspaceRoutes from "./modules/workspace/workspace.routes";
import activityRoutes from "./modules/activity/activity.routes";
import notificationRoutes from "./modules/notification/notification.routes";
import billingRoutes from "./modules/billing/billing.routes";
// import projectRoutes from "./modules/project/project.routes";
// import taskRoutes from "./modules/task/task.routes";
// import wikiRoutes from "./modules/wiki/wiki.routes";
// import snippetRoutes from "./modules/snippet/snippet.routes";
// import editorRoutes from "./modules/editor/editor.routes";
// import aiRoutes from "./modules/ai/ai.routes";
// import activityRoutes from "./modules/activity/activity.routes";
// import paymentRoutes from "./modules/payment/payment.routes";

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

  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  const uploadsDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  await server.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
  });

  // Register module routes
  server.register(authRoutes, { prefix: "/api/auth" });
  server.register(workspaceRoutes, { prefix: "/api/workspaces" });
  server.register(activityRoutes, { prefix: "/api/activities" });
  server.register(notificationRoutes, { prefix: "/api/notifications" });
  server.register(billingRoutes, { prefix: "/api/billing" });
  // server.register(projectRoutes, { prefix: "/api/projects" });
  // server.register(taskRoutes, { prefix: "/api/tasks" });
  // server.register(wikiRoutes, { prefix: "/api/wiki" });
  // server.register(snippetRoutes, { prefix: "/api/snippets" });
  // server.register(editorRoutes, { prefix: "/api/editor" });
  // server.register(aiRoutes, { prefix: "/api/ai" });
  // server.register(activityRoutes, { prefix: "/api/activity" });
  // server.register(paymentRoutes, { prefix: "/api/payments" });

  // Health check route
  server.get("/api/health", async (_request, reply) => {
    return reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Verify PostgreSQL connection via Prisma
  try {
    // Automatically seed the default test project used by the frontend development server
    const projectCheck = await pool.query("SELECT id FROM projects WHERE id = $1 LIMIT 1", ["project-test-456"]);
    if (projectCheck.rowCount === 0) {
      await pool.query(
        `INSERT INTO projects (id, name, description, workspace_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        ["project-test-456", "Test Project", "Automatically created development test project", "workspace-test-123"]
      );
      console.log("🌱 Automatically seeded test project 'project-test-456' for local development.");
    }
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ PostgreSQL connected successfully via Prisma");
  } catch (err) {
    console.log("⚠️  PostgreSQL connection failed, but proceeding for local dev (SQLite mode):", err);
  }

  // Verify Redis connection (optional - graceful degradation)
  if (redis) {
    try {
      await redis.connect();
      await redis.ping();
      console.log("✅ Redis connected successfully");
    } catch (err) {
      // Redis connection failed - this is OK in development
      // The warning was already logged by the Redis client
      // Backend will continue running without realtime features
    }
  }

  const port = Number(process.env.PORT ?? 3000);

  await server.listen({ port, host: "0.0.0.0" });

  const redisStatus = isRedisAvailable()
    ? "✅ with realtime features"
    : "⚠️  without realtime features (Redis unavailable)";
  console.log(
    `\n🚀 DevCollab backend running on port ${port} ${redisStatus}\n`
  );

  // Initialize Socket.IO server with Redis adapter
  // Must be called after server.listen() so fastify.server is bound to the port
  try {
    await initSocket(server.server);
    console.log("✅ Socket.IO initialized");
  } catch (err) {
    console.error("❌ Socket.IO initialization failed:", err);
  }

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


 
 
