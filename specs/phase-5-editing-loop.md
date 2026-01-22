# Phase 5: Editing Loop + Patch Apply

## Objective
Implement the AI-powered editing workflow where Claude suggests changes and user can accept/reject them.

## Dependencies
- Phase 4 complete

## Tasks

### 5.1 Edit Suggestion Format
Define format for Claude's edit suggestions:
```typescript
interface EditSuggestion {
  id: string;
  type: 'replace' | 'insert' | 'delete';
  range: { start: number; end: number };
  originalText: string;
  suggestedText: string;
  reasoning: string;
}
```

### 5.2 Diff Display Component
Create src/lib/components/Editor/DiffView.svelte:
- Inline diff display (red strikethrough for deletions, green for additions)
- Accept/Reject buttons per suggestion
- Accept All / Reject All buttons
- Keyboard navigation (Tab between suggestions, Enter accept, Esc reject)

### 5.3 Patch Application
Create src/lib/utils/patch.ts:
- applyPatch(content, suggestion) -> string
- applyMultiplePatches(content, suggestions, acceptedIds) -> string
- calculateOffsets(suggestions, acceptedBefore) -> suggestions with adjusted offsets

### 5.4 Edit Prompt Engineering
Create src/lib/prompts/edit.ts:
- buildEditPrompt(documentContent, selectedText, userRequest, stage) -> string
- Prompt returns JSON with structured suggestions
- Include "no new claims" constraint
- Include self-check for factual additions

### 5.5 Edit Mode Integration
Update chat flow for editing:
- Detect "edit mode" intent (keywords: edit, revise, change, improve, fix)
- Send edit prompt to Claude
- Parse JSON response with edit suggestions
- Display suggestions in DiffView overlay
- On accept, apply patch and update document
- Save accepted/rejected decisions to sidecar editingHistory

### 5.6 Undo/Redo for Edits
- Each accepted batch = one undo step in Tiptap
- Cmd+Z reverts entire accepted batch
- Track edit history in sidecar for persistence

### 5.7 Context-Aware Scope
- If text selected: scope = selection
- Else if cursor in section: scope = current section (heading range)
- Else: scope = whole document
- Include scope context in edit prompt

## Acceptance Criteria
1. Claude returns properly formatted edit suggestions JSON
2. Suggestions display with inline diff highlighting
3. Accept applies change, updates document
4. Reject removes suggestion, keeps original
5. Accept All / Reject All work correctly
6. Undo (Cmd+Z) reverts accepted changes
7. Edit decisions persist to sidecar editingHistory
8. Scope detection works (selection > section > document)

## Completion Promise
When all acceptance criteria pass, output: <promise>PHASE_5_COMPLETE</promise>
