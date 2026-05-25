import React from 'react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✅', '👀', '🎉', '💯', '🚀', '👎'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps): React.ReactElement {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-2 shadow-xl grid grid-cols-6 gap-1">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="w-8 h-8 text-lg hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
