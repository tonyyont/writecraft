// Type declarations for tiptap-markdown storage
// This is needed because tiptap-markdown doesn't provide TypeScript types

import type { Editor as _Editor } from '@tiptap/core';

export interface MarkdownStorage {
  getMarkdown: () => string;
  parser: {
    parse: (text: string, options?: Record<string, unknown>) => unknown;
  };
  serializer: {
    serialize: (content: unknown) => string;
  };
  options: {
    html: boolean;
    bulletListMarker: string;
  };
}

/**
 * Post-process markdown to fix escaped footnote syntax.
 * tiptap-markdown escapes brackets that it doesn't recognize as links,
 * which breaks footnote references like [^1] → \[^1\]
 */
function unescapeFootnotes(markdown: string): string {
  // Unescape footnote references: \[^something\] → [^something]
  // Handles both inline refs [^1] and definition blocks [^1]:
  return markdown
    .replace(/\\\[\^([^\]]+)\\\]/g, '[^$1]') // Inline footnote references
    .replace(/\\\[\^([^\]]+)\]:/g, '[^$1]:'); // Footnote definitions (only opening bracket escaped)
}

// Helper function to get markdown from editor storage with proper typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMarkdownFromEditor(editor: any): string {
  // Use type assertion since tiptap-markdown adds storage.markdown dynamically
  const storage = editor?.storage as { markdown?: MarkdownStorage } | undefined;
  if (storage?.markdown?.getMarkdown) {
    const markdown = storage.markdown.getMarkdown();
    return unescapeFootnotes(markdown);
  }
  return '';
}
