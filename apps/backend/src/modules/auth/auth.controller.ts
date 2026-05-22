import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';
import { AppError } from '../../utils/errors';

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      const user = await authService.register(data);
      return reply.status(201).send({ message: 'User registered successfully', user });
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
        sameSite: 'strict',
        path: '/api/auth',
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
    reply.clearCookie('refreshToken', { path: '/api/auth' });
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
        sameSite: 'strict',
        path: '/api/auth',
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
  }
};
