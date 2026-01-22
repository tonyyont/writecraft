<script lang="ts">
  import type { ChatMessage, MessageContent } from '$lib/types/sidecar';
  import type { ContentBlock } from '$lib/types/tools';
  import ToolUseIndicator from './ToolUseIndicator.svelte';

  interface Props {
    messages: ChatMessage[];
    streamingMessageId?: string | null;
  }

  let { messages, streamingMessageId = null }: Props = $props();

  let listRef: HTMLDivElement | null = $state(null);

  // Track previously rendered word count for streaming messages
  let previousWordCounts = $state<Map<string, number>>(new Map());

  // Auto-scroll to bottom when messages change
  $effect(() => {
    if (messages.length > 0 && listRef) {
      // Small delay to ensure DOM is updated
      requestAnimationFrame(() => {
        if (listRef) {
          listRef.scrollTop = listRef.scrollHeight;
        }
      });
    }
  });

  // Check if message should be hidden (tool_result messages)
  function shouldHideMessage(content: MessageContent): boolean {
    if (typeof content === 'string') return false;
    // Hide messages that only contain tool_result blocks
    return content.length > 0 && content.every(block => block.type === 'tool_result');
  }

  // Get text content from message
  function getTextContent(content: MessageContent): string {
    if (typeof content === 'string') return content;

    // Extract text from content blocks
    return content
      .filter((block): block is ContentBlock & { type: 'text'; text: string } => block.type === 'text')
      .map(block => block.text)
      .join('\n');
  }

  // Get tool use blocks from message
  function getToolUses(content: MessageContent): Array<{ id: string; name: string; input: Record<string, unknown> }> {
    if (typeof content === 'string') return [];

    return content
      .filter((block): block is ContentBlock & { type: 'tool_use' } => block.type === 'tool_use')
      .map(block => ({
        id: block.id,
        name: block.name,
        input: block.input
      }));
  }

  // Format timestamp
  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Simple markdown rendering (basic support)
  function renderMarkdown(text: string): string {
    return text
      // Code blocks (must come before inline code)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Line breaks (preserve newlines)
      .replace(/\n/g, '<br>');
  }

  // Render streaming text with word-by-word animation
  function renderStreamingText(text: string, messageId: string): string {
    const words = text.split(/(\s+)/); // Split by whitespace, keeping separators
    const prevCount = previousWordCounts.get(messageId) || 0;

    // Update word count for next render
    const wordCount = words.filter(w => w.trim()).length;
    if (wordCount !== prevCount) {
      previousWordCounts.set(messageId, wordCount);
    }

    let wordIndex = 0;
    return words.map(word => {
      if (!word.trim()) {
        // Preserve whitespace
        return word;
      }
      wordIndex++;
      const isNew = wordIndex > prevCount;
      if (isNew) {
        return `<span class="streaming-word" style="animation-delay: ${(wordIndex - prevCount - 1) * 30}ms">${escapeHtml(word)}</span>`;
      }
      return escapeHtml(word);
    }).join('');
  }

  // Escape HTML special characters
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Clean up word counts when streaming ends
  $effect(() => {
    if (!streamingMessageId) {
      previousWordCounts = new Map();
    }
  });

  // Filter out hidden messages
  $effect(() => {
    // This effect exists to trigger re-render when messages change
    messages;
  });
</script>

