import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { CreateTaskInput, UpdateTaskInput } from './task.schema';

const taskInclude = {
  comments: {
    orderBy: {
      createdAt: 'desc',
    },
  },
} satisfies Prisma.TaskInclude;

function mapComment(comment: Prisma.CommentGetPayload<Record<string, never>>) {
  return {
    id: comment.id,
    content: comment.content,
    taskId: comment.taskId,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

function mapTask(task: Prisma.TaskGetPayload<{ include: typeof taskInclude }>) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString(),
    projectId: task.projectId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    comments: task.comments.map(mapComment),
  };
}

function toTaskUpdateData(data: UpdateTaskInput): Prisma.TaskUpdateInput {
  return {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.status !== undefined ? { status: data.status as TaskStatus } : {}),
    ...(data.priority !== undefined ? { priority: data.priority as TaskPriority } : {}),
    ...(data.dueDate !== undefined
      ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
      : {}),
  };
}

export class TaskService {
  async createTask(data: CreateTaskInput) {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        ...(data.status !== undefined ? { status: data.status as TaskStatus } : {}),
        ...(data.priority !== undefined ? { priority: data.priority as TaskPriority } : {}),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        project: {
          connect: {
            id: data.projectId,
          },
        },
      },
      include: taskInclude,
    });

    return mapTask(task);
  }

  async getTasksByProject(
    projectId: string,
    filters?: { status?: string; priority?: string }
  ) {
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        ...(filters?.status ? { status: filters.status as Prisma.EnumTaskStatusFilter | TaskStatus } : {}),
        ...(filters?.priority ? { priority: filters.priority as Prisma.EnumTaskPriorityFilter | TaskPriority } : {}),
      },
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    });

    return (tasks as any[]).map(mapTask);
  }

  async getTaskById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: taskInclude,
    });

    return task ? mapTask(task) : null;
  }

  async updateTask(taskId: string, data: UpdateTaskInput) {
    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: toTaskUpdateData(data),
        include: taskInclude,
      });

      return mapTask(task);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Task not found');
      }

      throw error;
    }
  }

  async deleteTask(taskId: string) {
    try {
      await prisma.task.delete({
        where: { id: taskId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Task not found');
      }

      throw error;
    }
  }

  async addComment(taskId: string, content: string) {
    const comment = await prisma.comment.create({
      data: {
        content,
        task: {
          connect: {
            id: taskId,
          },
        },
      },
    });

    return mapComment(comment);
  }

  async getTaskComments(taskId: string) {
    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map(mapComment);
  }
}
