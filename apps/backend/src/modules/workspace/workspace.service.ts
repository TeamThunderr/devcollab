import { pool } from '../../db/client';

export async function createWorkspace(): Promise<void> {
  // TODO: insert workspace row, add owner as first member
  void pool;
}

export async function listWorkspaces(): Promise<void> {
  // TODO: select workspaces by member userId
}

export async function getWorkspaceBySlug(): Promise<void> {
  // TODO: select workspace by unique slug
}

export async function updateWorkspace(): Promise<void> {
  // TODO: update workspace name/slug/settings
}

export async function deleteWorkspace(): Promise<void> {
  // TODO: cascade delete workspace
}

export async function inviteMember(): Promise<void> {
  // TODO: send invite email and create pending membership
}

export async function removeMember(): Promise<void> {
  // TODO: delete workspace_member row
}

export async function listMembers(): Promise<void> {
  // TODO: join users + workspace_members
}
