import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service';
import { registerSchema, loginSchema, updateUserSchema } from './auth.schema';
import { AppError } from '../../utils/errors';

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      const { user } = await authService.register(data);
      return reply.status(201).send({ message: 'Verification email sent. Please check your inbox.', user });
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);
      const { user, accessToken, refreshToken } = await authService.login(data);

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      return reply.send({ user, accessToken });
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.send({ message: 'Logged out successfully' });
  },

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const oldRefreshToken = request.cookies.refreshToken;
      if (!oldRefreshToken) {
        throw new AppError(401, 'No refresh token provided');
      }

      const { accessToken, refreshToken } = await authService.refresh(oldRefreshToken);

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });

      return reply.send({ accessToken });
    } catch (error: any) {
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  },

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = await authService.getMe(request.user!.userId);
      return reply.send({ user });
    } catch (error: any) {
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async updateMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = updateUserSchema.parse(request.body);
      const user = await authService.updateMe(request.user!.userId, data);
      return reply.send({ user });
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async googleCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = await (request.server as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const profile = await response.json() as any;

      const { user, accessToken, refreshToken } = await authService.oauthLogin('google', {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture
      });

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });

      reply.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
    } catch (error) {
      console.error(error);
      reply.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }
  },

  async githubCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = await (request.server as any).githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const profile = await response.json() as any;

      let email = profile.email;
      if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        const emails = await emailsResponse.json() as any[];
        const primaryEmail = emails.find((e: any) => e.primary) || emails[0];
        email = primaryEmail?.email;
      }

      if (!email) {
        throw new AppError(400, 'Github email is required');
      }

      const { user, accessToken, refreshToken } = await authService.oauthLogin('github', {
        id: profile.id.toString(),
        email: email,
        name: profile.name || profile.login,
        avatarUrl: profile.avatar_url
      });

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });

      reply.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
    } catch (error) {
      console.error(error);
      reply.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }
  },

  async verifyEmail(request: FastifyRequest<{ Querystring: { token: string } }>, reply: FastifyReply) {
    try {
      const { token } = request.query;
      if (!token) {
        throw new AppError(400, 'Token is required');
      }
      await authService.verifyEmail(token);
      return reply.send({ message: 'Email verified successfully' });
    } catch (error: any) {
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async resendVerification(request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) {
    try {
      const { email } = request.body;
      if (!email) {
        throw new AppError(400, 'Email is required');
      }
      await authService.resendVerification(email);
      return reply.send({ message: 'Verification email sent successfully' });
    } catch (error: any) {
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
};
