import { FastifyRequest, FastifyReply } from 'fastify';

export async function getFileTree(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: return file tree for editor session
}

export async function getFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: return file content by path
}

export async function saveFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: persist file content
}

export async function createFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: create new file or directory
}

export async function deleteFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: delete file or directory
}
