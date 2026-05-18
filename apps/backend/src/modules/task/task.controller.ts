import { FastifyRequest, FastifyReply } from 'fastify';

export async function createTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: create task in project
}

export async function listTasks(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list tasks with filters
}

export async function getTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: get task by id
}

export async function updateTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: update task fields
}

export async function deleteTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: delete task
}

export async function assignTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: assign task to member
}

export async function moveTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: move task to different column/status
}
