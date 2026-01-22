import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { RawMarkdownBlock } from './raw-markdown-block';

// Patterns for markdown that should be preserved as RawMarkdownBlock
const UNSUPPORTED_PATTERNS = [
  // Tables: look for pipe character at start of line with multiple columns
  /^\|[^\n]+\|[\s\S]*?\n\|[-:\s|]+\|/m,
  // Footnotes: [^1] style references
  /\[\^[\w-]+\]/,
  // Definition lists: term followed by : definition
  /^[^\n]+\n:\s+[^\n]+/m,
];

/**
 * Detect if markdown contains unsupported syntax that should be
 * wrapped in a RawMarkdownBlock
 */
export function containsUnsupportedMarkdown(markdown: string): boolean {
  return UNSUPPORTED_PATTERNS.some((pattern) => pattern.test(markdown));
}

/**
 * Parse markdown and identify unsupported blocks.
 * Returns an array of segments, each marked as either supported or raw.
 */
export function parseMarkdownSegments(
  markdown: string
): Array<{ type: 'supported' | 'raw'; content: string }> {
  const segments: Array<{ type: 'supported' | 'raw'; content: string }> = [];

  // Split by table patterns (most common unsupported syntax)
  const tableRegex = /^(\|[^\n]+\|[\s\S]*?\n\|[-:\s|]+\|[\s\S]*?)(?=\n\n|\n$|$)/gm;

  let lastIndex = 0;
  let match;

  while ((match = tableRegex.exec(markdown)) !== null) {
    // Add any content before the table
    if (match.index > lastIndex) {
      const before = markdown.slice(lastIndex, match.index).trim();
      if (before) {
        segments.push({ type: 'supported', content: before });
      }
    }

    // Extract the full table including all rows
    const tableStart = match.index;
    let tableEnd = match.index + match[0].length;

    // Extend to capture all table rows
    const remaining = markdown.slice(tableEnd);
    const tableRowMatch = remaining.match(/^(\n\|[^\n]+\|)+/);
    if (tableRowMatch) {
      tableEnd += tableRowMatch[0].length;
    }

    segments.push({ type: 'raw', content: markdown.slice(tableStart, tableEnd) });
    lastIndex = tableEnd;
  }

  // Add any remaining content
  if (lastIndex < markdown.length) {
    const remaining = markdown.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: 'supported', content: remaining });
    }
  }

  // If no tables found, return the whole document as supported
  if (segments.length === 0 && markdown.trim()) {
    segments.push({ type: 'supported', content: markdown });
  }

  return segments;
}

/**
 * Get extensions for Tiptap editor with markdown support
 */
export function getEditorExtensions() {
  return [
    StarterKit.configure({
      // Configure heading levels
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      // Enable code blocks with language support
      codeBlock: {
        languageClassPrefix: 'language-',
      },
    }),

    // Markdown parsing/serialization
    Markdown.configure({
      html: false, // Don't allow HTML
      tightLists: true,
      tightListClass: 'tight',
      bulletListMarker: '-',
      linkify: false,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),

    // Custom extension for unsupported markdown
    RawMarkdownBlock,
  ];
}

/**
 * Configuration options for the editor
 */
export const editorConfig = {
  // Debounce time for content updates (ms)
  debounceMs: 300,

  // Default content when no document is loaded
  defaultContent: '',

  // Editor placeholder text
  placeholder: 'Start writing...',
};
