import { useEffect } from 'react';
import useWikiStore from '../../stores/wikiStore';
import { formatDistanceToNow } from 'date-fns';

export default function VersionHistoryPanel({ onClose }: { onClose: () => void }) {
  const { activePage, versions, fetchVersions, restoreVersion } = useWikiStore();

  useEffect(() => {
    if (activePage) {
      fetchVersions(activePage.id);
    }
  }, [activePage?.id, fetchVersions]);

  if (!activePage) return null;

  const handleRestore = async (versionId: string) => {
    if (confirm('Are you sure you want to restore this version? Your current draft will be overwritten.')) {
      await restoreVersion(activePage.id, versionId);
      onClose();
    }
  };

  return (
    <div className="w-80 h-full bg-[#1e1e1e] border-l border-[#2d2d2d] flex flex-col flex-shrink-0 text-gray-300">
      <div className="px-4 py-3 border-b border-[#2d2d2d] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Version History</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {versions.length === 0 ? (
          <div className="text-xs text-gray-500 text-center">No snapshots saved yet.</div>
        ) : (
          versions.map((v) => (
            <div key={v.id} className="bg-[#252526] border border-[#333] rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-xs font-semibold text-gray-200">Version {v.versionNumber}</div>
                  <div className="text-[10px] text-gray-500">{formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}</div>
                </div>
                <button
                  onClick={() => handleRestore(v.id)}
                  className="text-[10px] uppercase tracking-wider font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded"
                >
                  Restore
                </button>
              </div>
              <div className="text-xs text-gray-500 truncate mt-2 bg-[#1e1e1e] p-2 rounded">
                {/* A stripped preview of the HTML content snapshot */}
                {v.contentSnapshot.replace(/<[^>]+>/g, '').substring(0, 100) || 'Empty snapshot...'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
