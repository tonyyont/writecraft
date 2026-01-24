<script lang="ts">
  import { emit } from '@tauri-apps/api/event';
  import { chatStore } from '$lib/stores/chat.svelte';
  import { documentStore } from '$lib/stores/document.svelte';
  import { recentsStore } from '$lib/stores/recents.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { sendMessage, type AgentCallbacks } from '$lib/services/agent';
  import { UPGRADE_BANNER_THRESHOLD } from '$lib/config/billing';
  import MessageList from './MessageList.svelte';
  import InputArea from './InputArea.svelte';
  import UpgradeBanner from './UpgradeBanner.svelte';
  import UsageLimitBanner from './UsageLimitBanner.svelte';
  import UpgradeModal from '$lib/components/Settings/UpgradeModal.svelte';

  // Panel visibility state
  let isOpen = $state(true);

  // Error state for displaying API errors
  let errorMessage = $state<string | null>(null);
  // Track if error is related to missing/invalid API key
  let isApiKeyError = $state(false);

  // Upgrade modal state
  let showUpgradeModal = $state(false);
  // Track if upgrade banner has been dismissed this session
  let upgradeBannerDismissed = $state(false);

  // Derived state for upgrade prompts
  let showUpgradeBanner = $derived(
    authStore.plan === 'free' &&
      authStore.messagesRemaining <= UPGRADE_BANNER_THRESHOLD &&
      authStore.messagesRemaining > 0 &&
      !upgradeBannerDismissed
  );
  let showLimitReached = $derived(!authStore.canSendMessage && authStore.plan === 'free');

  // Check if error is a rate limit error
  let isRateLimitError = $derived(
    errorMessage !== null &&
      (errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('limit reached') ||
        errorMessage.toLowerCase().includes('monthly limit'))
  );

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

  // Resize handlers - Panel is now on LEFT, resize handle on RIGHT edge
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

    // Panel is on the left, so dragging right increases width
    const delta = e.clientX - startX;
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

  // Agent callbacks for handling errors
  const agentCallbacks: AgentCallbacks = {
    onError: (message: string, apiKeyError: boolean) => {
      errorMessage = message;
      isApiKeyError = apiKeyError;
    },
  };

  // Handle sending a message (when document exists)
  async function handleSend(userContent: string) {
    // Clear any previous error
    errorMessage = null;
    isApiKeyError = false;

    // Send message via agent service
    await sendMessage(userContent, agentCallbacks);
  }

  // Handle sending from blank state - creates document first
  async function handleBlankStateSend(userContent: string) {
    // Clear any previous error
    errorMessage = null;
    isApiKeyError = false;

    try {
      // Create a new document with auto-generated path
      await documentStore.createDocumentWithDefaultPath();

      // Send the message to start the conversation
      await sendMessage(userContent, agentCallbacks);
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  }

  // Handle opening a recent file
  async function handleOpenRecent(path: string) {
    try {
      await documentStore.loadDocument(path);
    } catch {
      // File might not exist anymore, remove from recents
      recentsStore.removeRecent(path);
    }
  }

  // Toggle panel visibility
  function togglePanel() {
    isOpen = !isOpen;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !documentStore.currentPath}
  <!-- Blank state: centered, focused chat experience -->
  <div class="chat-blank-state">
    <div class="blank-content">
      <!-- Logo/Icon -->
      <div class="blank-logo">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
          <path d="M2 2l7.586 7.586"></path>
          <circle cx="11" cy="11" r="2"></circle>
        </svg>
      </div>

      <h1 class="blank-title">What would you like to write?</h1>

      <div class="blank-input-wrapper">
        <InputArea onSend={handleBlankStateSend} placeholder="Describe your writing project..." />
      </div>

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
              <button class="error-action" onclick={openSettings}> Configure API Key </button>
            {/if}
          </div>
          <button
            class="error-dismiss"
            onclick={() => {
              errorMessage = null;
              isApiKeyError = false;
            }}
            aria-label="Dismiss error"
          >
            <svg width="12" height="12" viewBox="0 0 14 14">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </button>
        </div>
      {/if}

      <!-- Suggestion chips -->
      <div class="suggestions">
        <button
          class="suggestion-chip"
          onclick={() => handleBlankStateSend('Help me write a blog post')}
        >
          Blog post
        </button>
        <button
          class="suggestion-chip"
          onclick={() => handleBlankStateSend('Help me draft an email')}
        >
          Email
        </button>
        <button
          class="suggestion-chip"
          onclick={() => handleBlankStateSend('Help me write documentation')}
        >
          Documentation
        </button>
        <button
          class="suggestion-chip"
          onclick={() => handleBlankStateSend('Help me write a story')}
        >
          Story
        </button>
      </div>

      {#if recentsStore.files.length > 0}
        <div class="recents-section">
          <div class="recents-header">Recent</div>
          <div class="recents-list">
            {#each recentsStore.files.slice(0, 5) as file (file.path)}
              <button class="recent-item" onclick={() => handleOpenRecent(file.path)}>
                <svg
                  class="recent-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div class="recent-info">
                  <span class="recent-name">{file.name}</span>
                  <span class="recent-path">{recentsStore.getDirectory(file.path)}</span>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Document exists: show normal chat panel -->
  <div class="chat-panel-container" class:closed={!isOpen}>
    {#if isOpen}
      <div class="chat-panel" style="width: {panelWidth}px">
        <div class="panel-header">
          <span class="panel-title">Writing Assistant</span>
          <button class="close-button" onclick={togglePanel} title="Close panel (Cmd+L)">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </button>
        </div>

        <MessageList
          messages={chatStore.messages}
          streamingMessageId={chatStore.streamingMessageId}
        />

        {#if errorMessage && !isRateLimitError}
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
                <button class="error-action" onclick={openSettings}> Configure API Key </button>
              {/if}
            </div>
            <button
              class="error-dismiss"
              onclick={() => {
                errorMessage = null;
                isApiKeyError = false;
              }}
              aria-label="Dismiss error"
            >
              <svg width="12" height="12" viewBox="0 0 14 14">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" />
              </svg>
            </button>
          </div>
        {/if}

        {#if showUpgradeBanner}
          <div class="upgrade-banner-wrapper">
            <UpgradeBanner onDismiss={() => (upgradeBannerDismissed = true)} />
          </div>
        {/if}

        {#if showLimitReached}
          <UsageLimitBanner onLearnMore={() => (showUpgradeModal = true)} />
        {:else}
          <InputArea onSend={handleSend} />
        {/if}

        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="resize-handle"
          onmousedown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
          tabindex="-1"
        ></div>
      </div>
    {:else}
      <div class="collapsed-panel">
        <button class="expand-button" onclick={togglePanel} title="Open panel (Cmd+L)">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M6 4L10 8L6 12" />
          </svg>
        </button>
      </div>
    {/if}
  </div>
{/if}

<UpgradeModal open={showUpgradeModal} onClose={() => (showUpgradeModal = false)} />

<style>
  /* Blank state styles - full-screen centered experience */
  .chat-blank-state {
    position: fixed;
    top: 44px; /* Below menu bar */
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background: var(--color-bg);
    z-index: 10;
  }

  .blank-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 560px;
    width: 100%;
    margin-top: -60px; /* Shift up slightly for better visual balance */
  }

  .blank-logo {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  .blank-logo svg {
    width: 40px;
    height: 40px;
  }

  .blank-title {
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.5px;
    color: var(--color-text);
    margin: 0 0 32px 0;
    text-align: center;
  }

  .blank-input-wrapper {
    width: 100%;
    margin-bottom: 16px;
  }

  /* Style the input area for blank state */
  .blank-input-wrapper :global(.input-area) {
    border: 1px solid var(--color-border);
    border-radius: 16px;
    background: var(--color-bg-elevated);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .blank-input-wrapper :global(.input-area:focus-within) {
    border-color: var(--color-primary);
    box-shadow: 0 2px 12px rgba(0, 122, 255, 0.1);
  }

  /* Suggestion chips */
  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-bottom: 48px;
  }

  .suggestion-chip {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 18px;
    font-size: 13px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .suggestion-chip:hover {
    background: var(--color-bg-elevated);
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }

  .suggestion-chip:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .recents-section {
    width: 100%;
    max-width: 400px;
  }

  .recents-header {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    text-align: center;
  }

  .recents-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: none;
    border: 1px solid transparent;
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }

  .recent-item:hover {
    background: var(--color-bg-elevated);
    border-color: var(--color-border);
  }

  .recent-item:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .recent-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  .recent-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }

  .recent-name {
    font-size: 13px;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .recent-path {
    font-size: 11px;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Chat panel container styles */
  .chat-panel-container {
    display: flex;
    flex-shrink: 0;
    height: 100%;
    position: relative;
  }

  .chat-panel-container.closed {
    width: 40px;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
    transition: background-color 0.2s ease;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: var(--color-border);
    transition: background-color 0.2s ease;
  }

  .resize-handle:hover::after {
    background: #007aff;
  }

  .chat-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg);
    overflow: hidden;
    position: relative;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 12px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-elevated);
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .panel-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
  }

  .close-button {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.2s ease;
  }

  .close-button:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  .collapsed-panel {
    width: 40px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 8px;
    background: var(--color-bg);
    border-right: 1px solid var(--color-border);
    position: relative;
  }

  .expand-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.15s ease;
  }

  .expand-button:hover {
    background: var(--color-bg-raised);
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
    background: var(--color-primary);
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
    background: var(--color-primary-hover);
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

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .blank-title {
      background: linear-gradient(135deg, #e0e0e0 0%, #a0a0a0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
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
  }

  .upgrade-banner-wrapper {
    padding: 0 12px;
  }
</style>
