import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollaborativePresenceProps {
  users: Array<{
    userId: string;
    name?: string;
    avatar?: string;
    projectId?: string;
    context?: string;
  }>;
  max?: number;
  className?: string;
}

const USER_COLORS = [
  '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16',
];

function getColor(userId: string): string {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

/**
 * CollaborativePresence
 * Animated avatar stack. On hover, avatars fan out with spring physics.
 * Users slide in/out with AnimatePresence as they join/leave.
 */
export default function CollaborativePresence({
  users,
  max = 5,
  className,
}: CollaborativePresenceProps): React.ReactElement | null {
  const [expanded, setExpanded] = React.useState(false);
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  if (users.length === 0) return null;

  return (
    <div
      className={`flex items-center ${className ?? ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      role="group"
      aria-label={`${users.length} online`}
    >
      <div className="flex items-center relative">
        <AnimatePresence mode="popLayout">
          {visible.map((u, i) => {
            const color = getColor(u.userId);
            const label = (u.name ?? u.userId).charAt(0).toUpperCase();
            const offset = expanded ? i * 26 : i * 10;

            return (
              <motion.div
                key={u.userId}
                layout
                initial={{ opacity: 0, scale: 0.6, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: offset }}
                exit={{ opacity: 0, scale: 0.6, x: -8 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="absolute group"
                style={{ zIndex: visible.length - i }}
                title={`${u.name ?? 'User'} — ${u.context ?? 'online'}`}
              >
                {u.avatar ? (
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-7 h-7 rounded-full object-cover ring-2"
                    style={{ ringColor: color, boxShadow: `0 0 0 2px ${color}` }}
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-[#0B1020]"
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </div>
                )}

                {/* Online dot */}
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400
                             ring-1 ring-[#0B1020]"
                />

                {/* Tooltip */}
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap
                               px-2 py-1 rounded-lg text-[10px] font-semibold text-white
                               bg-[#1F2937] border border-[#374151] shadow-lg pointer-events-none"
                  >
                    {u.name ?? 'User'}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Overflow badge */}
        {overflow > 0 && (
          <motion.div
            animate={{ x: expanded ? visible.length * 26 : visible.length * 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="absolute w-7 h-7 rounded-full bg-[#1F2937] border border-[#374151]
                       flex items-center justify-center text-[10px] font-bold text-[#9CA3AF]"
            style={{ zIndex: 0 }}
          >
            +{overflow}
          </motion.div>
        )}
      </div>

      {/* Spacer for the stack width */}
      <div
        style={{
          width: expanded
            ? visible.length * 26 + (overflow > 0 ? 34 : 0)
            : Math.min(visible.length, 4) * 10 + 28,
          height: 28,
          transition: 'width 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      />
    </div>
  );
}
