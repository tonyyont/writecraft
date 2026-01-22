<script lang="ts">
  import { documentStore } from '$lib/stores/document.svelte';
  import StageSelector from './StageSelector.svelte';
  import ConceptCard from './Chat/ConceptCard.svelte';
  import OutlineCard from './Chat/OutlineCard.svelte';

  // Panel state
  let isCollapsed = $state(false);
  let panelWidth = $state(240);
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 400;
  const COLLAPSED_WIDTH = 40;

  // Resize state
  let isResizing = $state(false);
  let startX = $state(0);
  let startWidth = $state(0);

  // Keyboard shortcut handler
  function handleKeydown(e: KeyboardEvent) {
    // Cmd+B (Mac) or Ctrl+B (Windows/Linux) toggles panel
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      isCollapsed = !isCollapsed;
    }
  }

  // Toggle collapse
  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }

  // Resize handlers
  function startResize(e: MouseEvent) {
    if (isCollapsed) return;
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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if documentStore.currentPath}
  <div
    class="metadata-panel"
    class:collapsed={isCollapsed}
    style="width: {isCollapsed ? COLLAPSED_WIDTH : panelWidth}px"
  >
    {#if isCollapsed}
      <button class="expand-button" onclick={toggleCollapse} title="Expand panel (Cmd+B)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 4L10 8L6 12"/>
        </svg>
      </button>
    {:else}
      <div class="panel-header">
        <span class="panel-title">Document</span>
        <button class="collapse-button" onclick={toggleCollapse} title="Collapse panel (Cmd+B)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10 4L6 8L10 12"/>
          </svg>
        </button>
      </div>

      <div class="panel-content">
        <div class="section">
          <div class="section-label">Stage</div>
          <StageSelector />
        </div>

        <div class="section">
          <ConceptCard />
        </div>

        <div class="section">
          <OutlineCard />
        </div>
      </div>

      <div
        class="resize-handle"
        onmousedown={startResize}
        role="separator"
        aria-orientation="vertical"
        tabindex="-1"
      ></div>
    {/if}
  </div>
{/if}

<style>
  .metadata-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fafafa;
    border-right: 1px solid #e0e0e0;
    position: relative;
    flex-shrink: 0;
    transition: width 0.2s ease;
  }

  .metadata-panel.collapsed {
    align-items: center;
    justify-content: flex-start;
    padding-top: 8px;
  }

  .expand-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #666;
    cursor: pointer;
    border-radius: 4px;
  }

  .expand-button:hover {
    background: #e8e8e8;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 12px;
    flex-shrink: 0;
    border-bottom: 1px solid #e0e0e0;
  }

  .panel-title {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .collapse-button {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #666;
    cursor: pointer;
    border-radius: 4px;
  }

  .collapse-button:hover {
    background: #e8e8e8;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section {
    display: flex;
    flex-direction: column;
  }

  .section-label {
    font-size: 11px;
    font-weight: 500;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
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
    background: #e0e0e0;
    transition: background-color 0.2s ease;
  }

  .resize-handle:hover::after {
    background: #007aff;
  }

  @media (prefers-color-scheme: dark) {
    .metadata-panel {
      background: #1e1e1e;
      border-right-color: #333;
    }

    .panel-header {
      border-bottom-color: #333;
    }

    .expand-button {
      color: #a0a0a0;
    }

    .expand-button:hover {
      background: #333;
    }

    .panel-title {
      color: #a0a0a0;
    }

    .collapse-button {
      color: #a0a0a0;
    }

    .collapse-button:hover {
      background: #333;
    }

    .section-label {
      color: #888;
    }

    .resize-handle::after {
      background: #333;
    }

    .resize-handle:hover::after {
      background: #007aff;
    }
  }
</style>
