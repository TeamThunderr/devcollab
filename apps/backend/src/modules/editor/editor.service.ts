import { prisma } from '../../db/prisma';

export class EditorService {
  async getFileTree(projectId: string) {
    const files = await prisma.projectFile.findMany({
      where: { projectId },
      select: { id: true, name: true, parentId: true, type: true, language: true, content: true, taskId: true }
    });
    return files;
  }

  async getFile(projectId: string, fileId: string) {
    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId }
    });
    return file;
  }

  async createFile(data: { projectId: string; name: string; type?: string; parentId?: string; content?: string; language?: string; createdBy?: string; taskId?: string }) {
    return await prisma.projectFile.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        type: data.type || 'file',
        parentId: data.parentId || null,
        content: data.content || '',
        language: data.language || 'plaintext',
        createdBy: data.createdBy,
        taskId: data.taskId
      }
    });
  }

  async updateFile(projectId: string, fileId: string, data: { name?: string; content?: string; language?: string; taskId?: string | null }) {
    return await prisma.projectFile.update({
      where: { id: fileId, projectId },
      data
    });
  }

  async deleteFile(projectId: string, fileId: string) {
    // Delete file and any children if it is a directory
    await prisma.projectFile.deleteMany({
      where: { parentId: fileId, projectId }
    });
    
    return await prisma.projectFile.delete({
      where: { id: fileId, projectId }
    });
  }
}
