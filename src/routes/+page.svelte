<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from '$lib/components/MenuBar.svelte';
  import MetadataPanel from '$lib/components/MetadataPanel.svelte';
  import Editor from '$lib/components/Editor/Editor.svelte';
  import ChatPanel from '$lib/components/Chat/ChatPanel.svelte';
  import { documentStore } from '$lib/stores/document.svelte';

  onMount(() => {
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

<div class="app-container">
  <MenuBar />
  <div class="main-content">
    <MetadataPanel />
    <Editor />
    <ChatPanel />
  </div>
</div>

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

  @media (prefers-color-scheme: dark) {
    :global(body) {
      background: #1e1e1e;
      color: #e0e0e0;
    }
  }
</style>
