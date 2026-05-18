import { pool } from '../../db/client';

export async function getFileTree(): Promise<void> {
  // TODO: read file tree from DB or filesystem for project
  void pool;
}

export async function getFileContent(): Promise<void> {
  // TODO: retrieve file content by path
}

export async function saveFileContent(): Promise<void> {
  // TODO: persist file content and broadcast to collaborators
}

export async function createFile(): Promise<void> {
  // TODO: create file or directory entry
}

export async function deleteFile(): Promise<void> {
  // TODO: remove file or directory entry
}
