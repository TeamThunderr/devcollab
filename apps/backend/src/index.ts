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

const fastify = Fastify({ logger: true });

async function bootstrap() {
  await fastify.register(cors, {
    origin: [process.env.FRONTEND_URL ?? 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET ?? 'devcollab-cookie-secret',
  });

  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
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

  fastify.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
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