<div class="message-list" bind:this={listRef}>
  {#if messages.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="8" width="40" height="28" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="16" cy="22" r="2" fill="currentColor"/>
          <circle cx="24" cy="22" r="2" fill="currentColor"/>
          <circle cx="32" cy="22" r="2" fill="currentColor"/>
          <path d="M12 36L8 44V36H12Z" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <h3 class="empty-headline">Start a conversation</h3>
      <p class="empty-subtext">Ask a question or share what you're working on</p>
      <div class="empty-suggestions">
        <span class="suggestion">Write code</span>
        <span class="suggestion">Explain concepts</span>
        <span class="suggestion">Debug issues</span>
      </div>
    </div>
  {:else}
    {#each messages as message (message.id)}
      {#if !shouldHideMessage(message.content)}
        {@const textContent = getTextContent(message.content)}
        {@const toolUses = getToolUses(message.content)}
        {@const hasContent = textContent || toolUses.length > 0}
        {#if hasContent}
          {@const isStreaming = streamingMessageId === message.id}
          <div class="message {message.role}">
            {#if textContent}
              <div class="message-content" class:streaming={isStreaming}>
                {#if isStreaming}
                  {@html renderStreamingText(textContent, message.id)}
                {:else}
                  {@html renderMarkdown(textContent)}
                {/if}
              </div>
            {/if}
            {#if toolUses.length > 0}
              <div class="tool-uses">
                {#each toolUses as toolUse (toolUse.id)}
                  <ToolUseIndicator name={toolUse.name} input={toolUse.input} />
                {/each}
              </div>
            {/if}
            <span class="timestamp">{formatTime(message.createdAt)}</span>
          </div>
        {/if}
      {/if}
    {/each}
  {/if}
</div>

<style>
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #666;
    text-align: center;
    padding: 16px;
  }

  .empty-icon {
    color: #999;
    margin-bottom: 4px;
  }

  .empty-headline {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .empty-subtext {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .empty-suggestions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .suggestion {
    font-size: 12px;
    padding: 4px 12px;
    background: #f0f0f0;
    color: #666;
    border-radius: 12px;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state {
      color: #a0a0a0;
    }

    .empty-icon {
      color: #666;
    }

    .empty-headline {
      color: #e0e0e0;
    }

    .empty-subtext {
      color: #a0a0a0;
    }

    .suggestion {
      background: #333;
      color: #a0a0a0;
    }
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .message.user {
    align-self: flex-end;
    max-width: 85%;
  }

  .message.assistant {
    align-self: stretch;
    max-width: 100%;
  }

  .message-content {
    font-size: 14px;
    line-height: 1.6;
    word-wrap: break-word;
  }

  /* User messages: subtle speech bubble */
  .message.user .message-content {
    padding: 12px 16px;
    background: #404040;
    color: #f5f5f5;
    border-radius: 16px;
  }

  /* Assistant messages: no bubble, free-flowing text */
  .message.assistant .message-content {
    padding: 0;
    background: transparent;
    color: #333;
  }

  .message-content.streaming :global(.streaming-word) {
    opacity: 0;
    animation: fadeInWord 0.15s ease-out forwards;
  }

  @keyframes fadeInWord {
    from {
      opacity: 0;
      transform: translateY(2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .timestamp {
    font-size: 12px;
    color: #666;
  }

  @media (prefers-color-scheme: dark) {
    .timestamp {
      color: #a0a0a0;
    }
  }

  .message.user .timestamp {
    text-align: right;
  }

  .tool-uses {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }

  /* Markdown styles */
  .message-content :global(code) {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 13px;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .message.user .message-content :global(code) {
    background: rgba(255, 255, 255, 0.15);
  }

  .message.assistant .message-content :global(code) {
    background: rgba(0, 0, 0, 0.06);
    color: #d63384;
  }

  .message-content :global(pre) {
    margin: 12px 0;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
  }

  .message.user .message-content :global(pre) {
    background: rgba(255, 255, 255, 0.1);
  }

  .message.assistant .message-content :global(pre) {
    background: #f6f6f6;
    border: 1px solid #e5e5e5;
  }

  .message-content :global(pre code) {
    padding: 0;
    background: transparent;
    color: inherit;
  }

  .message-content :global(strong) {
    font-weight: 600;
  }

  .message-content :global(a) {
    text-decoration: underline;
  }

  .message-content :global(del) {
    text-decoration: line-through;
    opacity: 0.7;
  }

  .message.user .message-content :global(a) {
    color: #a5d6ff;
  }

  .message.assistant .message-content :global(a) {
    color: #007aff;
  }

  @media (prefers-color-scheme: dark) {
    .message.user .message-content {
      background: #4a4a4a;
      color: #f0f0f0;
    }

    .message.assistant .message-content {
      color: #e0e0e0;
    }

    .message.assistant .message-content :global(code) {
      background: rgba(255, 255, 255, 0.08);
      color: #f472b6;
    }

    .message.assistant .message-content :global(pre) {
      background: #2a2a2a;
      border-color: #3a3a3a;
    }

    .message.assistant .message-content :global(a) {
      color: #5ac8fa;
    }
  }
</style>
