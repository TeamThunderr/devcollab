import { FastifyReply, FastifyRequest } from 'fastify';
import { TaskService } from './task.service';
import {
  createCommentSchema,
  createTaskSchema,
  getTasksQuerySchema,
  taskIdParamSchema,
  taskProjectParamSchema,
  updateTaskSchema,
} from './task.schema';

const taskService = new TaskService();

export class TaskController {
  async createTask(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createTaskSchema.parse(request.body);
      const task = await taskService.createTask(data, request.user!.userId);
      return reply.status(201).send(task);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getTasksByProject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = taskProjectParamSchema.parse(request.params);
      const filters = getTasksQuerySchema.parse(request.query);
      const tasks = await taskService.getTasksByProject(projectId, request.user!.userId, filters);
      return reply.send(tasks);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getTaskById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      const task = await taskService.getTaskById(id, request.user!.userId);

      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      return reply.send(task);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateTask(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      const data = updateTaskSchema.parse(request.body);
      const task = await taskService.updateTask(id, data, request.user!.userId);
      return reply.send(task);
    } catch (error: any) {
      const statusCode = error.message === 'Task not found' ? 404 : 400;
      return reply.status(statusCode).send({ error: error.message });
    }
  }

  async deleteTask(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      await taskService.deleteTask(id, request.user!.userId);
      return reply.status(204).send();
    } catch (error: any) {
      const statusCode = error.message === 'Task not found' ? 404 : 400;
      return reply.status(statusCode).send({ error: error.message });
    }
  }

  async addComment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      const data = createCommentSchema.parse(request.body);
      const comment = await taskService.addComment(id, data.content, request.user!.userId);
      return reply.status(201).send(comment);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getComments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      const comments = await taskService.getTaskComments(id, request.user!.userId);
      return reply.send(comments);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}
