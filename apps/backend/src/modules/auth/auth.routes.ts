import { FastifyPluginAsync } from 'fastify';
import oauthPlugin from '@fastify/oauth2';
import { authController } from './auth.controller';
import { verifyAuth } from '../../middleware/auth.middleware';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  if (process.env.GOOGLE_CLIENT_ID) {
    fastify.register(oauthPlugin, {
      name: 'googleOAuth2',
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET || ''
        },
        auth: oauthPlugin.GOOGLE_CONFIGURATION
      },
      startRedirectPath: '/google/login',
      callbackUri: `${process.env.BACKEND_URL || 'https://devcollab-backend-15q8.onrender.com'}/api/auth/google/callback`,
      scope: ['profile', 'email']
    });
    fastify.get('/google/callback', authController.googleCallback);
  }

  if (process.env.GITHUB_CLIENT_ID) {
    fastify.register(oauthPlugin, {
      name: 'githubOAuth2',
      credentials: {
        client: {
          id: process.env.GITHUB_CLIENT_ID,
          secret: process.env.GITHUB_CLIENT_SECRET || ''
        },
        auth: oauthPlugin.GITHUB_CONFIGURATION
      },
      startRedirectPath: '/github/login',
      callbackUri: `${process.env.BACKEND_URL || 'https://devcollab-backend-15q8.onrender.com'}/api/auth/github/callback`,
      scope: ['user:email']
    });
    fastify.get('/github/callback', authController.githubCallback);
  }

  fastify.post('/register', authController.register);
  fastify.post('/login', authController.login);
  fastify.post('/logout', authController.logout);
  fastify.post('/refresh', authController.refresh);
  
  fastify.post('/forgot-password', authController.forgotPassword);
  fastify.post('/reset-password', authController.resetPassword);
  
  fastify.get('/verify-email', authController.verifyEmail);
  fastify.post('/resend-verification', authController.resendVerification);

  fastify.get('/me', { preHandler: [verifyAuth] }, authController.getMe);
  fastify.patch('/me', { preHandler: [verifyAuth] }, authController.updateMe);
};

export default authRoutes;
