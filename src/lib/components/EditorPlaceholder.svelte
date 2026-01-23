<script lang="ts">
  import { documentStore } from '$lib/stores/document.svelte';

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    documentStore.updateContent(target.value);
  }
</script>

<div class="editor-container">
  {#if documentStore.isLoading}
    <div class="loading">Loading...</div>
  {:else if documentStore.currentPath}
    <textarea
      class="editor"
      value={documentStore.content}
      oninput={handleInput}
      placeholder="Start writing..."
    ></textarea>
  {:else}
    <div class="welcome">
      <h2>Welcome to WriteCraft</h2>
      <p>Open a markdown file to get started, or create a new document.</p>
      <p class="hint">Use File → Open or File → New from the menu.</p>
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

  .editor {
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
  }

  .editor:focus {
    outline: none;
  }

  .welcome {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #666;
  }

  .welcome h2 {
    margin-bottom: 8px;
    color: #333;
    font-weight: 500;
  }

  .welcome p {
    margin: 4px 0;
  }

  .hint {
    font-size: 13px;
    color: #999;
    margin-top: 16px !important;
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
    background: #ff3b30;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  @media (prefers-color-scheme: dark) {
    .editor {
      background: #1e1e1e;
      color: #e0e0e0;
    }

    .welcome {
      color: #999;
    }

    .welcome h2 {
      color: #e0e0e0;
    }
  }
</style>
