# Phase 2: Editor Foundation

## Objective
Integrate Tiptap with lossless Markdown round-tripping and implement RawMarkdownBlock for unsupported syntax.

## Dependencies
- Phase 1 complete

## Tasks

### 2.1 Tiptap Installation
- Install @tiptap/core, @tiptap/starter-kit, @tiptap/pm
- Install tiptap-markdown for markdown support
- Create src/lib/editor/tiptap-config.ts with extension configuration

### 2.2 Markdown Pipeline
Configure bidirectional markdown support:
- Import: parse Markdown -> ProseMirror doc
- Export: serialize ProseMirror doc -> Markdown
- Ensure common constructs round-trip correctly

### 2.3 RawMarkdownBlock Extension
Create custom node for unsupported markdown (tables, footnotes, etc.):
- Store original markdown source verbatim
- Render in Rich mode as a labeled card with preview
- Serialize back unchanged
- Properties: isolating=true, code=true

### 2.4 Supported Rich Constructs (MVP)
- Paragraphs, headings (H1-H6)
- Bold, italic, strikethrough
- Links
- Blockquotes
- Code (inline + fenced with language)
- Ordered/unordered lists
- Everything else wrapped in RawMarkdownBlock

### 2.5 Source Mode Toggle
- Toggle between Rich and Source (raw markdown) views
- Source mode: monospace textarea with full markdown
- On switch back to Rich: re-parse and rebuild doc

### 2.6 Editor Component
Create src/lib/components/Editor/Editor.svelte:
- Initialize Tiptap with markdown config
- Bind to document store
- Handle content changes
- Emit updates to parent

## Acceptance Criteria
1. Editor loads markdown and displays rich text
2. Saving document produces identical markdown (round-trip)
3. Tables in markdown display as RawMarkdownBlock, export unchanged
4. Standard markdown renders correctly (headings, lists, bold, italic, links)
5. Source mode toggle works
6. Round-trip tests pass for: simple paragraphs, nested lists, code blocks, mixed content

## Test Cases
- "# Heading\n\nParagraph with **bold** and *italic*."
- "- Item 1\n- Item 2\n  - Nested"
- "| Col1 | Col2 |\n|------|------|\n| A | B |" (preserves as raw)
- "1. First\n2. Second"
- "> Blockquote\n> continues"
- "```js\nconst x = 1;\n```"

## Completion Promise
When all acceptance criteria pass, output: <promise>PHASE_2_COMPLETE</promise>
