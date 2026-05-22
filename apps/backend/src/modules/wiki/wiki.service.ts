import { prisma } from '../../db/prisma';

export class WikiService {
  async getPages(projectId: string) {
    return prisma.wikiPage.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPage(id: string) {
    return prisma.wikiPage.findUnique({
      where: { id },
    });
  }

  async createPage(data: { workspaceId: string; projectId: string; title: string; content?: string; createdBy: string }) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 8);
    return prisma.wikiPage.create({
      data: {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        slug,
        content: data.content || '',
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });
  }

  async updatePage(id: string, data: { title?: string; content?: string; updatedBy: string }) {
    let slug;
    if (data.title) {
      slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 8);
    }
    
    return prisma.wikiPage.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(slug && { slug }),
        ...(data.content !== undefined && { content: data.content }),
        updatedBy: data.updatedBy,
      },
    });
  }

  async deletePage(id: string) {
    return prisma.wikiPage.delete({
      where: { id },
    });
  }

  // Versions
  async getVersions(pageId: string) {
    return prisma.wikiVersion.findMany({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVersion(pageId: string, createdBy: string) {
    const page = await prisma.wikiPage.findUnique({ where: { id: pageId } });
    if (!page) throw new Error("Page not found");

    const previousVersionsCount = await prisma.wikiVersion.count({ where: { pageId } });

    return prisma.wikiVersion.create({
      data: {
        pageId,
        contentSnapshot: page.content,
        versionNumber: previousVersionsCount + 1,
        createdBy,
      },
    });
  }

  async restoreVersion(pageId: string, versionId: string, updatedBy: string) {
    const version = await prisma.wikiVersion.findUnique({ where: { id: versionId } });
    if (!version || version.pageId !== pageId) throw new Error("Version not found");

    // Restore content to main page
    return prisma.wikiPage.update({
      where: { id: pageId },
      data: {
        content: version.contentSnapshot,
        updatedBy,
      },
    });
  }
}
