import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      name: string;
    };

    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }
}
