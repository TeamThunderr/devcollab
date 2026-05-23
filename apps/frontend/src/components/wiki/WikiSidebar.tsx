import React, { useState, useEffect } from 'react';
import useWikiStore from '../../stores/wikiStore';

export default function WikiSidebar({ projectId, workspaceId }: { projectId: string; workspaceId: string }) {
  const { pages, activePageId, fetchPages, createPage, setActivePageId, deletePage, isLoading } = useWikiStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPages(projectId);
  }, [projectId, fetchPages]);

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
        <button 
          onClick={() => setShowCreate(true)}
          className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
          title="New Page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
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
        {isLoading ? (
          <div className="px-4 py-2 text-xs text-gray-500 italic">Loading...</div>
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
                <svg className="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="truncate">{page.title}</span>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this page?')) {
                    deletePage(page.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1 hover:bg-white/10 rounded transition-all"
                title="Delete Page"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
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
    </div>
  );
}
