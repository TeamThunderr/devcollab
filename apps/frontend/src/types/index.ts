export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  platformRole?: PlatformRole;
}

export type PlatformRole = 'USER' | 'SUPER_ADMIN';

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
  visibility?: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  _count?: {
    tasks: number;
    snippets: number;
  };
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: WorkspaceRole;
  user: User;
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
  assigneeId?: string | null;
  assignee?: User;
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
  project?: Project;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
}

export interface Activity {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
  user?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  metadata?: any;
  readAt: string | null;
  createdAt: string;
  user?: User;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  plan: 'FREE' | 'PRO';
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
  currentPeriodEnd?: string;
  razorpaySubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentPayload {
  workspaceId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
