CREATE TABLE IF NOT EXISTS user_project_editor_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  layout JSONB DEFAULT '{}',
  open_tabs TEXT[] DEFAULT '{}',
  active_file_id UUID,
  terminal_history TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_editor_state_lookup ON user_project_editor_state(user_id, project_id);
