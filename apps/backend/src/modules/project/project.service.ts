import { pool } from '../../db/client';

export async function createProject(): Promise<void> {
  // TODO: insert project row
  void pool;
}

export async function listProjects(): Promise<void> {
  // TODO: select projects by workspaceId
}

export async function getProjectById(): Promise<void> {
  // TODO: select single project by id
}

export async function updateProject(): Promise<void> {
  // TODO: update project metadata
}

export async function deleteProject(): Promise<void> {
  // TODO: cascade delete project
}
