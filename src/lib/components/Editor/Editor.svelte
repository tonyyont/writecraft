<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import { documentStore } from '$lib/stores/document.svelte';
  import { editorStore } from '$lib/stores/editor.svelte';
  import {
    getEditorExtensions,
    parseMarkdownSegments,
    editorConfig,
  } from '$lib/editor/tiptap-config';
  import { getMarkdownFromEditor } from '$lib/editor/markdown-types';

  // Editor mode: 'source' (edit) or 'preview' (rich/rendered)
  let mode = $state<'source' | 'preview'>('source');

  // Focus mode state
  let focusMode = $state(false);

  // Toggle focus mode
  export function toggleFocusMode() {
    focusMode = !focusMode;
  }

  // Export getter for focus mode state
  export function getFocusMode() {
    return focusMode;
  }

  // Set focus mode externally
  export function setFocusMode(value: boolean) {
    focusMode = value;
  }

  // Tiptap editor instance
  let editor: Editor | null = $state(null);
  let editorElement: HTMLDivElement | null = $state(null);

  // Source mode content
  let sourceContent = $state('');

  // Track if we're programmatically updating content
  let isUpdating = false;

  // Track the last path we loaded to detect file changes
  let lastLoadedPath: string | null = null;

  // Track the last content we saved/loaded to detect external changes
  let lastKnownContent: string = '';

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Initialize the Tiptap editor
  function initEditor() {
    if (!editorElement || editor) return;

    const content = documentStore.content || '';

    // Check for unsupported markdown and handle segments
    const segments = parseMarkdownSegments(content);
    let processedContent = content;

    // If we have raw segments (tables), we need special handling
    if (segments.some((s) => s.type === 'raw')) {
      // For now, just use the raw markdown content
      // The Markdown extension will parse what it can
      processedContent = content;
    }

    editor = new Editor({
      element: editorElement,
      extensions: getEditorExtensions(),
      content: processedContent,
      onUpdate: ({ editor: ed }) => {
        if (isUpdating) return;

        // Clear existing debounce
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        // Debounced save
        debounceTimer = setTimeout(() => {
          const markdown = getMarkdownFromEditor(ed);
          lastKnownContent = markdown;
          documentStore.updateContent(markdown);
        }, editorConfig.debounceMs);
      },
      editorProps: {
        attributes: {
          class: 'tiptap-editor',
        },
      },
    });

    // Register the editor instance with the store for menu undo/redo
    editorStore.registerEditor(editor);

    sourceContent = content;
  }

  // Destroy the editor
  function destroyEditor() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (editor) {
      // Unregister from the store before destroying
      editorStore.unregisterEditor();
      editor.destroy();
      editor = null;
    }
  }

  // Switch between source and preview modes
  export function toggleMode() {
    if (mode === 'source') {
      // Switch to preview mode - update editor with source content
      if (editor) {
        isUpdating = true;
        editor.commands.setContent(sourceContent);
        isUpdating = false;
      }
      mode = 'preview';
    } else {
      // Switch to source mode - get current markdown from editor
      if (editor) {
        sourceContent = getMarkdownFromEditor(editor);
      }
      mode = 'source';
    }
  }

  // Handle source mode input
  function handleSourceInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    sourceContent = target.value;

    // Clear existing debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounced save
    debounceTimer = setTimeout(() => {
      lastKnownContent = sourceContent;
      documentStore.updateContent(sourceContent);
    }, editorConfig.debounceMs);
  }

  // Watch for document/file changes (only when a NEW file is loaded)
  $effect(() => {
    const currentPath = documentStore.currentPath;
    const content = documentStore.content;

    // Only update when we load a different file
    if (currentPath && currentPath !== lastLoadedPath) {
      lastLoadedPath = currentPath;
      lastKnownContent = content;

      if (content !== undefined) {
        sourceContent = content;

        // Update editor if it exists
        if (editor) {
          isUpdating = true;
          editor.commands.setContent(content);
          isUpdating = false;
        }
      }
    }
  });

  // Watch for external content updates (e.g., from AI tool calls)
  $effect(() => {
    const content = documentStore.content;

    // Skip if we're in the middle of updating or if the path changed
    if (isUpdating || !documentStore.currentPath) return;

    // Check if content changed externally (not by us)
    if (content !== lastKnownContent && content !== sourceContent) {
      lastKnownContent = content;
      sourceContent = content;

      // Update editor if it exists and we're in preview mode
      if (editor && mode === 'preview') {
        isUpdating = true;
        editor.commands.setContent(content);
        isUpdating = false;
      }
    }
  });

  // Initialize editor when we have a valid path and element
  $effect(() => {
    if (documentStore.currentPath && editorElement && !editor) {
      initEditor();
    }
  });

  onMount(() => {
    // Register toggleMode with the store so it can be called from menu
    editorStore.registerToggleMode(toggleMode);
    // Editor will be initialized via $effect when currentPath is set
  });

  onDestroy(() => {
    editorStore.unregisterToggleMode();
    destroyEditor();
  });
