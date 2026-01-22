# Phase 1: Skeleton + Local Persistence

## Objective
Create a working Tauri + Svelte scaffold with file I/O capability for .md files and .writing.json sidecars.

## Tasks

### 1.1 Rust File Commands
Create these Tauri commands in src-tauri/src/commands/file.rs:
- `read_document(path: String) -> Result<String, Error>`
- `write_document(path: String, content: String) -> Result<(), Error>`
- `read_sidecar(path: String) -> Result<Sidecar, Error>`
- `write_sidecar(path: String, sidecar: Sidecar) -> Result<(), Error>`
- `file_exists(path: String) -> bool`

### 1.2 Sidecar Schema
Define TypeScript and Rust types for .writing.json:
```typescript
interface Sidecar {
  version: "1.0";
  documentId: string;
  createdAt: string;
  stage: "idea" | "concept" | "outline" | "draft" | "edits" | "polish";
  concept: {
    current: { title: string; coreArgument: string; audience: string; tone: string; updatedAt: string } | null;
    versions: ConceptSnapshot[];
  };
  outline: {
    current: OutlinePrompt[] | null;
    versions: OutlineSnapshot[];
  };
  conversation: {
    messages: ChatMessage[];
    summary: string;
  };
  editingHistory: EditHistoryEntry[];
  settings: {
    model: string;
  };
  meta: {
    appVersion: string;
    lastOpenedAt: string;
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
```

### 1.3 Frontend File Store
Create Svelte store in src/lib/stores/document.ts:
- Load/save .md file
- Load/save .writing.json sidecar
- Auto-create sidecar if missing
- Debounced auto-save (500ms)

### 1.4 Basic UI Shell
- Main layout with editor placeholder area
- File open dialog (Tauri dialog API)
- File save dialog
- Title bar showing filename
- Menu bar with File > Open, File > Save

## Acceptance Criteria
1. `npm run tauri dev` launches app without errors
2. Can open existing .md file via File > Open dialog
3. Opening foo.md auto-creates foo.writing.json if missing
4. Changes to content trigger debounced save
5. Sidecar persists documentId and stage across restarts
6. All TypeScript types compile without errors

## Completion Promise
When all acceptance criteria pass, output: <promise>PHASE_1_COMPLETE</promise>
