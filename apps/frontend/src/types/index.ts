export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  _count?: {
    tasks: number;
    snippets: number;
  };
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  createdBy: User;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'P0' | 'P1' | 'P2';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  comments: Comment[];
}

export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  description?: string;
  tags: string[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
}
