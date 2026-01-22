<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { listen } from '@tauri-apps/api/event';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import { documentStore } from '$lib/stores/document.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import SettingsDialog from './Settings/SettingsDialog.svelte';

  // State for Settings dialog
  let settingsDialogOpen = $state(false);

  // State for inline rename
  let isRenaming = $state(false);
  let renameValue = $state('');
  let renameError = $state<string | null>(null);
  let renameInput: HTMLInputElement | undefined = $state();

  function startRename() {
    if (!documentStore.filename) return;

    // Remove .md extension for editing
    const filename = documentStore.filename;
    renameValue = filename.endsWith('.md') ? filename.slice(0, -3) : filename;
    renameError = null;
    isRenaming = true;

    // Focus the input after it renders
    tick().then(() => {
      renameInput?.focus();
      renameInput?.select();
    });
  }

  async function confirmRename() {
    if (!renameValue.trim()) {
      renameError = 'Filename cannot be empty';
      return;
    }

    try {
      await documentStore.renameDocument(renameValue.trim());
      isRenaming = false;
      renameError = null;
    } catch (e) {
      renameError = e instanceof Error ? e.message : String(e);
    }
  }

  function cancelRename() {
    isRenaming = false;
    renameError = null;
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  }

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
        case 'rename':
          if (documentStore.currentPath) {
            startRename();
          }
          break;
        case 'settings':
          settingsDialogOpen = true;
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
      {#if isRenaming}
        <div class="rename-container">
          <input
            bind:this={renameInput}
            type="text"
            class="rename-input"
            class:error={renameError}
            bind:value={renameValue}
            onkeydown={handleRenameKeydown}
            onblur={cancelRename}
          />
          <span class="rename-extension">.md</span>
          {#if renameError}
            <div class="rename-error">{renameError}</div>
          {/if}
        </div>
      {:else}
        <button class="filename" onclick={startRename} title="Click to rename">
          {documentStore.filename}
          {#if documentStore.isDirty}
            <span class="dirty-indicator">•</span>
          {/if}
        </button>
      {/if}
    {/if}
  </div>
  <!-- User avatar button -->
  <button class="user-button" onclick={() => settingsDialogOpen = true} title="Settings">
    {#if authStore.user?.avatarUrl}
      <img src={authStore.user.avatarUrl} alt="Profile" class="user-avatar" />
    {:else}
      <span class="user-avatar-placeholder">
        {authStore.user?.email?.[0]?.toUpperCase() ?? 'U'}
      </span>
    {/if}
  </button>
</div>

<SettingsDialog open={settingsDialogOpen} onClose={() => settingsDialogOpen = false} />

<style>
  .app-bar {
    display: flex;
    align-items: center;
    height: 44px;
    background: var(--color-bg, #ffffff);
    padding: 0 16px;
    user-select: none;
    -webkit-app-region: drag;
    border-bottom: 1px solid #e0e0e0;
    box-sizing: border-box;
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
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .filename:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .dirty-indicator {
    color: #ff9500;
    margin-left: 4px;
  }

  .rename-container {
    display: flex;
    align-items: center;
    gap: 2px;
    position: relative;
    -webkit-app-region: no-drag;
  }

  .rename-input {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    width: 200px;
    outline: none;
  }

  .rename-input:focus {
    border-color: #007aff;
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
  }

  .rename-input.error {
    border-color: #ff3b30;
  }

  .rename-extension {
    font-size: 13px;
    font-weight: 500;
    color: #666;
  }

  .rename-error {
    position: absolute;
    top: 100%;
    left: 0;
    font-size: 11px;
    color: #ff3b30;
    margin-top: 4px;
    white-space: nowrap;
  }

  .user-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    -webkit-app-region: no-drag;
    padding: 0;
    transition: opacity 0.15s ease;
  }

  .user-button:hover {
    opacity: 0.8;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #da7756;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
  }

  @media (prefers-color-scheme: dark) {
    .app-bar {
      background: var(--color-bg, #1a1a1a);
      border-bottom-color: #333;
    }

    .filename {
      color: #e0e0e0;
    }

    .filename:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .rename-input {
      color: #e0e0e0;
      background: #2a2a2a;
      border-color: #444;
    }

    .rename-input:focus {
      border-color: #0a84ff;
      box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.3);
    }

    .rename-extension {
      color: #888;
    }
  }
</style>
