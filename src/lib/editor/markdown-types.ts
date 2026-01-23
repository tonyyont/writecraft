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

// Helper function to get markdown from editor storage with proper typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMarkdownFromEditor(editor: any): string {
  // Use type assertion since tiptap-markdown adds storage.markdown dynamically
  const storage = editor?.storage as { markdown?: MarkdownStorage } | undefined;
  if (storage?.markdown?.getMarkdown) {
    return storage.markdown.getMarkdown();
  }
  return '';
}
