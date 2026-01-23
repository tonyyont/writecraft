/**
 * Agent orchestration service
 *
 * Handles the agentic loop for Claude interactions:
 * - Builds context-aware system prompts
 * - Manages the tool use cycle
 * - Coordinates between chat, document, and API layers
 */

import { chatStore } from '$lib/stores/chat.svelte';
import { documentStore } from '$lib/stores/document.svelte';
import { apiKeyStore } from '$lib/stores/apiKey.svelte';
import { authStore } from '$lib/stores/auth.svelte';
import { sendMessageWithTools, type ToolMessageCallbacks } from '$lib/services/claude';
import { buildEnrichedSystemPrompt, type PromptContext } from '$lib/prompts/system';
import { ALL_TOOLS } from '$lib/tools/definitions';
import { executeToolCall } from '$lib/tools/executor';
import type { Message, ContentBlock, ToolUseEvent } from '$lib/types/tools';
import { computeContentDiff, computeOutlineDiff } from '$lib/utils/diff';
import { detectOutlineDraftConflicts, formatConflictsForPrompt } from '$lib/utils/conflicts';
import { countWords } from '$lib/utils/text';

/** Maximum number of tool use iterations before stopping */
const MAX_ITERATIONS = 10;

/** Callbacks for agent events */
export interface AgentCallbacks {
  /** Called when an error occurs */
  onError: (message: string, isApiKeyError: boolean) => void;
}

/**
 * Build the enriched system prompt with current document context
 */
export function buildSystemPrompt(): string {
  const stage = documentStore.sidecar?.stage ?? 'concept';
  const concept = chatStore.getConcept();
  const outline = chatStore.getOutline();
  const content = documentStore.content;

  const context: PromptContext = {
    stage,
    concept,
    outline,
    documentPreview: content,
    wordCount: countWords(content),
  };

  // Check for changes since last seen (change tracking)
  const changes = documentStore.getChangesSinceLastSeen();
  if (changes) {
    const userChanges: PromptContext['userChanges'] = {};

    if (changes.contentChanged && changes.previousContent !== null) {
      const contentDiff = computeContentDiff(changes.previousContent, changes.currentContent);
      if (contentDiff.hasChanges) {
        userChanges.contentDiff = {
          summary: contentDiff.summary,
          diffText: contentDiff.diffText,
        };
      }
    }

    if (changes.outlineChanged) {
      const outlineDiff = computeOutlineDiff(changes.previousOutline, changes.currentOutline);
      if (outlineDiff.hasChanges) {
        userChanges.outlineDiff = {
          summary: outlineDiff.summary,
        };

        // Detect conflicts if outline changed and there's content
        if (changes.previousOutline && changes.currentOutline && content.trim()) {
          const conflictReport = detectOutlineDraftConflicts(
            changes.previousOutline,
            changes.currentOutline,
            content
          );
          if (conflictReport.hasConflicts) {
            context.conflicts = {
              summary: conflictReport.summary,
              details: formatConflictsForPrompt(conflictReport),
            };
          }
        }
      }
    }

    if (changes.stageChanged && changes.previousStage && changes.currentStage) {
      userChanges.stageChange = {
        from: changes.previousStage,
        to: changes.currentStage,
      };
    }

    // Only add userChanges if there are actual changes
    if (Object.keys(userChanges).length > 0) {
      context.userChanges = userChanges;
    }
  }

  return buildEnrichedSystemPrompt(context);
}

/**
 * Convert chat messages to API format, filtering empty messages
 * @param excludeId - Optional message ID to exclude (e.g., placeholder message)
 */
export function convertMessagesToApiFormat(excludeId?: string): Message[] {
  return chatStore.messages
    .filter((msg) => {
      // Exclude the specified ID (current placeholder message)
      if (msg.id === excludeId) return false;

      // Filter out messages with empty content
      if (typeof msg.content === 'string') {
        return msg.content.trim() !== '';
      }

      // For ContentBlock[], check if it has any blocks with actual content
      if (Array.isArray(msg.content)) {
        return (
          msg.content.length > 0 &&
          msg.content.some((block) => {
            if (block.type === 'text') return block.text.trim() !== '';
            if (block.type === 'tool_use') return true;
            if (block.type === 'tool_result') return true;
            return false;
          })
        );
      }
      return false;
    })
    .map((msg) => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      return { role: msg.role, content: msg.content };
    });
}

