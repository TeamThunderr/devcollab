import { prisma } from '../../db/prisma';
import { AppError } from '../../utils/errors';
import { CreateWorkspaceInput, InviteMemberInput, AcceptInviteInput, UpdateRoleInput } from './workspace.schema';
import crypto from 'crypto';
import { Role, InviteStatus } from '@prisma/client';

export const workspaceService = {
  async createWorkspace(userId: string, data: CreateWorkspaceInput) {
    const ownedWorkspacesCount = await prisma.workspace.count({
      where: { createdBy: userId }
    });

    if (ownedWorkspacesCount >= 1) {
      throw new AppError(403, 'Free plan limit reached: You can only create 1 workspace.');
    }

    const existingSlug = await prisma.workspace.findUnique({ where: { slug: data.slug } });
    if (existingSlug) {
      throw new AppError(400, 'Workspace slug is already taken');
    }

    return await prisma.$transaction(async (tx: any) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.name,
          slug: data.slug,
          createdBy: userId,
          subscription: {
             create: { plan: 'FREE' }
          }
        }
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: userId,
          role: Role.OWNER
        }
      });

      return workspace;
    });
  },

  async getUserWorkspaces(userId: string) {
    return await prisma.workspace.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        members: { where: { userId }, select: { role: true } }
      }
    });
  },

  async getWorkspaceDetails(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true }
    });
    if (!workspace) throw new AppError(404, 'Workspace not found');
    return workspace;
  },

  async inviteMember(workspaceId: string, data: InviteMemberInput) {
    const membersCount = await prisma.workspaceMember.count({ where: { workspaceId } });
    const pendingInvites = await prisma.invite.count({ where: { workspaceId, status: InviteStatus.PENDING } });
    
    if (membersCount + pendingInvites >= 5) {
      throw new AppError(403, 'Free plan limit reached: Maximum 5 members allowed per workspace.');
    }

    const existingMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email: data.email } }
    });
    if (existingMember) {
      throw new AppError(400, 'User is already a member of this workspace');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        workspaceId,
        email: data.email,
        token,
        role: data.role,
        expiresAt
      }
    });

    console.log(`[Email Mock] Sent invite to ${data.email}. Token: ${token}`);

    return invite;
  },

  async acceptInvite(userId: string, userEmail: string, data: AcceptInviteInput) {
    const invite = await prisma.invite.findUnique({ where: { token: data.token } });

    if (!invite) throw new AppError(404, 'Invite not found');
    if (invite.status !== InviteStatus.PENDING) throw new AppError(400, 'Invite has already been processed or expired');
    if (invite.expiresAt < new Date()) {
      await prisma.invite.update({ where: { id: invite.id }, data: { status: InviteStatus.EXPIRED }});
      throw new AppError(400, 'Invite has expired');
    }
    if (invite.email !== userEmail) throw new AppError(403, 'This invite was sent to a different email address');

    return await prisma.$transaction(async (tx: any) => {
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED }
      });

      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role
        }
      });

      return membership;
    });
  },

  async listMembers(workspaceId: string) {
    return await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, email: true, avatar: true, bio: true } }
      }
    });
  },

  async updateMemberRole(workspaceId: string, targetUserId: string, newRole: Role, currentMembership: any) {
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });
    if (!targetMembership) throw new AppError(404, 'Member not found');

    if (currentMembership.role !== Role.OWNER && targetMembership.role === Role.OWNER) {
      throw new AppError(403, 'Only owners can modify owner roles');
    }

    if (currentMembership.role !== Role.OWNER && newRole === Role.OWNER) {
       throw new AppError(403, 'Only owners can grant owner role');
    }

    return await prisma.workspaceMember.update({
      where: { id: targetMembership.id },
      data: { role: newRole }
    });
  },

  async removeMember(workspaceId: string, targetUserId: string, currentMembership: any) {
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });
    if (!targetMembership) throw new AppError(404, 'Member not found');

    if (targetMembership.role === Role.OWNER && currentMembership.role !== Role.OWNER) {
      throw new AppError(403, 'Only owners can remove an owner');
    }
    
    if (targetMembership.role === Role.OWNER) {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: Role.OWNER }
      });
      if (ownerCount <= 1) {
        throw new AppError(400, 'Cannot remove the last owner of the workspace');
      }
    }

    await prisma.workspaceMember.delete({
      where: { id: targetMembership.id }
    });
  }
};
