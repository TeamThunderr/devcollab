import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { Snippet } from '../../types';
import SnippetExplainModal from '../snippets/SnippetExplainModal';

interface SnippetCardProps {
  snippet: Snippet;
  onCopy?: (code: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onClick?: (snippet: Snippet) => void;
}

export default function SnippetCard({
  snippet,
  onCopy,
  onDelete,
  onClick,
}: SnippetCardProps): React.ReactElement {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function highlightPreview() {
      try {
        const html = await codeToHtml(snippet.code, {
          lang: snippet.language as Parameters<typeof codeToHtml>[1]['lang'],
          theme: 'github-dark',
        });

        if (!cancelled) {
          setPreviewHtml(html);
        }
      } catch {
        if (!cancelled) {
          setPreviewHtml(`<pre>${snippet.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
        }
      }
    }

    void highlightPreview();

    return () => {
      cancelled = true;
    };
  }, [snippet.code, snippet.language]);

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    await onCopy?.(snippet.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    await onDelete?.(snippet.id);
  }

  return (
    <article
      onClick={() => onClick?.(snippet)}
      className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-600">{snippet.language}</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{snippet.title}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {new Date(snippet.createdAt).toLocaleDateString()}
        </span>
      </div>

      <p className="mt-3 min-h-[3rem] text-sm leading-6 text-slate-600">
        {snippet.description || 'No description provided.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {snippet.tags.length === 0 ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">No tags</span>
        ) : (
          snippet.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
              {tag}
            </span>
          ))
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <div
          className="max-h-48 overflow-auto text-xs [&_pre]:m-0 [&_pre]:min-w-full [&_pre]:p-4"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={(event) => void handleCopy(event)}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowExplain(true); }}
          className="rounded-full bg-violet-900/60 border border-violet-500/30 px-4 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-800/80 hover:text-white"
        >
          🤖 Explain
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={(event) => void handleDelete(event)}
            className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Delete
          </button>
        ) : null}
      </div>

      {/* AI Explain Modal */}
      {showExplain && (
        <SnippetExplainModal
          snippet={snippet}
          isOpen={showExplain}
          onClose={() => setShowExplain(false)}
        />
      )}
    </article>
  );
}
