import { useState, useEffect } from 'react';
import useWikiStore from '../../stores/wikiStore';
import ConfirmDialog from '../common/ConfirmDialog';
import { SkeletonWikiItem } from '../common/Skeleton';

export default function WikiSidebar({ projectId, workspaceId }: { projectId: string; workspaceId: string }) {
  const { pages, activePageId, fetchPages, createPage, setActivePageId, deletePage, isLoading, favorites, fetchFavorites, toggleFavorite } = useWikiStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState('');

  useEffect(() => {
    fetchPages(projectId);
    fetchFavorites(projectId);
  }, [projectId, fetchPages, fetchFavorites]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const newPage = await createPage(projectId, newTitle, workspaceId);
      setNewTitle('');
      setShowCreate(false);
      setActivePageId(newPage.id);
    } catch (err) {
      // Handled by store
    }
  };

  const filteredPages = pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-64 h-full bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col flex-shrink-0 select-none text-gray-300">
      <div className="px-4 py-3 border-b border-[#2d2d2d] flex items-center justify-between group">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pages</span>
        <div className="flex gap-1">
          <button 
            onClick={() => document.getElementById('wiki-local-file-upload')?.click()}
            className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
            title="Import Local File"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </button>
          <button 
            onClick={() => setShowCreate(true)}
            className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
            title="New Page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        
        <input 
          type="file" 
          id="wiki-local-file-upload" 
          className="hidden" 
          accept=".md,.txt"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !projectId || !workspaceId) return;
            
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const content = ev.target?.result as string;
              // Remove extension for title
              const title = file.name.replace(/\.[^/.]+$/, "");
              
              try {
                const store = useWikiStore.getState();
                const newPage = await store.createPage(projectId, title, workspaceId);
                await store.updatePage(newPage.id, { content });
                store.setActivePageId(newPage.id);
              } catch (err) {
                // wiki store shows toast
              }
            };
            reader.readAsText(file);
            e.target.value = '';
          }} 
        />
      </div>

      <div className="p-2">
        <input 
          type="text" 
          placeholder="Search pages..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#2d2d2d] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {favorites.length > 0 && search === '' && (
          <div className="mb-4">
            <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Favorites
            </div>
            {pages.filter(p => favorites.includes(p.id)).map(page => (
              <div 
                key={`fav-${page.id}`}
                onClick={() => setActivePageId(page.id)}
                className={`group flex items-center justify-between px-4 py-1.5 cursor-pointer text-sm transition-colors ${
                  activePageId === page.id ? 'bg-[#37373d] text-white font-medium' : 'text-gray-300 hover:bg-[#2a2d2e] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm opacity-80">{page.icon || '📄'}</span>
                  <span className="truncate">{page.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          All Pages
        </div>

        {isLoading ? (
          <div className="px-2 space-y-1">
            <SkeletonWikiItem />
            <SkeletonWikiItem />
            <SkeletonWikiItem />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="px-4 py-4 text-xs text-center text-gray-500">
            <p className="mb-2">No pages found.</p>
            {search === '' && (
              <button onClick={() => setShowCreate(true)} className="text-blue-400 hover:text-blue-300 hover:underline">
                Create the first page
              </button>
            )}
          </div>
        ) : (
          filteredPages.map((page) => (
            <div 
              key={page.id}
              onClick={() => setActivePageId(page.id)}
              className={`group flex items-center justify-between px-4 py-2 cursor-pointer text-sm transition-colors ${
                activePageId === page.id ? 'bg-[#37373d] text-white font-medium' : 'text-gray-300 hover:bg-[#2a2d2e] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm opacity-80 flex-shrink-0">{page.icon || '📄'}</span>
                <span className="truncate">{page.title}</span>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(page.id);
                  }}
                  className={`p-1 hover:bg-white/10 rounded ${favorites.includes(page.id) ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                  title={favorites.includes(page.id) ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <svg className="w-3.5 h-3.5" fill={favorites.includes(page.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(page.id);
                    setConfirmDeleteTitle(page.title);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1 hover:bg-white/10 rounded"
                  title="Delete Page"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 shadow-2xl w-80">
            <h3 className="text-white text-lg font-semibold mb-4">Create New Page</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="Page Title" 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
              className="w-full bg-[#2d2d2d] border border-[#444] rounded px-3 py-2 text-white outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-gray-300 hover:text-white rounded hover:bg-[#333]">Cancel</button>
              <button onClick={handleCreate} disabled={!newTitle.trim()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete page dialog */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={`Delete "${confirmDeleteTitle}"?`}
        message="This page and all its content will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete Page"
        onConfirm={() => {
          if (confirmDeleteId) deletePage(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
