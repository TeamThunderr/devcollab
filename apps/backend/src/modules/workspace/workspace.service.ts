import crypto from 'crypto';
import { query, transaction } from '../../db/client';
import { AppError } from '../../utils/errors';
import { CreateWorkspaceInput, InviteMemberInput, AcceptInviteInput } from './workspace.schema';
import { Role, WorkspaceMembership } from '../../middleware/rbac.middleware';
import { activityService } from '../activity/activity.service';
import { notificationService } from '../notification/notification.service';

function toDbRole(role: Role): string {
  return role.toLowerCase();
}

function toApiRole(role: string): Role {
  return role.toUpperCase() as Role;
}

function mapWorkspace(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    plan: row.plan?.toUpperCase?.() ?? row.plan,
    members: row.member_role ? [{ role: toApiRole(row.member_role) }] : undefined,
  };
}

function mapMember(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: toApiRole(row.role),
    joinedAt: row.joined_at?.toISOString?.() ?? row.joined_at,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatar: row.avatar_url,
      bio: row.bio,
    },
  };
}

export const workspaceService = {
  async createWorkspace(userId: string, data: CreateWorkspaceInput) {
    const owned = await query<{ plan: string }>('SELECT plan FROM workspaces WHERE owner_id = $1', [userId]);
    const hasPro = owned.rows.some(workspace => workspace.plan === 'pro');
    if (!hasPro && (owned.rowCount ?? 0) >= 1) {
      throw new AppError(403, 'Free plan limit reached: You can only create 1 workspace. Upgrade an existing workspace to PRO to create more.');
    }

    const existingSlug = await query('SELECT id FROM workspaces WHERE slug = $1', [data.slug]);
    if (existingSlug.rowCount) {
      throw new AppError(400, 'Workspace slug is already taken');
    }

    const workspace = await transaction(async (client) => {
      const workspaceResult = await client.query(
        `INSERT INTO workspaces (name, slug, owner_id, plan)
         VALUES ($1, $2, $3, 'free')
         RETURNING id, name, slug, plan, created_at, updated_at`,
        [data.name, data.slug, userId]
      );
      const created = workspaceResult.rows[0];

      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [created.id, userId]
      );

      await client.query(
        `INSERT INTO plans (workspace_id, type)
         VALUES ($1, 'free')`,
        [created.id]
      );

      return created;
    });

    await activityService.createActivity({
      workspaceId: workspace.id,
      userId,
      action: 'WORKSPACE_CREATED',
      entityType: 'WORKSPACE',
      entityId: workspace.id,
    });

    return mapWorkspace(workspace);
  },

  async getUserWorkspaces(userId: string) {
    const result = await query(
      `SELECT w.id, w.name, w.slug, w.plan, w.created_at, w.updated_at, wm.role AS member_role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return result.rows.map(mapWorkspace);
  },

  async getWorkspaceDetails(workspaceId: string) {
    const result = await query(
      `SELECT id, name, slug, plan, created_at, updated_at
       FROM workspaces
       WHERE id = $1`,
      [workspaceId]
    );
    const workspace = result.rows[0];
    if (!workspace) {
      throw new AppError(404, 'Workspace not found');
    }
    return mapWorkspace(workspace);
  },

  async inviteMember(workspaceId: string, inviterId: string, data: InviteMemberInput) {
    const workspaceResult = await query<{ plan: string }>('SELECT plan FROM workspaces WHERE id = $1', [workspaceId]);
    const workspace = workspaceResult.rows[0];
    if (!workspace) {
      throw new AppError(404, 'Workspace not found');
    }

    if (workspace.plan !== 'pro') {
      const limits = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM (
          SELECT id FROM workspace_members WHERE workspace_id = $1
          UNION ALL
          SELECT id FROM workspace_invites WHERE workspace_id = $1 AND used_at IS NULL AND expires_at > NOW()
        ) limited`,
        [workspaceId]
      );
      if (Number(limits.rows[0]?.count ?? 0) >= 5) {
        throw new AppError(403, 'Free plan limit reached: Maximum 5 members allowed per workspace. Upgrade to PRO for unlimited members.');
      }
    }

    const existingMember = await query(
      `SELECT wm.id
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 AND u.email = $2`,
      [workspaceId, data.email]
    );
    if (existingMember.rowCount) {
      throw new AppError(400, 'User is already a member of this workspace');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inviteResult = await query(
      `INSERT INTO workspace_invites (workspace_id, email, token, role, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, workspace_id, email, token, role, expires_at, used_at, created_at`,
      [workspaceId, data.email, token, toDbRole(data.role), expiresAt]
    );
    const invite = inviteResult.rows[0];

    await activityService.createActivity({
      workspaceId,
      userId: inviterId,
      action: 'MEMBER_INVITED',
      entityType: 'INVITE',
      entityId: invite.id,
      metadata: { email: data.email, role: data.role },
    });

    const invitedUser = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [data.email]);
    if (invitedUser.rows[0]) {
      await notificationService.createNotification({
        userId: invitedUser.rows[0].id,
        type: 'mention',
        message: `You have been invited to join a workspace as ${data.role}`,
        metadata: { workspaceId, role: data.role },
      });
    }

    return {
      id: invite.id,
      workspaceId: invite.workspace_id,
      email: invite.email,
      token: invite.token,
      role: toApiRole(invite.role),
      expiresAt: invite.expires_at,
      usedAt: invite.used_at,
      createdAt: invite.created_at,
    };
  },

  async acceptInvite(userId: string, userEmail: string, data: AcceptInviteInput) {
    const inviteResult = await query(
      `SELECT id, workspace_id, email, role, expires_at, used_at
       FROM workspace_invites
       WHERE token = $1`,
      [data.token]
    );
    const invite = inviteResult.rows[0];

    if (!invite) {
      throw new AppError(404, 'Invite not found');
    }
    if (invite.used_at) {
      throw new AppError(400, 'Invite has already been processed');
    }
    if (invite.expires_at < new Date()) {
      throw new AppError(400, 'Invite has expired');
    }
    if (invite.email !== userEmail) {
      throw new AppError(403, 'This invite was sent to a different email address');
    }

    const membership = await transaction(async (client) => {
      await client.query('UPDATE workspace_invites SET used_at = NOW() WHERE id = $1', [invite.id]);
      const result = await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
         RETURNING id, workspace_id, user_id, role, joined_at`,
        [invite.workspace_id, userId, invite.role]
      );
      return result.rows[0];
    });

    await activityService.createActivity({
      workspaceId: invite.workspace_id,
      userId,
      action: 'INVITE_ACCEPTED',
      entityType: 'MEMBER',
      entityId: membership.id,
    });

    return {
      id: membership.id,
      workspaceId: membership.workspace_id,
      userId: membership.user_id,
      role: toApiRole(membership.role),
      joinedAt: membership.joined_at,
    };
  },

  async listMembers(workspaceId: string) {
    const result = await query(
      `SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at,
              u.email, u.name, u.avatar_url, u.bio
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1
       ORDER BY wm.joined_at ASC`,
      [workspaceId]
    );
    return result.rows.map(mapMember);
  },

  async updateMemberRole(workspaceId: string, targetUserId: string, newRole: Role, currentMembership?: WorkspaceMembership) {
    if (!currentMembership) {
      throw new AppError(403, 'Membership context is required');
    }

    const targetResult = await query(
      `SELECT id, workspace_id, user_id, role
       FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, targetUserId]
    );
    const targetMembership = targetResult.rows[0];
    if (!targetMembership) {
      throw new AppError(404, 'Member not found');
    }

    const targetRole = toApiRole(targetMembership.role);
    if (currentMembership.role !== Role.OWNER && targetRole === Role.OWNER) {
      throw new AppError(403, 'Only owners can modify owner roles');
    }
    if (currentMembership.role !== Role.OWNER && newRole === Role.OWNER) {
      throw new AppError(403, 'Only owners can grant owner role');
    }

    const updatedResult = await query(
      `UPDATE workspace_members
       SET role = $1
       WHERE workspace_id = $2 AND user_id = $3
       RETURNING id, workspace_id, user_id, role, joined_at`,
      [toDbRole(newRole), workspaceId, targetUserId]
    );
    const updated = updatedResult.rows[0];

    await activityService.createActivity({
      workspaceId,
      userId: currentMembership.userId,
      action: 'ROLE_UPDATED',
      entityType: 'MEMBER',
      entityId: targetMembership.id,
      metadata: { oldRole: targetRole, newRole },
    });

    await notificationService.createNotification({
      userId: targetUserId,
      type: 'assignment',
      message: `Your role in the workspace was updated to ${newRole}`,
      metadata: { workspaceId, oldRole: targetRole, newRole },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspace_id,
      userId: updated.user_id,
      role: toApiRole(updated.role),
      joinedAt: updated.joined_at,
    };
  },

  async removeMember(workspaceId: string, targetUserId: string, currentMembership?: WorkspaceMembership) {
    if (!currentMembership) {
      throw new AppError(403, 'Membership context is required');
    }

    const targetResult = await query(
      `SELECT id, role
       FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, targetUserId]
    );
    const targetMembership = targetResult.rows[0];
    if (!targetMembership) {
      throw new AppError(404, 'Member not found');
    }

    const targetRole = toApiRole(targetMembership.role);
    if (targetRole === Role.OWNER && currentMembership.role !== Role.OWNER) {
      throw new AppError(403, 'Only owners can remove an owner');
    }
    if (targetRole === Role.OWNER) {
      const ownerCount = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM workspace_members
         WHERE workspace_id = $1 AND role = 'owner'`,
        [workspaceId]
      );
      if (Number(ownerCount.rows[0]?.count ?? 0) <= 1) {
        throw new AppError(400, 'Cannot remove the last owner of the workspace');
      }
    }

    await query('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [workspaceId, targetUserId]);

    await activityService.createActivity({
      workspaceId,
      userId: currentMembership.userId,
      action: 'MEMBER_REMOVED',
      entityType: 'MEMBER',
      entityId: targetMembership.id,
      metadata: { removedUserId: targetUserId },
    });

    await notificationService.createNotification({
      userId: targetUserId,
      type: 'assignment',
      message: 'You have been removed from the workspace',
      metadata: { workspaceId },
    });
  },
};
