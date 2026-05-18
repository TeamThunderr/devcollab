import { FastifyRequest, FastifyReply } from 'fastify';

export async function register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: create user account
}

export async function login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: validate credentials, issue JWT
}

export async function logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: invalidate refresh token
}

export async function refreshToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: rotate refresh token, issue new access token
}

export async function getMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: return authenticated user profile
}
