<script lang="ts">
  import { chatStore } from '$lib/stores/chat.svelte';

  interface Props {
    onSend: (message: string) => void;
  }

  let { onSend }: Props = $props();

  let inputText = $state('');
  let textareaRef: HTMLTextAreaElement | null = $state(null);

  // Auto-resize textarea
  function adjustHeight() {
    if (!textareaRef) return;

    // Reset height to auto to get scroll height
    textareaRef.style.height = 'auto';

    // Calculate line height and max lines
    const lineHeight = 22; // Approximate line height
    const maxLines = 6;
    const maxHeight = lineHeight * maxLines;

    // Set height based on content, capped at max
    const newHeight = Math.min(textareaRef.scrollHeight, maxHeight);
    textareaRef.style.height = `${newHeight}px`;
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    inputText = target.value;
    adjustHeight();
  }

  function handleKeydown(e: KeyboardEvent) {
    // Enter sends, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed || chatStore.isLoading) return;

    onSend(trimmed);
    inputText = '';

    // Reset textarea height
    if (textareaRef) {
      textareaRef.style.height = 'auto';
    }
  }

  let canSend = $derived(inputText.trim().length > 0 && !chatStore.isLoading);
</script>

<div class="input-area">
  <div class="input-container">
    <textarea
      bind:this={textareaRef}
      value={inputText}
      oninput={handleInput}
      onkeydown={handleKeydown}
      placeholder="Type a message..."
      disabled={chatStore.isLoading}
      rows="1"
    ></textarea>
    <button
      class="send-button"
      onclick={handleSend}
      disabled={!canSend}
      title="Send message"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13"></path>
        <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
      </svg>
    </button>
  </div>
  {#if chatStore.isLoading}
    <div class="loading-indicator">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  {/if}
</div>

<style>
  .input-area {
    padding: 12px;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
  }

  .input-container {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: #fff;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    padding: 8px 8px 8px 12px;
  }

  textarea {
    flex: 1;
    border: none;
    background: transparent;
    resize: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 22px;
    min-height: 22px;
    max-height: 132px; /* 6 lines */
    overflow-y: auto;
    color: #333;
  }

  textarea::placeholder {
    color: #999;
  }

  textarea:focus {
    outline: none;
  }

  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-button {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #007aff;
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .send-button:hover:not(:disabled) {
    background: #0056b3;
  }

  .send-button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .loading-indicator {
    display: flex;
    justify-content: center;
    gap: 4px;
    padding: 8px 0 0;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: #999;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .dot:nth-child(1) {
    animation-delay: -0.32s;
  }

  .dot:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  @media (prefers-color-scheme: dark) {
    .input-area {
      background: #252525;
      border-top-color: #3a3a3a;
    }

    .input-container {
      background: #333;
      border-color: #444;
    }

    textarea {
      color: #e0e0e0;
    }

    textarea::placeholder {
      color: #777;
    }
  }
</style>
