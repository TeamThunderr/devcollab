import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Code2, Sun, BookOpen, Search, Sparkles } from 'lucide-react';

interface DockItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  action: () => void;
}

function DockIcon({
  item,
  mouseX,
  index,
}: {
  item: DockItem;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Gaussian bell curve for dock magnification
  const distance = useTransform(mouseX, (val) => {
    if (!ref.current) return 0;
    const rect = ref.current.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    return Math.abs(val - center);
  });

  const size = useTransform(distance, [0, 60, 120], [58, 48, 40]);
  const y    = useTransform(distance, [0, 60, 120], [-10, -5, 0]);

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap
                       px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white
                       bg-[#1F2937] border border-[#374151] shadow-xl"
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        style={{ width: size, height: size, y }}
        onClick={item.action}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileTap={{ scale: 0.9 }}
        className={`rounded-2xl flex items-center justify-center transition-shadow
                    duration-200 hover:shadow-lg relative overflow-hidden ${item.color}`}
        id={`dock-${item.id}`}
        aria-label={item.label}
      >
        {/* Ripple glow */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity
                        bg-white/10 rounded-2xl" />
        {item.icon}
      </motion.button>
    </div>
  );
}

/**
 * QuickActionDock
 * macOS-style magnifying dock fixed at bottom of the screen.
 * Icons magnify based on cursor proximity (Gaussian bell curve).
 */
export default function QuickActionDock(): React.ReactElement {
  const mouseX = useMotionValue(Infinity);
  const { workspaceId, projectId } = useParams<{
    workspaceId?: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();

  const dockItems: DockItem[] = [
    {
      id: 'new-task',
      icon: <Plus className="w-5 h-5 text-white" />,
      label: 'New Task',
      color: 'bg-gradient-to-br from-violet-600 to-violet-800',
      action: () => {
        if (workspaceId && projectId) {
          navigate(`/w/${workspaceId}/p/${projectId}/board`);
        }
      },
    },
    {
      id: 'code-review',
      icon: <Code2 className="w-5 h-5 text-white" />,
      label: 'Code Review',
      color: 'bg-gradient-to-br from-blue-600 to-blue-800',
      action: () => {
        if (workspaceId && projectId) {
          navigate(`/w/${workspaceId}/p/${projectId}/ai`);
        }
      },
    },
    {
      id: 'standup',
      icon: <Sun className="w-5 h-5 text-white" />,
      label: 'Standup',
      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
      action: () => {
        if (workspaceId && projectId) {
          navigate(`/w/${workspaceId}/p/${projectId}/ai`);
        }
      },
    },
    {
      id: 'wiki',
      icon: <BookOpen className="w-5 h-5 text-white" />,
      label: 'Wiki Plan',
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      action: () => {
        if (workspaceId && projectId) {
          navigate(`/w/${workspaceId}/p/${projectId}/ai`);
        }
      },
    },
    {
      id: 'search',
      icon: <Search className="w-5 h-5 text-white" />,
      label: 'Search (⌘K)',
      color: 'bg-gradient-to-br from-slate-600 to-slate-800',
      action: () => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'k', metaKey: true, ctrlKey: true, bubbles: true,
        }));
      },
    },
  ];

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 22 }}
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40
                 items-end gap-2 px-4 py-3 rounded-2xl
                 bg-[#111827]/85 backdrop-blur-xl
                 border border-[#1F2937]
                 shadow-[0_-4px_32px_rgba(0,0,0,0.4),0_4px_16px_rgba(0,0,0,0.3)]"
      role="toolbar"
      aria-label="Quick actions dock"
    >
      <Sparkles className="w-4 h-4 text-violet-400 mb-1 mr-1 opacity-70 animate-pulse" />
      {dockItems.map((item, index) => (
        <DockIcon key={item.id} item={item} mouseX={mouseX} index={index} />
      ))}
    </motion.div>
  );
}
