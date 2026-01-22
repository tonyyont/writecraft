# WriteCraft

A macOS native writing application that helps writers go from messy ideas to polished drafts through AI-guided structured writing. Built with Tauri, SvelteKit, and Rust.

## Overview

WriteCraft pairs you with an AI writing mentor (powered by Claude) that guides you through a five-stage writing workflow:

1. **Concept** - Discover and lock your core idea, argument, audience, and tone
2. **Outline** - Structure your piece into logical sections with prompts
3. **Draft** - Write section by section with light AI editing
4. **Edits** - Full-draft revision passes for coherence and style
5. **Polish** - Final touches and clean output

The app philosophy is "light touch, high standards" - preserving your voice while providing thoughtful guidance.

## Technology Stack

### Frontend
- **SvelteKit 2** with Svelte 5 (runes-based reactivity)
- **TipTap 3** rich text editor (ProseMirror-based)
- **TypeScript 5**
- **Vite 6**

### Backend
- **Tauri 2** desktop framework
- **Rust 2021 Edition**
- **Tokio** async runtime
- **Reqwest** HTTP client for Claude API
- **Keyring** for macOS Keychain integration

## Project Structure

```
FizzCC/
├── src/                          # Frontend (SvelteKit)
│   ├── routes/
│   │   └── +page.svelte          # Main application page
│   └── lib/
│       ├── components/           # Svelte components
│       │   ├── Chat/             # Chat panel (ChatPanel, MessageList, InputArea)
│       │   ├── Editor/           # Rich text editor
│       │   └── Settings/         # API key dialog
│       ├── stores/               # Reactive state management
│       │   ├── document.svelte.ts    # Document & file management
│       │   ├── chat.svelte.ts        # Chat history & messages
│       │   └── recents.svelte.ts     # Recent files tracking
│       ├── services/             # Business logic
│       │   └── claude.ts         # Claude API communication
│       ├── types/                # TypeScript interfaces
│       ├── tools/                # Agent tool definitions & executors
│       ├── prompts/              # Stage-specific system prompts
│       ├── editor/               # TipTap configuration
│       └── utils/                # Diff computation, conflict detection
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Application entry point
│   │   ├── lib.rs               # Library setup & menu configuration
│   │   ├── commands/            # Tauri IPC commands
│   │   │   ├── file.rs          # File I/O (atomic writes)
│   │   │   ├── keychain.rs      # API key storage
│   │   │   └── claude.rs        # Claude API client with streaming
│   │   └── models/
│   │       └── sidecar.rs       # Metadata schema definitions
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri configuration
│   └── capabilities/
│       └── default.json         # Security capabilities
├── specs/                        # Development specifications
└── static/                       # Static assets
```

## Core Features

### Document Management

Documents are stored as Markdown files with companion `.writing.json` sidecar files that contain:

- Document stage and metadata
- Concept details (title, core argument, audience, tone)
- Outline structure with section prompts
- Full conversation history
- Edit history for tracked changes
- Settings (model selection)

The sidecar approach keeps your prose clean while preserving all context.

### AI Tool System

Claude can interact with your document through these tools:

| Tool | Purpose |
|------|---------|
| `read_document` | Get current content and metadata |
| `update_document` | Modify content (replace, insert, append) |
| `update_concept` | Lock the concept (title, argument, audience, tone) |
| `update_outline` | Create structured outline sections |
| `update_stage` | Progress through workflow stages |
| `add_edit_suggestion` | Propose specific tracked changes |

### Rich Text Editor

- Dual mode: source (raw markdown) and preview (rendered)
- Full markdown support: headings, lists, bold, italic, code, tables
- Debounced auto-save (500ms)
- External change detection
- Recent files quick access

### Chat Interface

- Streaming responses displayed in real-time
- Tool use indicators showing AI actions
- Concept and outline cards for quick reference
- Multi-turn agentic loops with automatic tool execution

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- macOS (primary platform for v0.1)

### Installation

```bash
# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Configuration

On first launch, you'll be prompted to enter your Claude API key. The key is stored securely in the macOS Keychain.

To get an API key:
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account and generate an API key
3. Enter the key in WriteCraft's settings (Cmd+,)

## Development

### Scripts

```bash
npm run dev          # Start Vite dev server (frontend only)
npm run build        # Build frontend for production
npm run preview      # Preview production build
npm run check        # Type-check with svelte-check
npm run tauri dev    # Full Tauri development mode
npm run tauri build  # Build production app bundle
```

### Architecture Notes

**Frontend-Backend Communication**

All communication uses Tauri's IPC via `invoke()`:

```typescript
// Frontend
const content = await invoke<string>('read_document', { path: '/path/to/file.md' });

// Backend (Rust)
#[tauri::command]
async fn read_document(path: String) -> Result<String, String> {
    // ...
}
```

**Streaming API Responses**

Claude responses stream via Tauri events:

```typescript
// Listen for streaming chunks
const unlisten = await listen<{ chunk: string; done: boolean }>('claude-stream-chunk', (event) => {
  // Append chunk to message
});
```

**State Management**

Uses Svelte 5 runes for fine-grained reactivity:

```typescript
// In stores
let content = $state('');
let sidecar = $state<Sidecar | null>(null);

// Reactive effects
$effect(() => {
  if (content) saveDocument();
});
```

### Adding a New Tool

1. Define the tool schema in `src/lib/tools/definitions.ts`
2. Add the executor in `src/lib/tools/executor.ts`
3. Update system prompts if needed in `src/lib/prompts/system.ts`

### Adding a Rust Command

1. Create or modify a module in `src-tauri/src/commands/`
2. Add the `#[tauri::command]` attribute
3. Register in `invoke_handler!()` in `lib.rs`

## File Format

### Document Sidecar Schema

```typescript
interface Sidecar {
  version: '1.0';
  documentId: string;          // UUID
  createdAt: string;           // ISO timestamp
  stage: 'concept' | 'outline' | 'draft' | 'edits' | 'polish';
  concept: {
    current: { title, coreArgument, audience, tone } | null;
    versions: ConceptSnapshot[];
  };
  outline: {
    current: OutlineSection[] | null;
    versions: OutlineSnapshot[];
  };
  conversation: {
    messages: Message[];
    lastUpdated: string;
  };
  editingHistory: EditHistoryEntry[];
  settings: { model: string };
  meta: { version: string; lastOpened: string };
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+N | New document |
| Cmd+O | Open document |
| Cmd+S | Save document |
| Cmd+Shift+S | Save as |
| Cmd+, | Settings |

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
- [Tauri extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Security

- API keys stored in macOS Keychain (with in-memory fallback)
- Atomic file writes prevent data corruption
- No sensitive data in URLs or logs

## License

MIT

## Roadmap

- [ ] Multi-document support
- [ ] Advanced edit history UI
- [ ] Conflict resolution interface
- [ ] Windows/Linux builds
- [ ] Cloud sync (future consideration)
