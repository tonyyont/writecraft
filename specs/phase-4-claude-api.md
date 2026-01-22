# Phase 4: Claude Integration

## Objective
Implement secure API key storage in macOS Keychain and Claude API communication via Rust backend.

## Dependencies
- Phase 3 complete

## Tasks

### 4.1 Keychain Plugin Setup
Add keyring capability to Tauri:
- Use tauri-plugin-keyring or security-framework crate
- Store key under service "writecraft", account "claude-api-key"

### 4.2 Keychain Commands
Create src-tauri/src/commands/keychain.rs:
- get_api_key() -> Result<Option<String>, Error>
- set_api_key(key: String) -> Result<(), Error>
- delete_api_key() -> Result<(), Error>
- test_api_key(key: String) -> Result<bool, Error>

### 4.3 Claude API Client
Create src-tauri/src/commands/claude.rs:
- Send messages to Claude API (streaming)
- Use Tauri Channels for streaming chunks to frontend
- Handle rate limits and errors gracefully
- Support claude-sonnet-4-20250514 model

### 4.4 Settings UI
Create src/lib/components/Settings/ApiKeyDialog.svelte:
- Modal dialog for API key entry
- Masked input field (show/hide toggle)
- Save/Cancel buttons
- "Test connection" button with feedback
- Clear key option

### 4.5 Frontend Claude Service
Create src/lib/services/claude.ts:
- sendMessage(messages, systemPrompt, onChunk) -> Promise<string>
- Use Tauri Channel for streaming
- Handle errors and display to user

### 4.6 System Prompts
Create src/lib/prompts/system.ts with stage-specific prompts:
- idea: Brainstorming, exploring possibilities
- concept: Clarification, structuring the core argument
- outline: Organization, flow, section breakdown
- draft: Writing assistance, expanding sections
- edits: Revision suggestions, tightening prose
- polish: Final touches, consistency, formatting

### 4.7 Chat Integration
- Connect chat input to Claude API
- Stream responses to chat panel
- Show loading state during generation
- Handle errors gracefully

## Acceptance Criteria
1. API key can be saved to macOS Keychain
2. API key retrieval works (masked display in settings)
3. API key can be deleted
4. "Test connection" validates key with Claude API
5. Claude API call succeeds with valid key
6. Streaming response displays incrementally in chat
7. Error handling for invalid key, network errors, rate limits
8. System prompt changes based on document stage

## Completion Promise
When all acceptance criteria pass, output: <promise>PHASE_4_COMPLETE</promise>
