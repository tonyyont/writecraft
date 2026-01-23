<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from '$lib/components/MenuBar.svelte';
  import MetadataPanel from '$lib/components/MetadataPanel.svelte';
  import Editor from '$lib/components/Editor/Editor.svelte';
  import ChatPanel from '$lib/components/Chat/ChatPanel.svelte';
  import { AuthGuard } from '$lib/components/Auth';
  import { documentStore } from '$lib/stores/document.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { preferencesStore } from '$lib/stores/preferences.svelte';

  // Editor component reference for focus mode
  let editorComponent: Editor | undefined = $state();

  // Focus mode state (synced with editor)
  let focusMode = $state(false);

  // Toggle focus mode from menu or keyboard shortcut
  export function toggleFocusMode() {
    focusMode = !focusMode;
    editorComponent?.setFocusMode(focusMode);
  }

  onMount(() => {
    // Initialize preferences (theme) on startup
    preferencesStore.initialize();

    // Initialize auth on startup
    authStore.initialize();

    // Flush pending saves when the window is about to close
    const handleBeforeUnload = () => {
      // Note: We can't await here, but we trigger the save
      documentStore.flushPendingSaves();
    };

    // Also handle visibility change (tab hidden) as a save trigger
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        documentStore.flushPendingSaves();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });
</script>

<AuthGuard>
  {#snippet children()}
    <div class="app-container" class:focus-mode={focusMode}>
      <MenuBar {toggleFocusMode} />
      <div class="main-content">
        {#if !focusMode}
          <div class="panel-container panel-left">
            <ChatPanel />
          </div>
        {/if}
        <Editor bind:this={editorComponent} />
        {#if !focusMode}
          <div class="panel-container panel-right">
            <MetadataPanel />
          </div>
        {/if}
      </div>
    </div>
  {/snippet}
</AuthGuard>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 14px;
    background: #fff;
    color: #333;

    /* Colors (Light Mode) */
    --color-bg: #ffffff;
    --color-bg-elevated: #fafafa;
    --color-bg-raised: #f5f5f5;
    --color-text: #333333;
    --color-text-secondary: #666666;
    --color-text-muted: #888888;
    --color-border: #e0e0e0;
    --color-border-subtle: #ebebeb;
    --color-primary: #007aff;
    --color-primary-hover: #0066d6;
    --color-error: #ef4444;
    --color-success: #22c55e;

    /* Spacing Scale */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-6: 24px;
    --space-8: 32px;
    --space-12: 48px;

    /* Typography Scale */
    --text-xs: 11px;
    --text-sm: 12px;
    --text-base: 14px;
    --text-lg: 16px;
    --text-xl: 18px;
    --text-2xl: 24px;

    /* Border Radius Scale */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;

    /* Transitions */
    --transition-fast: 0.15s ease;
    --transition-normal: 0.2s ease;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Panel containers for smooth transitions */
  .panel-container {
    display: flex;
    flex-shrink: 0;
    overflow: hidden;
  }

  .panel-left {
    animation: slideInLeft 0.3s ease;
  }

  .panel-right {
    animation: slideInRight 0.3s ease;
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Focus mode app-level styles */
  .app-container.focus-mode .main-content {
    justify-content: center;
  }

  /* Global Scrollbar Styling */
  :global(::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(::-webkit-scrollbar-thumb) {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(0, 0, 0, 0.35);
  }

  /* Dark mode via system preference (when no manual override) */
  @media (prefers-color-scheme: dark) {
    :global(html:not(.light) body) {
      background: #1e1e1e;
      color: #e0e0e0;

      /* Colors (Dark Mode) */
      --color-bg: #1e1e1e;
      --color-bg-elevated: #252525;
      --color-bg-raised: #2a2a2a;
      --color-text: #e0e0e0;
      --color-text-secondary: #a0a0a0;
      --color-text-muted: #888888;
      --color-border: #333333;
      --color-border-subtle: #3a3a3a;
      --color-primary: #5ac8fa;
      --color-primary-hover: #4ab8ea;
      --color-error: #f87171;
      --color-success: #4ade80;
    }

    :global(html:not(.light) ::-webkit-scrollbar-thumb) {
      background: rgba(255, 255, 255, 0.2);
    }

    :global(html:not(.light) ::-webkit-scrollbar-thumb:hover) {
      background: rgba(255, 255, 255, 0.35);
    }
  }

  /* Dark mode via manual class override */
  :global(html.dark body) {
    background: #1e1e1e;
    color: #e0e0e0;

    /* Colors (Dark Mode) */
    --color-bg: #1e1e1e;
    --color-bg-elevated: #252525;
    --color-bg-raised: #2a2a2a;
    --color-text: #e0e0e0;
    --color-text-secondary: #a0a0a0;
    --color-text-muted: #888888;
    --color-border: #333333;
    --color-border-subtle: #3a3a3a;
    --color-primary: #5ac8fa;
    --color-primary-hover: #4ab8ea;
    --color-error: #f87171;
    --color-success: #4ade80;
  }

  :global(html.dark ::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.2);
  }

  :global(html.dark ::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.35);
  }
</style>
