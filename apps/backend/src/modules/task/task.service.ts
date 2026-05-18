import { pool } from '../../db/client';

export async function createTask(): Promise<void> {
  // TODO: insert task row with default status
  void pool;
}

export async function listTasks(): Promise<void> {
  // TODO: select tasks by projectId with filters
}

export async function getTaskById(): Promise<void> {
  // TODO: select single task by id
}

export async function updateTask(): Promise<void> {
  // TODO: update task fields
}

export async function deleteTask(): Promise<void> {
  // TODO: delete task row
}

export async function assignTask(): Promise<void> {
  // TODO: set assignee_id on task
}

export async function moveTask(): Promise<void> {
  // TODO: update status and sort_order for kanban
}
