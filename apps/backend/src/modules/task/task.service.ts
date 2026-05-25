import { query } from '../../db/client';
import { CreateTaskInput, UpdateTaskInput } from './task.schema';

const statusToDb: Record<string, string> = {
  TODO: 'todo',
  IN_PROGRESS: 'inprogress',
  IN_REVIEW: 'inreview',
  DONE: 'done',
};

const statusToApi: Record<string, string> = {
  todo: 'TODO',
  inprogress: 'IN_PROGRESS',
  inreview: 'IN_REVIEW',
  done: 'DONE',
};

function priorityToDb(priority: string): string {
  return priority.toLowerCase();
}

function priorityToApi(priority: string): string {
  return priority.toUpperCase();
}

function mapComment(comment: any) {
  return {
    id: comment.id,
    content: comment.content,
    taskId: comment.task_id,
    createdAt: comment.created_at?.toISOString?.() ?? comment.created_at,
    updatedAt: comment.updated_at?.toISOString?.() ?? comment.updated_at,
    createdBy: comment.user_id ? {
      id: comment.user_id,
      email: comment.email,
      name: comment.name,
    } : undefined,
  };
}

function mapTask(task: any) {
  const comments = Array.isArray(task.comments) ? task.comments : [];
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: statusToApi[task.status] ?? task.status,
    priority: priorityToApi(task.priority),
    dueDate: task.due_date?.toISOString?.() ?? task.due_date ?? undefined,
    projectId: task.project_id,
    assigneeId: task.assignee_id ?? undefined,
    createdAt: task.created_at?.toISOString?.() ?? task.created_at,
    updatedAt: task.updated_at?.toISOString?.() ?? task.updated_at,
    createdBy: task.created_by ? {
      id: task.created_by,
      email: task.creator_email,
      name: task.creator_name,
    } : undefined,
    assignee: task.assignee_id ? {
      id: task.assignee_id,
      email: task.assignee_email,
      name: task.assignee_name,
    } : undefined,
    comments: comments.map(mapComment),
  };
}

async function getCommentsByTaskIds(taskIds: string[]) {
  if (!taskIds.length) {
    return new Map<string, any[]>();
  }
  const result = await query(
    `SELECT tc.*, u.email, u.name
     FROM task_comments tc
     JOIN users u ON u.id = tc.user_id
     WHERE tc.task_id = ANY($1::uuid[])
     ORDER BY tc.created_at DESC`,
    [taskIds]
  );
  const grouped = new Map<string, any[]>();
  for (const row of result.rows) {
    const current = grouped.get(row.task_id) ?? [];
    current.push(row);
    grouped.set(row.task_id, current);
  }
  return grouped;
}

export class TaskService {
  async createTask(data: CreateTaskInput & { assigneeId?: string | null }, userId: string) {
    const result = await query(
      `INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, project_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        data.title,
        data.description ?? null,
        statusToDb[data.status ?? 'TODO'],
        priorityToDb(data.priority ?? 'P1'),
        data.dueDate ? new Date(data.dueDate) : null,
        data.assigneeId ?? null,
        data.projectId,
        userId,
      ]
    );
    const createdTask = await this.getTaskById(result.rows[0].id);
    if (!createdTask) throw new Error('Failed to fetch created task');
    return createdTask;
  }

  async getTasksByProject(projectId: string, filters?: { status?: string; priority?: string }) {
    const where: string[] = ['t.project_id = $1'];
    const params: any[] = [projectId];

    if (filters?.status) {
      params.push(statusToDb[filters.status]);
      where.push(`t.status = $${params.length}`);
    }
    if (filters?.priority) {
      params.push(priorityToDb(filters.priority));
      where.push(`t.priority = $${params.length}`);
    }

    const result = await query(
      `SELECT t.*, 
              u.email AS creator_email, u.name AS creator_name,
              ua.email AS assignee_email, ua.name AS assignee_name
       FROM tasks t
       JOIN users u ON u.id = t.created_by
       LEFT JOIN users ua ON ua.id = t.assignee_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.created_at DESC`,
      params
    );
    const commentsByTask = await getCommentsByTaskIds(result.rows.map(row => row.id));
    return result.rows.map(row => mapTask({ ...row, comments: commentsByTask.get(row.id) ?? [] }));
  }

  async getTaskById(taskId: string) {
    const result = await query(
      `SELECT t.*, 
              u.email AS creator_email, u.name AS creator_name,
              ua.email AS assignee_email, ua.name AS assignee_name
       FROM tasks t
       JOIN users u ON u.id = t.created_by
       LEFT JOIN users ua ON ua.id = t.assignee_id
       WHERE t.id = $1`,
      [taskId]
    );
    const task = result.rows[0];
    if (!task) {
      return null;
    }
    const commentsByTask = await getCommentsByTaskIds([taskId]);
    return mapTask({ ...task, comments: commentsByTask.get(taskId) ?? [] });
  }

  async updateTask(taskId: string, data: UpdateTaskInput & { assigneeId?: string | null }) {
    const result = await query(
      `UPDATE tasks
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           status = COALESCE($4::task_status, status),
           priority = COALESCE($5::task_priority, priority),
           due_date = CASE WHEN $6::boolean THEN $7 ELSE due_date END,
           assignee_id = CASE WHEN $8::boolean THEN $9 ELSE assignee_id END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        taskId,
        data.title ?? null,
        data.description ?? null,
        data.status ? statusToDb[data.status] : null,
        data.priority ? priorityToDb(data.priority) : null,
        data.dueDate !== undefined,
        data.dueDate ? new Date(data.dueDate) : null,
        data.assigneeId !== undefined,
        data.assigneeId ?? null,
      ]
    );
    if (!result.rows[0]) {
      throw new Error('Task not found');
    }
    const updatedTask = await this.getTaskById(taskId);
    if (!updatedTask) throw new Error('Task not found');
    return updatedTask;
  }

  async deleteTask(taskId: string) {
    const result = await query('DELETE FROM tasks WHERE id = $1', [taskId]);
    if (!result.rowCount) {
      throw new Error('Task not found');
    }
  }

  async addComment(taskId: string, content: string, userId: string) {
    const result = await query(
      `INSERT INTO task_comments (task_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, task_id, user_id, content, created_at, updated_at`,
      [taskId, userId, content]
    );
    return mapComment(result.rows[0]);
  }

  async getTaskComments(taskId: string) {
    const result = await query(
      `SELECT tc.*, u.email, u.name
       FROM task_comments tc
       JOIN users u ON u.id = tc.user_id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at DESC`,
      [taskId]
    );
    return result.rows.map(mapComment);
  }
}
