import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPayload;
  }
}

export const verifyAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Unauthorized: No token provided');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError(500, 'JWT secret is not configured');
    }

    const decoded = jwt.verify(token, secret) as AuthPayload;
    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }
};
