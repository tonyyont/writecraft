import { Node, mergeAttributes } from '@tiptap/core';

export interface RawMarkdownBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    rawMarkdownBlock: {
      /**
       * Set a raw markdown block
       */
      setRawMarkdownBlock: (content: string) => ReturnType;
    };
  }
}

export const RawMarkdownBlock = Node.create<RawMarkdownBlockOptions>({
  name: 'rawMarkdownBlock',

  // Properties as specified in the spec
  isolating: true,
  code: true,
  defining: true,

  group: 'block',
  content: 'text*',
  marks: '',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      content: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-content') || element.textContent || '',
        renderHTML: (attributes) => ({
          'data-content': attributes.content,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="raw-markdown-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'raw-markdown-block',
        class: 'raw-markdown-block',
      }),
      ['pre', { class: 'raw-markdown-content' }, 0],
    ];
  },

  addCommands() {
    return {
      setRawMarkdownBlock:
        (content: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content },
            content: [{ type: 'text', text: content }],
          });
        },
    };
  },
});

export default RawMarkdownBlock;
