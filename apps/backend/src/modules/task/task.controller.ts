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
import { notificationService } from '../notification/notification.service';
import { emitToUser, emitToProject } from '../../socket/socket';

const taskService = new TaskService();

export class TaskController {
  async createTask(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createTaskSchema.parse(request.body);
      const task = await taskService.createTask(data, request.user!.userId);

      // Emit real-time task creation
      emitToProject(task.projectId, 'task:created', task);

      // Trigger assignment notification
      if (task.assigneeId) {
        const notif = await notificationService.createNotification({
          userId: task.assigneeId,
          type: 'assignment',
          message: `${request.user!.name || request.user!.email} assigned you: ${task.title}`,
          metadata: { taskId: task.id }
        });
        if (notif) {
          emitToUser(task.assigneeId, 'notification:new', notif);
        }
      }

      return reply.status(201).send(task);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getTasksByProject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = taskProjectParamSchema.parse(request.params);
      const filters = getTasksQuerySchema.parse(request.query);
      const tasks = await taskService.getTasksByProject(projectId, filters);
      return reply.send(tasks);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getTaskById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      const task = await taskService.getTaskById(id);

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

      // Get the old task to check if status/assignee has changed
      const oldTask = await taskService.getTaskById(id);
      if (!oldTask) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      const task = await taskService.updateTask(id, data);

      // Emit real-time socket events
      if (data.status && data.status !== oldTask.status) {
        emitToProject(task.projectId, 'task:moved', {
          taskId: task.id,
          status: task.status,
          position: 0
        });
      } else {
        emitToProject(task.projectId, 'task:updated', task);
      }

      // Trigger assignment/reassignment notification
      const oldAssigneeId = oldTask.assigneeId;
      const newAssigneeId = task.assigneeId;
      if (newAssigneeId !== oldAssigneeId) {
        if (newAssigneeId) {
          const notif = await notificationService.createNotification({
            userId: newAssigneeId,
            type: 'assignment',
            message: `${request.user!.name || request.user!.email} assigned you: ${task.title}`,
            metadata: { taskId: task.id }
          });
          if (notif) {
            emitToUser(newAssigneeId, 'notification:new', notif);
          }
        }
        if (oldAssigneeId) {
          const notif = await notificationService.createNotification({
            userId: oldAssigneeId,
            type: 'assignment',
            message: `${request.user!.name || request.user!.email} unassigned you from: ${task.title}`,
            metadata: { taskId: task.id }
          });
          if (notif) {
            emitToUser(oldAssigneeId, 'notification:new', notif);
          }
        }
      }

      return reply.send(task);
    } catch (error: any) {
      const statusCode = error.message === 'Task not found' ? 404 : 400;
      return reply.status(statusCode).send({ error: error.message });
    }
  }

  async deleteTask(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      const oldTask = await taskService.getTaskById(id);
      if (!oldTask) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      await taskService.deleteTask(id);

      // Emit real-time delete
      emitToProject(oldTask.projectId, 'task:deleted', { taskId: id });

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

      // Get task to retrieve project_id for project-scoped broadcast
      const task = await taskService.getTaskById(id);
      if (task) {
        emitToProject(task.projectId, 'comment:new', {
          taskId: id,
          comment
        });
      }

      return reply.status(201).send(comment);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getComments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      const comments = await taskService.getTaskComments(id);
      return reply.send(comments);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}