/**
 * Build content blocks for assistant message
 */
export function buildAssistantContent(text: string, toolUses: ToolUseEvent[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  if (text.trim()) {
    blocks.push({ type: 'text', text });
  }

  for (const toolUse of toolUses) {
    blocks.push({
      type: 'tool_use',
      id: toolUse.id,
      name: toolUse.name,
      input: toolUse.input,
    });
  }

  return blocks;
}

/**
 * Check if an error message indicates an API key problem
 */
export function isApiKeyRelatedError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes('no api key') ||
    lowerMessage.includes('invalid api key') ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('401')
  );
}

/**
 * Run the agent orchestration loop
 *
 * This manages the cycle of:
 * 1. Sending messages to Claude
 * 2. Executing any tool calls
 * 3. Continuing until Claude stops using tools
 */
export async function runAgentLoop(callbacks: AgentCallbacks): Promise<void> {
  chatStore.setLoading(true);

  let iteration = 0;
  let currentAssistantMessageId: string | null = null;

  try {
    while (iteration < MAX_ITERATIONS) {
      iteration++;

      // Build the system prompt with current context
      const systemPrompt = buildSystemPrompt();

      // Get messages to send, excluding any placeholder assistant message
      const messagesToSend = convertMessagesToApiFormat(currentAssistantMessageId ?? undefined);

      // Create streaming message for text content
      const currentAssistantMessage = chatStore.addMessage('assistant', '');
      currentAssistantMessageId = currentAssistantMessage.id;
      chatStore.setStreamingMessageId(currentAssistantMessageId);
      let accumulatedText = '';

      // Callbacks for streaming
      const streamCallbacks: ToolMessageCallbacks = {
        onChunk: (chunk: string) => {
          accumulatedText += chunk;
          chatStore.updateMessage(currentAssistantMessageId!, accumulatedText);
        },
        onError: (error: string) => {
          callbacks.onError(error, isApiKeyRelatedError(error));
        },
      };

      // Send to Claude with tools
      const response = await sendMessageWithTools(
        messagesToSend,
        systemPrompt,
        ALL_TOOLS,
        streamCallbacks
      );

      // Increment usage count after successful API call
      authStore.incrementUsage();

      // Update the message with final content (text and/or tool uses)
      if (response.toolUses.length > 0) {
        chatStore.updateMessage(
          currentAssistantMessageId,
          buildAssistantContent(response.textContent, response.toolUses)
        );
      } else if (response.textContent !== accumulatedText) {
        chatStore.updateMessage(currentAssistantMessageId, response.textContent);
      }

      // Clear streaming state for this message
      chatStore.setStreamingMessageId(null);

      // If no tool uses, or stop reason is end_turn, we're done
      if (response.toolUses.length === 0 || response.stopReason === 'end_turn') {
        break;
      }

      // Execute each tool and collect results
      const toolResults = await Promise.all(
        response.toolUses.map((toolUse) => executeToolCall(toolUse))
      );

      // Add tool results as a user message
      chatStore.addToolResults(toolResults);

      // Reset for next iteration
      currentAssistantMessageId = null;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isKeyError = isApiKeyRelatedError(message);

    callbacks.onError(message, isKeyError);

    // Update the API key store if key is invalid
    if (isKeyError) {
      apiKeyStore.markInvalid(message);
    }

    // Remove empty assistant message if it exists
    if (currentAssistantMessageId) {
      const lastMessage = chatStore.messages.find((m) => m.id === currentAssistantMessageId);
      if (lastMessage) {
        const content = lastMessage.content;
        const isEmpty = typeof content === 'string' ? content === '' : content.length === 0;
        if (isEmpty) {
          chatStore.removeMessage(currentAssistantMessageId);
        }
      }
    }
  } finally {
    chatStore.setLoading(false);
    // Record what Claude has now seen for change tracking
    documentStore.snapshotLastSeen();
    // Refresh usage count from server to stay in sync
    authStore.fetchSubscriptionInfo();
  }
}

/**
 * Send a user message and run the agent loop
 */
export async function sendMessage(userContent: string, callbacks: AgentCallbacks): Promise<void> {
  // Add the user's message
  chatStore.addMessage('user', userContent);

  // Run the agent loop
  await runAgentLoop(callbacks);
}
