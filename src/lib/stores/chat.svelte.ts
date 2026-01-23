/**
 * Chat store for managing conversation state with the AI assistant.
 *
 * This store handles:
 * - Chat messages (user and assistant)
 * - Tool use/result message flows
 * - Streaming message state
 * - Synchronization with document sidecar
 *
 * Messages support both simple text and complex content blocks
 * (tool_use, tool_result) for the agentic interaction pattern.
 *
 * @example
 * ```typescript
 * import { chatStore } from '$lib/stores/chat.svelte';
 *
 * // Add a user message
 * chatStore.addMessage('user', 'Help me improve this paragraph');
 *
 * // Check current messages
 * console.log(chatStore.messages.length);
 *
 * // Update streaming assistant message
 * chatStore.updateMessage(messageId, 'Updated content...');
 * ```
 *
 * @module stores/chat
 */

import type {
  ChatMessage,
  Sidecar,
  ConceptSnapshot,
  OutlinePrompt,
  MessageContent,
} from '$lib/types/sidecar';
import type { ContentBlock, ToolResult, ToolUseEvent } from '$lib/types/tools';
import { documentStore } from './document.svelte';

// Chat state
let messages = $state<ChatMessage[]>([]);
let isLoading = $state(false);
let streamingMessageId = $state<string | null>(null);

// Generate unique ID for messages
function generateId(): string {
  return crypto.randomUUID();
}

// Add a new message to the chat
function addMessage(role: 'user' | 'assistant', content: MessageContent): ChatMessage {
  const message: ChatMessage = {
    id: generateId(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };

  messages = [...messages, message];

  // Sync to sidecar
  syncToSidecar();

  return message;
}

// Update an existing message's content (used for streaming)
function updateMessage(id: string, content: MessageContent): void {
  messages = messages.map((msg) => (msg.id === id ? { ...msg, content } : msg));

  // Sync to sidecar after update
  syncToSidecar();
}

// Remove a message by ID
function removeMessage(id: string): void {
  messages = messages.filter((msg) => msg.id !== id);
  syncToSidecar();
}

// Add tool result as a user message with tool_result content blocks
function addToolResults(results: ToolResult[]): ChatMessage {
  const blocks: ContentBlock[] = results.map((result) => ({
    type: 'tool_result' as const,
    tool_use_id: result.tool_use_id,
    content: result.content,
    is_error: result.is_error,
  }));

  return addMessage('user', blocks);
}

// Add an assistant message with tool use blocks
function addAssistantWithToolUses(textContent: string, toolUses: ToolUseEvent[]): ChatMessage {
  const blocks: ContentBlock[] = [];

  // Add text block if there's text content
  if (textContent.trim()) {
    blocks.push({
      type: 'text' as const,
      text: textContent,
    });
  }

  // Add tool use blocks
  for (const toolUse of toolUses) {
    blocks.push({
      type: 'tool_use' as const,
      id: toolUse.id,
      name: toolUse.name,
      input: toolUse.input,
    });
  }

  return addMessage('assistant', blocks);
}

// Clear all chat history
function clearHistory(): void {
  messages = [];
  syncToSidecar();
}

// Load messages from sidecar data
function loadFromSidecar(sidecar: Sidecar | null): void {
  if (sidecar?.conversation?.messages) {
    messages = [...sidecar.conversation.messages];
  } else {
    messages = [];
  }
}

// Export current messages for sidecar
function exportToSidecar(): ChatMessage[] {
  return [...messages];
}

// Sync messages to document store's sidecar
function syncToSidecar(): void {
  const currentSidecar = documentStore.sidecar;
  if (currentSidecar) {
    documentStore.updateSidecar({
      conversation: {
        messages: exportToSidecar(),
        summary: currentSidecar.conversation.summary,
      },
    });
  }
}

// Set loading state
function setLoading(loading: boolean): void {
  isLoading = loading;
  if (!loading) {
    streamingMessageId = null;
  }
}

// Set the currently streaming message
function setStreamingMessageId(id: string | null): void {
  streamingMessageId = id;
}

// Get concept from sidecar
function getConcept(): ConceptSnapshot | null {
  return documentStore.sidecar?.concept?.current ?? null;
}

// Update concept in sidecar
function updateConcept(concept: ConceptSnapshot): void {
  const currentSidecar = documentStore.sidecar;
  if (currentSidecar) {
    const updatedConcept = {
      ...concept,
      updatedAt: new Date().toISOString(),
    };
    documentStore.updateSidecar({
      concept: {
        current: updatedConcept,
        versions: [...currentSidecar.concept.versions, updatedConcept],
      },
    });
  }
}

// Get outline from sidecar
function getOutline(): OutlinePrompt[] | null {
  return documentStore.sidecar?.outline?.current ?? null;
}

// Update outline in sidecar
function updateOutline(prompts: OutlinePrompt[]): void {
  const currentSidecar = documentStore.sidecar;
  if (currentSidecar) {
    const snapshot = {
      prompts,
      createdAt: new Date().toISOString(),
    };
    documentStore.updateSidecar({
      outline: {
        current: prompts,
        versions: [...currentSidecar.outline.versions, snapshot],
      },
    });
  }
}

// Export reactive getters and functions
export const chatStore = {
  get messages() {
    return messages;
  },
  get isLoading() {
    return isLoading;
  },
  get streamingMessageId() {
    return streamingMessageId;
  },

  addMessage,
  updateMessage,
  removeMessage,
  addToolResults,
  addAssistantWithToolUses,
  clearHistory,
  loadFromSidecar,
  exportToSidecar,
  setLoading,
  setStreamingMessageId,
  getConcept,
  updateConcept,
  getOutline,
  updateOutline,
};
