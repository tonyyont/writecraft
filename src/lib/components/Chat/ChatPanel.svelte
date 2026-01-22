<script lang="ts">
  import { emit } from '@tauri-apps/api/event';
  import { chatStore } from '$lib/stores/chat.svelte';
  import { documentStore } from '$lib/stores/document.svelte';
  import { apiKeyStore } from '$lib/stores/apiKey.svelte';
  import { sendMessageWithTools, type ToolMessageCallbacks } from '$lib/services/claude';
  import { buildEnrichedSystemPrompt, type PromptContext } from '$lib/prompts/system';
  import { ALL_TOOLS } from '$lib/tools/definitions';
  import { executeToolCall } from '$lib/tools/executor';
  import type { Message, ContentBlock, ToolUseEvent } from '$lib/types/tools';
  import { computeContentDiff, computeOutlineDiff } from '$lib/utils/diff';
  import { detectOutlineDraftConflicts, formatConflictsForPrompt } from '$lib/utils/conflicts';
  import MessageList from './MessageList.svelte';
  import InputArea from './InputArea.svelte';

  const MAX_ITERATIONS = 10;

  // Panel visibility state
  let isOpen = $state(true);

  // Error state for displaying API errors
  let errorMessage = $state<string | null>(null);
  // Track if error is related to missing/invalid API key
  let isApiKeyError = $state(false);

  // Open settings dialog (emit event that MenuBar listens to)
  async function openSettings() {
    await emit('menu-event', 'settings');
  }

  // Panel width state for resizing
  let panelWidth = $state(360);
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 600;

  // Resize state
  let isResizing = $state(false);
  let startX = $state(0);
  let startWidth = $state(0);

  // Load chat from sidecar when document changes
  $effect(() => {
    const sidecar = documentStore.sidecar;
    if (sidecar) {
      chatStore.loadFromSidecar(sidecar);
    }
  });

  // Keyboard shortcut handler
  function handleKeydown(e: KeyboardEvent) {
    // Cmd+L (Mac) or Ctrl+L (Windows/Linux) toggles panel
    if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
      e.preventDefault();
      isOpen = !isOpen;
    }
  }

  // Resize handlers
  function startResize(e: MouseEvent) {
    isResizing = true;
    startX = e.clientX;
    startWidth = panelWidth;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing) return;

    // Panel is on the right, so dragging left increases width
    const delta = startX - e.clientX;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
    panelWidth = newWidth;
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  // Build the enriched system prompt with context
  function buildSystemPrompt(): string {
    const stage = documentStore.sidecar?.stage ?? 'concept';
    const concept = chatStore.getConcept();
    const outline = chatStore.getOutline();
    const content = documentStore.content;
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

    const context: PromptContext = {
      stage,
      concept,
      outline,
      documentPreview: content,
      wordCount
    };

    // Check for changes since last seen (change tracking)
    const changes = documentStore.getChangesSinceLastSeen();
    if (changes) {
      // Compute diffs if there were changes
      const userChanges: PromptContext['userChanges'] = {};

      if (changes.contentChanged && changes.previousContent !== null) {
        const contentDiff = computeContentDiff(changes.previousContent, changes.currentContent);
        if (contentDiff.hasChanges) {
          userChanges.contentDiff = {
            summary: contentDiff.summary,
            diffText: contentDiff.diffText
          };
        }
      }

      if (changes.outlineChanged) {
        const outlineDiff = computeOutlineDiff(changes.previousOutline, changes.currentOutline);
        if (outlineDiff.hasChanges) {
          userChanges.outlineDiff = {
            summary: outlineDiff.summary
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
                details: formatConflictsForPrompt(conflictReport)
              };
            }
          }
        }
      }

      if (changes.stageChanged && changes.previousStage && changes.currentStage) {
        userChanges.stageChange = {
          from: changes.previousStage,
          to: changes.currentStage
        };
      }

      // Only add userChanges if there are actual changes
      if (Object.keys(userChanges).length > 0) {
        context.userChanges = userChanges;
      }
    }

    return buildEnrichedSystemPrompt(context);
  }

  // Convert chat messages to API format
  function convertMessagesToApiFormat(excludeId?: string): Message[] {
    return chatStore.messages
      .filter(msg => {
        // Exclude the specified ID (current placeholder message)
        if (msg.id === excludeId) return false;

        // Filter out messages with empty content
        // Claude API requires all messages to have non-empty content
        // (except for the optional final assistant message, but we handle that separately)
        if (typeof msg.content === 'string') {
          return msg.content.trim() !== '';
        }
        // For ContentBlock[], check if it has any blocks with actual content
        if (Array.isArray(msg.content)) {
          return msg.content.length > 0 && msg.content.some(block => {
            if (block.type === 'text') return block.text.trim() !== '';
            if (block.type === 'tool_use') return true;
            if (block.type === 'tool_result') return true;
            return false;
          });
        }
        return false;
      })
      .map(msg => {
        // Handle both string and ContentBlock[] content
        if (typeof msg.content === 'string') {
          return {
            role: msg.role,
            content: msg.content
          };
        }
        // Content is already ContentBlock[]
        return {
          role: msg.role,
          content: msg.content
        };
      });
  }

  // Handle sending a message with orchestration loop
  async function handleSend(userContent: string) {
    // Clear any previous error
    errorMessage = null;

    // Add the user's message
    chatStore.addMessage('user', userContent);

    // Run the agent loop
    await runAgentLoop();
  }

  // Agent orchestration loop
  async function runAgentLoop() {
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
        const callbacks: ToolMessageCallbacks = {
          onChunk: (chunk: string, _done: boolean) => {
            accumulatedText += chunk;
            chatStore.updateMessage(currentAssistantMessageId!, accumulatedText);
          },
          onError: (error: string) => {
            errorMessage = error;
          }
        };

        // Send to Claude with tools
        const response = await sendMessageWithTools(
          messagesToSend,
          systemPrompt,
          ALL_TOOLS,
          callbacks
        );

        // Update the message with final content (text and/or tool uses)
        if (response.toolUses.length > 0) {
          // Replace with proper content blocks including tool uses
          chatStore.updateMessage(currentAssistantMessageId, buildAssistantContent(response.textContent, response.toolUses));
        } else if (response.textContent !== accumulatedText) {
          // Ensure final text content is correct
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
          response.toolUses.map(toolUse => executeToolCall(toolUse))
        );

        // Add tool results as a user message
        chatStore.addToolResults(toolResults);

        // Reset for next iteration - the assistant message is now complete
        currentAssistantMessageId = null;

        // Continue the loop - Claude will see the tool results
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errorMessage = message;

      // Check if this is an API key related error
      const lowerMessage = message.toLowerCase();
      isApiKeyError = lowerMessage.includes('no api key') ||
                      lowerMessage.includes('invalid api key') ||
                      lowerMessage.includes('api key') ||
                      lowerMessage.includes('unauthorized') ||
                      lowerMessage.includes('401');

      // Update the API key store if key is invalid
      if (isApiKeyError) {
        apiKeyStore.markInvalid(message);
      }

      // Update the current assistant message with error if it exists and is empty
      if (currentAssistantMessageId) {
        const lastMessage = chatStore.messages.find(m => m.id === currentAssistantMessageId);
        if (lastMessage) {
          const content = lastMessage.content;
          const isEmpty = typeof content === 'string' ? content === '' : content.length === 0;
          if (isEmpty) {
            // Remove the empty message instead of showing error there
            chatStore.removeMessage(currentAssistantMessageId);
          }
        }
      }
    } finally {
      chatStore.setLoading(false);
      // Record what Claude has now seen for change tracking
      documentStore.snapshotLastSeen();
    }
  }

  // Build content blocks for assistant message
  function buildAssistantContent(text: string, toolUses: ToolUseEvent[]): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    if (text.trim()) {
      blocks.push({ type: 'text', text });
    }

    for (const toolUse of toolUses) {
      blocks.push({
        type: 'tool_use',
        id: toolUse.id,
        name: toolUse.name,
        input: toolUse.input
      });
    }

    return blocks;
  }

  // Toggle panel visibility
  function togglePanel() {
    isOpen = !isOpen;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if documentStore.currentPath}
  <div class="chat-panel-container" class:closed={!isOpen}>
    {#if isOpen}
      <div
        class="resize-handle"
        onmousedown={startResize}
        role="separator"
        aria-orientation="vertical"
        tabindex="-1"
      ></div>
      <div class="chat-panel" style="width: {panelWidth}px">
        <div class="panel-header">
          <span class="panel-title">Writing Assistant</span>
          <button class="close-button" onclick={togglePanel} title="Close panel (Cmd+L)">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
        </div>

        <MessageList messages={chatStore.messages} streamingMessageId={chatStore.streamingMessageId} />

        {#if errorMessage}
          <div class="error-banner" class:api-key-error={isApiKeyError}>
            <div class="error-content">
              <span class="error-text">
                {#if isApiKeyError}
                  API key not configured or invalid
                {:else}
                  {errorMessage}
                {/if}
              </span>
              {#if isApiKeyError}
                <button class="error-action" onclick={openSettings}>
                  Configure API Key
                </button>
              {/if}
            </div>
            <button class="error-dismiss" onclick={() => { errorMessage = null; isApiKeyError = false; }} aria-label="Dismiss error">
              <svg width="12" height="12" viewBox="0 0 14 14">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        {/if}

        <InputArea onSend={handleSend} />
      </div>
    {:else}
      <button class="open-button" onclick={togglePanel} title="Open panel (Cmd+L)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    {/if}
  </div>
{/if}

<style>
  .chat-panel-container {
    display: flex;
    flex-shrink: 0;
    height: 100%;
    position: relative;
  }

  .chat-panel-container.closed {
    width: auto;
  }

  .resize-handle {
    width: 4px;
    cursor: ew-resize;
    background: linear-gradient(to right, #e0e0e0 0px, #e0e0e0 1px, transparent 1px);
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .resize-handle:hover {
    background: linear-gradient(to right, #007aff 0px, #007aff 1px, transparent 1px);
  }

  .chat-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
    border-left: 1px solid #e0e0e0;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 12px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .panel-title {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .close-button {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #666;
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.2s ease;
  }

  .close-button:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  .open-button {
    position: fixed;
    right: 16px;
    bottom: 16px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #007aff;
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .open-button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    margin: 0 12px 8px 12px;
    background: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    flex-shrink: 0;
    gap: 8px;
  }

  .error-banner.api-key-error {
    background: #fef3c7;
    border-color: #fcd34d;
  }

  .error-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .error-text {
    font-size: 13px;
    color: #b91c1c;
  }

  .error-banner.api-key-error .error-text {
    color: #92400e;
  }

  .error-action {
    padding: 6px 12px;
    background: #007aff;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    align-self: flex-start;
    transition: background 0.15s;
  }

  .error-action:hover {
    background: #0066d6;
  }

  .error-dismiss {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #b91c1c;
    cursor: pointer;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .error-dismiss:hover {
    background: rgba(185, 28, 28, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .resize-handle {
      background: linear-gradient(to right, #333 0px, #333 1px, transparent 1px);
    }

    .resize-handle:hover {
      background: linear-gradient(to right, #007aff 0px, #007aff 1px, transparent 1px);
    }

    .chat-panel {
      background: #1e1e1e;
      border-left-color: #333;
    }

    .panel-header {
      background: #252525;
      border-bottom-color: #333;
    }

    .panel-title {
      color: #e0e0e0;
    }

    .close-button {
      color: #aaa;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .error-banner {
      background: #450a0a;
      border-color: #7f1d1d;
    }

    .error-text {
      color: #fca5a5;
    }

    .error-dismiss {
      color: #fca5a5;
    }

    .error-dismiss:hover {
      background: rgba(252, 165, 165, 0.1);
    }

    .error-banner.api-key-error {
      background: #422006;
      border-color: #854d0e;
    }

    .error-banner.api-key-error .error-text {
      color: #fcd34d;
    }

    .error-action {
      background: #5ac8fa;
    }

    .error-action:hover {
      background: #4ab8ea;
    }
  }
</style>
