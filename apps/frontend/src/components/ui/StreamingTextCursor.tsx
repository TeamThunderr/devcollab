import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamingTextCursorProps {
  text: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  className?: string;
  wordDelay?: number;
}

/**
 * StreamingTextCursor
 * Premium AI streaming text animation:
 *  • "Thinking" state: 3-dot pulse
 *  • Streaming: word-by-word reveal + blinking cursor
 *  • Done: cursor fades out
 */
export default function StreamingTextCursor({
  text,
  isStreaming = false,
  isThinking = false,
  className,
  wordDelay = 20,
}: StreamingTextCursorProps): React.ReactElement {
  const words = text.split(' ');

  if (isThinking) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[#9CA3AF]">
        <span className="text-sm">AI is thinking</span>
        <span className="inline-flex gap-0.5 ml-1">
          <span className="ai-thinking-dot" />
          <span className="ai-thinking-dot" />
          <span className="ai-thinking-dot" />
        </span>
      </span>
    );
  }

  return (
    <span className={className}>
      <AnimatePresence mode="wait">
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * (wordDelay / 1000), duration: 0.15 }}
            className="inline"
          >
            {word}{' '}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Blinking cursor while streaming */}
      <AnimatePresence>
        {isStreaming && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ai-cursor"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </span>
  );
}
