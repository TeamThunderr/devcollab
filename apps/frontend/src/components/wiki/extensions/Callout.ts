import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout',

  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => {
          return {
            'data-type': attributes.type,
            class: `callout callout-${attributes.type}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'p-4 rounded-lg my-4 flex gap-3 border items-start callout' }), ['div', { class: 'callout-icon mt-0.5' }], ['div', { class: 'callout-content flex-1' }, 0]];
  },

  addCommands() {
    return {
      setCallout: (options: { type: 'info' | 'warning' | 'success' }) => ({ commands }) => {
        return commands.setNode(this.name, options);
      },
      toggleCallout: (options: { type: 'info' | 'warning' | 'success' }) => ({ commands }) => {
        return commands.toggleNode(this.name, 'paragraph', options);
      },
    };
  },
});
