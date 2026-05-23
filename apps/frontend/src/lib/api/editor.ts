import api from '../axios';

export interface CodeFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  taskId?: string | null;
}

export async function getProjectFiles(projectId: string): Promise<CodeFile[]> {
  const { data } = await api.get(`/api/editor/projects/${projectId}/files`);
  return data;
}

export async function getFile(fileId: string): Promise<CodeFile> {
  const { data } = await api.get(`/api/editor/files/${fileId}`);
  return data;
}

export async function createFile(projectId: string, payload: { name: string, path: string, language: string, content: string }): Promise<CodeFile> {
  const { data } = await api.post(`/api/editor/projects/${projectId}/files`, payload);
  return data;
}

export async function updateFile(fileId: string, payload: { name?: string, content?: string, taskId?: string | null }): Promise<CodeFile> {
  const { data } = await api.put(`/api/editor/files/${fileId}`, payload);
  return data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/api/editor/files/${fileId}`);
}
