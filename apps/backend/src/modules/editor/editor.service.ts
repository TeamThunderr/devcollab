import { query } from '../../db/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

function mapFile(file: any) {
  return {
    id: file.id,
    projectId: file.project_id,
    parentId: null,
    name: file.name,
    path: file.path,
    type: 'file',
    content: file.content,
    language: file.language,
    taskId: file.linked_task_id,
    createdBy: file.created_by,
    createdAt: file.created_at?.toISOString?.() ?? file.created_at,
    updatedAt: file.updated_at?.toISOString?.() ?? file.updated_at,
  };
}

export class EditorService {
  async getFileTree(projectId: string) {
    const result = await query(
      `SELECT id, project_id, name, path, language, content, linked_task_id, created_by, created_at, updated_at
       FROM code_files
       WHERE project_id = $1
       ORDER BY path ASC`,
      [projectId]
    );
    return result.rows.map(mapFile);
  }

  async getFile(projectId: string, fileId: string) {
    const result = await query(
      `SELECT id, project_id, name, path, language, content, linked_task_id, created_by, created_at, updated_at
       FROM code_files
       WHERE id = $1 AND project_id = $2`,
      [fileId, projectId]
    );
    return result.rows[0] ? mapFile(result.rows[0]) : null;
  }

  async createFile(data: { projectId: string; name: string; type?: string; parentId?: string; content?: string; language?: string; createdBy: string; taskId?: string; path?: string }) {
    const filePath = data.path || data.name;
    const result = await query(
      `INSERT INTO code_files (project_id, name, path, language, content, linked_task_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, project_id, name, path, language, content, linked_task_id, created_by, created_at, updated_at`,
      [
        data.projectId,
        data.name,
        filePath,
        data.language || 'plaintext',
        data.content || '',
        data.taskId || null,
        data.createdBy,
      ]
    );
    return mapFile(result.rows[0]);
  }

  async updateFile(projectId: string, fileId: string, data: { name?: string; content?: string; language?: string; taskId?: string | null }) {
    const result = await query(
      `UPDATE code_files
       SET name = COALESCE($3, name),
           content = COALESCE($4, content),
           language = COALESCE($5, language),
           linked_task_id = CASE WHEN $6::boolean THEN $7 ELSE linked_task_id END,
           updated_at = NOW()
       WHERE id = $1 AND project_id = $2
       RETURNING id, project_id, name, path, language, content, linked_task_id, created_by, created_at, updated_at`,
      [
        fileId,
        projectId,
        data.name ?? null,
        data.content ?? null,
        data.language ?? null,
        data.taskId !== undefined,
        data.taskId ?? null,
      ]
    );
    return result.rows[0] ? mapFile(result.rows[0]) : null;
  }

  async deleteFile(projectId: string, fileId: string) {
    const result = await query(
      `DELETE FROM code_files
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [fileId, projectId]
    );
    return result.rows[0] ?? null;
  }

  async getEditorState(projectId: string, userId: string) {
    const result = await query(
      `SELECT settings, layout, open_tabs, active_file_id, terminal_history
       FROM user_project_editor_state
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return result.rows[0] || {
      settings: {},
      layout: {},
      open_tabs: [],
      active_file_id: null,
      terminal_history: []
    };
  }

  async updateEditorState(projectId: string, userId: string, state: any) {
    const { settings, layout, openTabs, activeFileId, terminalHistory } = state;
    const result = await query(
      `INSERT INTO user_project_editor_state 
        (project_id, user_id, settings, layout, open_tabs, active_file_id, terminal_history, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id, project_id) 
       DO UPDATE SET 
         settings = COALESCE(EXCLUDED.settings, user_project_editor_state.settings),
         layout = COALESCE(EXCLUDED.layout, user_project_editor_state.layout),
         open_tabs = COALESCE(EXCLUDED.open_tabs, user_project_editor_state.open_tabs),
         active_file_id = EXCLUDED.active_file_id,
         terminal_history = COALESCE(EXCLUDED.terminal_history, user_project_editor_state.terminal_history),
         updated_at = NOW()
       RETURNING settings, layout, open_tabs, active_file_id, terminal_history`,
      [
        projectId, 
        userId, 
        settings ? JSON.stringify(settings) : null,
        layout ? JSON.stringify(layout) : null,
        openTabs,
        activeFileId,
        terminalHistory
      ]
    );
    return result.rows[0];
  }

  async executeCode(language: string, content: string) {
    const tmpDir = os.tmpdir();
    const id = Date.now().toString() + Math.floor(Math.random() * 1000);
    let filePath = '';
    let cmd = '';

    if (language === 'javascript' || language === 'typescript') {
      filePath = path.join(tmpDir, `script_${id}.js`);
      await fs.writeFile(filePath, content);
      cmd = `node ${filePath}`;
    } else if (language === 'python') {
      filePath = path.join(tmpDir, `script_${id}.py`);
      await fs.writeFile(filePath, content);
      cmd = `python3 ${filePath}`;
    } else if (language === 'cpp') {
      filePath = path.join(tmpDir, `source_${id}.cpp`);
      const outPath = path.join(tmpDir, `out_${id}`);
      await fs.writeFile(filePath, content);
      cmd = `g++ ${filePath} -o ${outPath} && ${outPath}`;
    } else if (language === 'java') {
      filePath = path.join(tmpDir, `Main_${id}.java`);
      await fs.writeFile(filePath, content);
      cmd = `javac ${filePath} && java -cp ${tmpDir} Main_${id}`;
    } else {
      throw new Error(`Execution for language ${language} is not supported.`);
    }

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 5000 });
      return { stdout, stderr };
    } catch (err: any) {
      return { stdout: err.stdout || '', stderr: err.stderr || err.message };
    } finally {
      try {
        if (filePath) await fs.unlink(filePath).catch(() => {});
        if (language === 'cpp') await fs.unlink(path.join(tmpDir, `out_${id}`)).catch(() => {});
        if (language === 'java') await fs.unlink(path.join(tmpDir, `Main_${id}.class`)).catch(() => {});
      } catch (e) {}
    }
  }

  async runTerminalCommand(command: string) {
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      return { stdout, stderr };
    } catch (err: any) {
      return { stdout: err.stdout || '', stderr: err.stderr || err.message };
    }
  }
}
