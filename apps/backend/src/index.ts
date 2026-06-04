import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { validateEnv } from './config/env';
validateEnv();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';

import initSocket from './socket/socket';
import { aiConfig } from './config/ai.config';
import { pool } from './db/client';
import { initDatabase } from './db/init';
import { sendTestEmail } from './utils/mail';

import authRoutes from './modules/auth/auth.routes';
import workspaceRoutes from './modules/workspace/workspace.routes';
import projectRoutes from './modules/project/project.routes';
import taskRoutes from './modules/task/task.routes';
import snippetRoutes from './modules/snippet/snippet.routes';
import wikiRoutes from './modules/wiki/wiki.routes';
import editorRoutes from './modules/editor/editor.routes';
import aiRoutes from './modules/ai/ai.routes';
import activityRoutes from './modules/activity/activity.routes';
import notificationRoutes from './modules/notification/notification.routes';
import paymentRoutes from './modules/payment/payment.routes';
import billingRoutes from './modules/billing/billing.routes';
import waitlistRoutes from './modules/waitlist/waitlist.routes';
import chatRoutes from './modules/chat/chat.routes';

export const fastify = Fastify({ logger: true });

async function bootstrap() {
  // ── CORS ───────────────────────────────────────────────────────────────────
  // In production FRONTEND_URL is the only allowed origin.
  // In development we also allow the two Vite dev-server ports.
  const isProd = process.env.NODE_ENV === 'production';
  const rawOrigins = (process.env.FRONTEND_URL || 'https://devcollab-gamma.vercel.app')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, '')); // Strip trailing slashes

  const allowedOrigins = [
    ...rawOrigins,
    ...(!isProd ? ['http://localhost:5173', 'http://localhost:5174'] : []),
  ].filter(Boolean);

  await fastify.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET ?? 'devcollab-cookie-secret',
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  fastify.register(authRoutes, { prefix: '/api/auth' });
  fastify.register(workspaceRoutes, { prefix: '/api/workspaces' });
  fastify.register(projectRoutes, { prefix: '/api/projects' });
  fastify.register(taskRoutes, { prefix: '/api/tasks' });
  fastify.register(snippetRoutes, { prefix: '/api/snippets' });
  fastify.register(wikiRoutes, { prefix: '/api/wiki' });
  fastify.register(editorRoutes, { prefix: '/api/editor' });
  fastify.register(aiRoutes, { prefix: '/api/ai' });
  fastify.register(activityRoutes, { prefix: '/api/activity' });
  fastify.register(notificationRoutes, { prefix: '/api/notifications' });
  fastify.register(paymentRoutes, { prefix: '/api/payments' });
  fastify.register(billingRoutes, { prefix: '/api/billing' });
  fastify.register(waitlistRoutes, { prefix: '/api/waitlist' });
  fastify.register(chatRoutes, { prefix: '/api/chat' });

  fastify.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  fastify.get('/api/test-email', async (request, reply) => {
    try {
      // Send to the SMTP_USER itself, or can accept ?to= parameter
      const targetEmail = (request.query as any).to || process.env.SMTP_USER;
      await sendTestEmail(targetEmail);
      return reply.send({ status: 'success', message: 'Test email sent to ' + targetEmail });
    } catch (error: any) {
      return reply.status(500).send({ status: 'error', error: error.message });
    }
  });

  await initDatabase();
  await pool.query('SELECT 1');
  console.log('✅ PostgreSQL connected successfully');

  const port = Number(process.env.PORT ?? 3000);
  await fastify.listen({ port, host: '0.0.0.0' });

  console.log(`\n🚀 DevCollab backend running on port ${port}\n`);

  try {
    await initSocket(fastify.server);
    console.log('✅ Socket.IO initialized');
  } catch (err) {
    console.error('❌ Socket.IO initialization failed:', err);
  }

  if (!aiConfig.apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set — AI features will fail');
  } else {
    console.log(`🤖 AI running in LIVE mode — using ${aiConfig.model}`);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// Railway (and Docker) send SIGTERM before forcefully killing the process.
// We listen for it, close Fastify cleanly (finishes in-flight requests),
// then exit. This prevents dropped connections during deployments.
async function shutdown(signal: string) {
  console.log(`\n⚠️  Received ${signal} — shutting down gracefully…`);
  try {
    await fastify.close();
    console.log('✅ Server closed cleanly');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
