-- Add Notion-style metadata to wiki_pages
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS linked_file_id UUID REFERENCES code_files(id) ON DELETE SET NULL;

-- Create favorites table
CREATE TABLE IF NOT EXISTS wiki_page_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_favorites_user ON wiki_page_favorites(user_id);
