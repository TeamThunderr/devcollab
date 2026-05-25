import { FastifyReply, FastifyRequest } from 'fastify';
import { ProjectService } from './project.service';
import {
  createProjectSchema,
  getProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
} from './project.schema';

const projectService = new ProjectService();

export class ProjectController {
  async createProject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createProjectSchema.parse(request.body);
      const project = await projectService.createProject(data, request.user!.userId);
      return reply.status(201).send(project);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getProjects(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = getProjectsQuerySchema.parse(request.query);
      const projects = await projectService.getProjects(
        query.workspaceId,
        request.user!.userId,
        request.membership?.role
      );
      return reply.send(projects);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getProjectById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = projectIdParamSchema.parse(request.params);
      const project = await projectService.getProjectById(id);

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      return reply.send(project);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateProject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = projectIdParamSchema.parse(request.params);
      const data = updateProjectSchema.parse(request.body);
      const project = await projectService.updateProject(id, data);
      return reply.send(project);
    } catch (error: any) {
      const statusCode = error.message === 'Project not found' ? 404 : 400;
      return reply.status(statusCode).send({ error: error.message });
    }
  }

  async deleteProject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = projectIdParamSchema.parse(request.params);
      await projectService.deleteProject(id);
      return reply.status(204).send();
    } catch (error: any) {
      const statusCode = error.message === 'Project not found' ? 404 : 400;
      return reply.status(statusCode).send({ error: error.message });
    }
  }

  async getProjectMembers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = projectIdParamSchema.parse(request.params);
      const members = await projectService.listProjectMembers(id);
      return reply.send(members);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async assignProjectMember(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = projectIdParamSchema.parse(request.params);
      const { userId, role } = request.body as { userId: string; role: string };
      const member = await projectService.assignProjectMember(id, userId, role);
      return reply.status(201).send(member);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async removeProjectMember(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, userId } = request.params as { id: string; userId: string };
      await projectService.removeProjectMember(id, userId);
      return reply.status(200).send({ message: 'Project member removed successfully' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}
