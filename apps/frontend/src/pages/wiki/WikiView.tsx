import { useState } from 'react';
import { useParams } from 'react-router-dom';
import WikiSidebar from '../../components/wiki/WikiSidebar';
import WikiEditor from '../../components/wiki/WikiEditor';
import VersionHistoryPanel from '../../components/wiki/VersionHistoryPanel';

export default function WikiView() {
  const { workspaceId, pid } = useParams();
  const [showHistory, setShowHistory] = useState(false);

  if (!pid || !workspaceId) return null;

  return (
    <div className="flex h-full w-full bg-[#1e1e1e] overflow-hidden relative">
      {/* Sidebar for Navigation */}
      <WikiSidebar projectId={pid} workspaceId={workspaceId} />
      
      {/* Main Rich Text Editor */}
      <WikiEditor projectId={pid} onToggleHistory={() => setShowHistory(true)} />

      {/* Slide-out Version History Panel */}
      {showHistory && (
        <VersionHistoryPanel onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
