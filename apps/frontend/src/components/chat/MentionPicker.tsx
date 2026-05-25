import { useEffect, useRef, useState } from 'react';

interface MentionPickerProps {
  members: { id: string; name: string; avatarUrl: string | null }[];
  query: string;
  onSelect: (member: { id: string; name: string }) => void;
  onClose: () => void;
}

const colors = ['#3266ad', '#1D9E75', '#BA7517', '#D85A30', '#534AB7'];

export default function MentionPicker({ members, query, onSelect, onClose }: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredMembers.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMembers[selectedIndex]) {
          onSelect(filteredMembers[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredMembers, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (containerRef.current) {
      const selectedItem = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden min-w-48 max-h-48 overflow-y-auto z-50">
      {filteredMembers.length === 0 ? (
        <div className="text-xs text-gray-500 p-3">No members found</div>
      ) : (
        <div ref={containerRef}>
          {filteredMembers.map((member, idx) => {
            const color = colors[member.name.charCodeAt(0) % colors.length];
            return (
              <div
                key={member.id}
                onClick={() => onSelect(member)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  idx === selectedIndex ? 'bg-gray-800' : 'hover:bg-gray-800'
                }`}
              >
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-bold uppercase overflow-hidden"
                  style={{ backgroundColor: member.avatarUrl ? 'transparent' : color }}
                >
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>
                <span className="text-sm text-white">{member.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
