import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSnippetStore } from '../../stores/snippetStore';
import SnippetCard from '../../components/kanban/SnippetCard';

export default function SnippetsPage(): React.ReactElement {
  const { workspaceId, projectId: pid } = useParams<{ workspaceId: string; projectId: string }>();
  const {
    snippets,
    loading,
    error,
    fetchSnippetsByProject,
    createSnippet,
    deleteSnippet,
    searchSnippets
  } = useSnippetStore();

  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  // Use a simple debounce for searching
  useEffect(() => {
    if (pid) {
      if (searchQuery.trim().length > 0) {
        const timeout = setTimeout(() => {
          void searchSnippets(pid, searchQuery);
        }, 400);
        return () => clearTimeout(timeout);
      } else {
        void fetchSnippetsByProject(pid);
      }
    }
  }, [fetchSnippetsByProject, searchSnippets, pid, searchQuery]);

  async function handleCreateSnippet() {
    if (!title.trim() || !code.trim() || !pid) return;

    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

    await createSnippet(
      title.trim(),
      language,
      code.trim(),
      description.trim() || undefined,
      tags,
      pid
    );

    setTitle('');
    setLanguage('javascript');
    setCode('');
    setDescription('');
    setTagsStr('');
    setShowForm(false);
  }

  async function handleDeleteSnippet(id: string) {
    if (window.confirm('Delete this snippet?')) {
      await deleteSnippet(id);
    }
  }

  async function handleCopyCode(snippetCode: string) {
    try {
      await navigator.clipboard.writeText(snippetCode);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-800 p-8 text-white shadow-xl sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to={`/${workspaceId}/projects`} className="text-sm uppercase tracking-widest text-cyan-200 hover:text-white transition">
              ← Back to Projects
            </Link>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Code Snippets</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              Reusable code components and scripts for this project.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(current => !current)}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-100"
          >
            {showForm ? 'Close Form' : 'New Snippet'}
          </button>
        </div>

        {showForm ? (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create Snippet</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Fetch util"
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Language
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Code
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Paste your code here..."
                  rows={8}
                  className="font-mono rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Description
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does this do?"
                  rows={2}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Tags
                <input
                  type="text"
                  value={tagsStr}
                  onChange={e => setTagsStr(e.target.value)}
                  placeholder="e.g. utility, react, network (comma separated)"
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </label>
              <div className="flex items-end gap-3 mt-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => void handleCreateSnippet()}
                  disabled={!title.trim() || !code.trim()}
                  className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Create Snippet
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search snippets by title or tags..."
            className="w-full max-w-md rounded-full border border-slate-300 px-5 py-3 text-sm outline-none transition focus:border-cyan-500 shadow-sm"
          />
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading snippets...
          </div>
        ) : snippets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-700">No snippets found</p>
            <p className="mt-2 text-sm text-slate-500">Create a snippet to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {snippets.map(snippet => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                onCopy={handleCopyCode}
                onDelete={handleDeleteSnippet}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
