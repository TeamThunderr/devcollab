import { pool } from '../../db/client';

export async function listActivities(): Promise<void> {
  // TODO: select activity rows for user
  void pool;
}

export async function getWorkspaceActivity(): Promise<void> {
  // TODO: select activities filtered by workspaceId
}

export async function getProjectActivity(): Promise<void> {
  // TODO: select activities filtered by projectId
}

export async function logActivity(): Promise<void> {
  // TODO: insert activity row (called internally after mutations)
}
