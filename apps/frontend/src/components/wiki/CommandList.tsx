import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="bg-[#252526] border border-[#3c3c3c] rounded-md shadow-xl overflow-hidden py-1 w-48 text-sm text-gray-200">
      {props.items.length ? (
        props.items.map((item: any, index: number) => (
          <button
            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${
              index === selectedIndex ? 'bg-blue-600/30 text-white' : 'hover:bg-[#333]'
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            <span className="opacity-70 text-xs w-4">{item.icon}</span>
            {item.title}
          </button>
        ))
      ) : (
        <div className="px-3 py-1.5 text-gray-500 italic">No result</div>
      )}
    </div>
  );
});
