# Phase 3: Chat UI + Sidecar History

## Objective
Build the chat panel UI with message history persisted to .writing.json sidecar.

## Dependencies
- Phase 2 complete

## Tasks

### 3.1 Chat Store
Create src/lib/stores/chat.ts:
- messages: ChatMessage[]
- isLoading: boolean
- addMessage(role, content): void
- clearHistory(): void
- loadFromSidecar(sidecar): void
- exportToSidecar(): ChatMessage[]

### 3.2 Chat Panel Component
Create src/lib/components/Chat/ChatPanel.svelte:
- Resizable panel (drag handle on left edge)
- Toggle with Cmd+L keyboard shortcut
- Message list with scroll-to-bottom
- Input area with textarea + send button
- Loading indicator during AI response

### 3.3 Message List Component
Create src/lib/components/Chat/MessageList.svelte:
- User messages (right-aligned, blue background)
- Assistant messages (left-aligned, gray background)
- Timestamp display
- Markdown rendering in messages

### 3.4 Input Area Component
Create src/lib/components/Chat/InputArea.svelte:
- Multiline textarea (auto-expand up to 6 lines)
- Send button (enabled when text present)
- Keyboard: Enter sends, Shift+Enter newline
- Disabled state during loading

### 3.5 Pinned Cards
At top of chat panel:
- Concept card (editable): title, coreArgument, audience, tone
- Outline card (editable): list of outline prompts
- Collapse/expand functionality

### 3.6 Sidecar Sync
- Save chat history to sidecar on each new message
- Load chat history from sidecar on document open
- Handle missing/corrupt history gracefully

## Acceptance Criteria
1. Chat panel renders and toggles with Cmd+L
2. Can send user message (appears in list)
3. Messages persist to .writing.json
4. Reopening document restores chat history
5. Concept/Outline cards display and are editable
6. Panel is resizable via drag
7. Keyboard shortcuts work (Enter sends, Shift+Enter newline)

## Completion Promise
When all acceptance criteria pass, output: <promise>PHASE_3_COMPLETE</promise>
