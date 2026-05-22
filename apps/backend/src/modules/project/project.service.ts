import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { CreateProjectInput, UpdateProjectInput } from './project.schema';

const projectInclude = {
  _count: {
    select: {
      tasks: true,
      snippets: true,
    },
  },
} satisfies Prisma.ProjectInclude;

function mapProject(project: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>) {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? undefined,
    workspaceId: project.workspaceId,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    _count: project._count,
  };
}

export class ProjectService {
  async createProject(data: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        workspaceId: data.workspaceId,
      },
      include: projectInclude,
    });

    return mapProject(project);
  }

  async getProjects(workspaceId: string) {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });

    return projects.map(mapProject);
  }

  async getProjectById(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });

    return project ? mapProject(project) : null;
  }

  async updateProject(projectId: string, data: UpdateProjectInput) {
    try {
      const project = await prisma.project.update({
        where: { id: projectId },
        data,
        include: projectInclude,
      });

      return mapProject(project);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Project not found');
      }

      throw error;
    }
  }

  async deleteProject(projectId: string) {
    try {
      await prisma.project.delete({
        where: { id: projectId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Project not found');
      }

      throw error;
    }
  }
}
