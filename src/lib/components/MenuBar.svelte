<script lang="ts">
  import { onMount } from 'svelte';
  import { listen } from '@tauri-apps/api/event';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import { documentStore } from '$lib/stores/document.svelte';
  import ApiKeyDialog from './Settings/ApiKeyDialog.svelte';

  // State for API Key dialog
  let apiKeyDialogOpen = $state(false);

  async function handleOpen() {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Markdown',
        extensions: ['md']
      }]
    });

    if (selected && typeof selected === 'string') {
      await documentStore.loadDocument(selected);
    }
  }

  async function handleSave() {
    if (documentStore.currentPath) {
      await documentStore.saveDocument();
      await documentStore.saveSidecar();
    } else {
      await handleSaveAs();
    }
  }

  async function handleSaveAs() {
    const selected = await save({
      filters: [{
        name: 'Markdown',
        extensions: ['md']
      }],
      defaultPath: documentStore.filename || 'untitled.md'
    });

    if (selected) {
      await documentStore.createDocument(selected);
    }
  }

  async function handleNew() {
    const selected = await save({
      filters: [{
        name: 'Markdown',
        extensions: ['md']
      }],
      defaultPath: 'untitled.md'
    });

    if (selected) {
      await documentStore.createDocument(selected);
    }
  }

  onMount(() => {
    // Listen for menu events from Tauri
    const unlisten = listen<string>('menu-event', (event) => {
      switch (event.payload) {
        case 'new':
          handleNew();
          break;
        case 'open':
          handleOpen();
          break;
        case 'save':
          handleSave();
          break;
        case 'save_as':
          handleSaveAs();
          break;
        case 'settings':
          apiKeyDialogOpen = true;
          break;
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  });
</script>

<div class="app-bar" data-tauri-drag-region>
  <div class="traffic-light-spacer"></div>
  <div class="filename-container">
    {#if documentStore.filename}
      <div class="filename">
        {documentStore.filename}
        {#if documentStore.isDirty}
          <span class="dirty-indicator">•</span>
        {/if}
      </div>
    {/if}
  </div>
  <div class="traffic-light-spacer"></div>
</div>

<ApiKeyDialog open={apiKeyDialogOpen} onClose={() => apiKeyDialogOpen = false} />

<style>
  .app-bar {
    display: flex;
    align-items: center;
    height: 38px;
    background: transparent;
    padding: 0 12px;
    user-select: none;
    -webkit-app-region: drag;
  }

  .traffic-light-spacer {
    width: 70px;
    flex-shrink: 0;
  }

  .filename-container {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .filename {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    -webkit-app-region: no-drag;
  }

  .dirty-indicator {
    color: #ff9500;
    margin-left: 4px;
  }

  @media (prefers-color-scheme: dark) {
    .filename {
      color: #e0e0e0;
    }
  }
</style>