</script>

<div class="editor-container" class:focus-mode={focusMode}>
  {#if documentStore.isLoading}
    <div class="loading">Loading...</div>
  {:else if documentStore.currentPath}
    <div class="editor-toolbar">
      <button
        class="mode-toggle"
        class:active={mode === 'source'}
        onclick={() => mode === 'preview' && toggleMode()}
      >
        Edit
      </button>
      <button
        class="mode-toggle"
        class:active={mode === 'preview'}
        onclick={() => mode === 'source' && toggleMode()}
      >
        Preview
      </button>
      <div class="toolbar-spacer"></div>
      <button
        class="focus-toggle"
        class:active={focusMode}
        onclick={toggleFocusMode}
        title="Toggle Focus Mode (Cmd+Shift+F)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
          <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
        </svg>
      </button>
    </div>

    {#if mode === 'source'}
      <textarea
        class="source-editor"
        value={sourceContent}
        oninput={handleSourceInput}
        placeholder="Enter markdown..."
        spellcheck="false"
      ></textarea>
    {/if}

    <!-- Keep editor element always mounted but hidden when not in preview mode -->
    <div class="editor-wrapper" class:hidden={mode !== 'preview'}>
      <div bind:this={editorElement} class="tiptap-container"></div>
    </div>
  {/if}

  {#if documentStore.error}
    <div class="error-toast">
      {documentStore.error}
    </div>
  {/if}
</div>

<style>
  .editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 44px;
    padding: 0 16px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    box-sizing: border-box;
  }

  .mode-toggle {
    padding: 4px 12px;
    border: 1px solid #e0e0e0;
    background: transparent;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    color: #666;
    transition: all 0.15s ease;
  }

  .mode-toggle:hover {
    background: #f0f0f0;
    border-color: #ccc;
  }

  .mode-toggle:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.4);
  }

  .mode-toggle.active {
    background: #333;
    color: #fff;
    border-color: #333;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .focus-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid #e0e0e0;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    transition: all 0.15s ease;
  }

  .focus-toggle svg {
    width: 16px;
    height: 16px;
  }

  .focus-toggle:hover {
    background: #f0f0f0;
    border-color: #ccc;
  }

  .focus-toggle:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.4);
  }

  .focus-toggle.active {
    background: #007aff;
    color: #fff;
    border-color: #007aff;
  }

  .focus-toggle.active:hover {
    background: #0066d6;
    border-color: #0066d6;
  }

  .editor-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    transition: padding 0.3s ease;
  }

  .editor-wrapper.hidden {
    display: none;
  }

  .tiptap-container {
    max-width: 700px;
    margin: 0 auto;
    transition: max-width 0.3s ease;
  }

  /* Focus Mode Styles */
  .editor-container.focus-mode .editor-toolbar {
    opacity: 0.3;
    transition: opacity 0.3s ease;
  }

  .editor-container.focus-mode .editor-toolbar:hover {
    opacity: 1;
  }

  .editor-container.focus-mode .editor-wrapper {
    padding: 48px 64px;
  }

  .editor-container.focus-mode .tiptap-container {
    max-width: 800px;
  }

  .editor-container.focus-mode .source-editor {
    padding: 48px 64px;
  }

  .source-editor {
    flex: 1;
    width: 100%;
    padding: 24px 32px;
    border: none;
    resize: none;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 14px;
    line-height: 1.6;
    background: #fff;
    color: #333;
    box-sizing: border-box;
    transition:
      background 0.15s ease,
      box-shadow 0.15s ease,
      padding 0.3s ease;
  }

  .source-editor:focus {
    outline: none;
    background: #fafbfc;
    box-shadow: inset 0 0 0 1px #e0e0e0;
  }

  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
  }

  .error-toast {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: #ef4444;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  /* Tiptap Editor Styles */
  :global(.tiptap-editor) {
    outline: none;
    line-height: 1.6;
  }

  :global(.tiptap-editor p) {
    margin: 0 0 1em 0;
  }

  :global(.tiptap-editor h1) {
    font-size: 2em;
    font-weight: 600;
    margin: 1em 0 0.5em 0;
  }

  :global(.tiptap-editor h2) {
    font-size: 1.5em;
    font-weight: 600;
    margin: 1em 0 0.5em 0;
  }

  :global(.tiptap-editor h3) {
    font-size: 1.25em;
    font-weight: 600;
    margin: 1em 0 0.5em 0;
  }

  :global(.tiptap-editor h4, .tiptap-editor h5, .tiptap-editor h6) {
    font-size: 1em;
    font-weight: 600;
    margin: 1em 0 0.5em 0;
  }

  :global(.tiptap-editor strong) {
    font-weight: 600;
  }

  :global(.tiptap-editor em) {
    font-style: italic;
  }

  :global(.tiptap-editor s) {
    text-decoration: line-through;
  }

  :global(.tiptap-editor a) {
    color: #0066cc;
    text-decoration: underline;
  }

  :global(.tiptap-editor blockquote) {
    border-left: 3px solid #ddd;
    margin: 1em 0;
    padding-left: 1em;
    color: #666;
  }

  :global(.tiptap-editor code) {
    background: #f4f4f4;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 0.9em;
  }

  :global(.tiptap-editor pre) {
    background: #f4f4f4;
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
    margin: 1em 0;
  }

  :global(.tiptap-editor pre code) {
    background: none;
    padding: 0;
    font-size: 0.9em;
  }

  :global(.tiptap-editor ul, .tiptap-editor ol) {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  :global(.tiptap-editor li) {
    margin: 0.25em 0;
  }

  :global(.tiptap-editor ul ul, .tiptap-editor ol ol, .tiptap-editor ul ol, .tiptap-editor ol ul) {
    margin: 0;
  }

  /* Raw Markdown Block styles */
  :global(.raw-markdown-block) {
    background: #fff8e6;
    border: 1px dashed #f0c36d;
    border-radius: 4px;
    padding: 8px 12px;
    margin: 1em 0;
    position: relative;
  }

  :global(.raw-markdown-block::before) {
    content: 'Raw Markdown';
    position: absolute;
    top: -10px;
    left: 8px;
    background: #fff8e6;
    padding: 0 4px;
    font-size: 10px;
    color: #b38600;
    font-weight: 500;
  }

  :global(.raw-markdown-content) {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 13px;
    white-space: pre-wrap;
    margin: 0;
    color: #333;
  }

  @media (prefers-color-scheme: dark) {
    .editor-toolbar {
      background: #2a2a2a;
      border-color: #404040;
    }

    .mode-toggle {
      background: transparent;
      border-color: #333;
      color: #ccc;
    }

    .mode-toggle:hover {
      background: #333;
      border-color: #444;
    }

    .mode-toggle.active {
      background: #0066cc;
      border-color: #0066cc;
      color: #fff;
    }

    .focus-toggle {
      border-color: #333;
      color: #ccc;
    }

    .focus-toggle:hover {
      background: #333;
      border-color: #444;
    }

    .focus-toggle.active {
      background: #0066cc;
      border-color: #0066cc;
      color: #fff;
    }

    .focus-toggle.active:hover {
      background: #0055b3;
      border-color: #0055b3;
    }

    .source-editor:focus {
      background: #252525;
      box-shadow: inset 0 0 0 1px #333;
    }

    .source-editor {
      background: #1e1e1e;
      color: #e0e0e0;
    }

    :global(.tiptap-editor a) {
      color: #4da6ff;
    }

    :global(.tiptap-editor blockquote) {
      border-color: #555;
      color: #999;
    }

    :global(.tiptap-editor code) {
      background: #333;
    }

    :global(.tiptap-editor pre) {
      background: #2a2a2a;
    }

    :global(.raw-markdown-block) {
      background: #2a2500;
      border-color: #665200;
    }

    :global(.raw-markdown-block::before) {
      background: #2a2500;
      color: #cca300;
    }

    :global(.raw-markdown-content) {
      color: #e0e0e0;
    }
  }
</style>
