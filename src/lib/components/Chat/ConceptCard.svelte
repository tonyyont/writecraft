<script lang="ts">
  import type { ConceptSnapshot } from '$lib/types/sidecar';
  import { chatStore } from '$lib/stores/chat.svelte';

  let isExpanded = $state(true);
  let isEditing = $state(false);

  // Local editable state
  let editTitle = $state('');
  let editCoreArgument = $state('');
  let editAudience = $state('');
  let editTone = $state('');

  let concept = $derived(chatStore.getConcept());

  function toggleExpand() {
    if (!isEditing) {
      isExpanded = !isExpanded;
    }
  }

  function startEditing() {
    if (concept) {
      editTitle = concept.title;
      editCoreArgument = concept.coreArgument;
      editAudience = concept.audience;
      editTone = concept.tone;
    } else {
      editTitle = '';
      editCoreArgument = '';
      editAudience = '';
      editTone = '';
    }
    isEditing = true;
    isExpanded = true;
  }

  function cancelEditing() {
    isEditing = false;
  }

  function saveEditing() {
    const updated: ConceptSnapshot = {
      title: editTitle,
      coreArgument: editCoreArgument,
      audience: editAudience,
      tone: editTone,
      updatedAt: new Date().toISOString()
    };
    chatStore.updateConcept(updated);
    isEditing = false;
  }
</script>

<div class="card" class:editing={isEditing}>
  <div class="card-header" onclick={toggleExpand} onkeydown={(e) => e.key === 'Enter' && toggleExpand()} role="button" tabindex="0">
    <span class="card-title">
      <svg class="icon" class:rotated={!isExpanded} width="12" height="12" viewBox="0 0 12 12">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>
      Concept
    </span>
    {#if isEditing}
      <button class="close-button" onclick={(e) => { e.stopPropagation(); cancelEditing(); }} title="Close">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
    {:else}
      <button class="edit-button" onclick={(e) => { e.stopPropagation(); startEditing(); }}>Edit</button>
    {/if}
  </div>

  {#if isExpanded}
    <div class="card-content" class:edit-mode={isEditing}>
      {#if isEditing}
        <div class="form-scroll-area">
          <div class="form-group">
            <label for="title">Title</label>
            <input id="title" type="text" bind:value={editTitle} placeholder="Document title" />
          </div>
          <div class="form-group">
            <label for="coreArgument">Core Argument</label>
            <textarea id="coreArgument" bind:value={editCoreArgument} placeholder="Main thesis or argument" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label for="audience">Audience</label>
            <input id="audience" type="text" bind:value={editAudience} placeholder="Target audience" />
          </div>
          <div class="form-group">
            <label for="tone">Tone</label>
            <input id="tone" type="text" bind:value={editTone} placeholder="e.g., formal, casual, technical" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-cancel" onclick={cancelEditing}>Cancel</button>
          <button class="btn-save" onclick={saveEditing}>Save</button>
        </div>
      {:else if concept}
        <div class="field">
          <span class="label">Title:</span>
          <span class="value">{concept.title || 'Not set'}</span>
        </div>
        <div class="field">
          <span class="label">Core Argument:</span>
          <span class="value">{concept.coreArgument || 'Not set'}</span>
        </div>
        <div class="field">
          <span class="label">Audience:</span>
          <span class="value">{concept.audience || 'Not set'}</span>
        </div>
        <div class="field">
          <span class="label">Tone:</span>
          <span class="value">{concept.tone || 'Not set'}</span>
        </div>
      {:else}
        <p class="empty-hint">No concept defined yet. Click Edit to add one.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .card.editing {
    max-height: 300px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #fafafa;
    border-top: 1px solid rgba(0, 0, 0, 0.03);
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
    transition: background-color 0.15s ease;
  }

  .card-header:hover {
    background: #f5f5f5;
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 500;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .icon {
    transition: transform 0.2s ease;
  }

  .icon.rotated {
    transform: rotate(-90deg);
  }

  .edit-button {
    font-size: 12px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid #ccc;
    border-radius: 4px;
    color: #666;
    cursor: pointer;
  }

  .edit-button:hover {
    background: #e8e8e8;
  }

  .close-button {
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

  .close-button:hover {
    background: #e8e8e8;
  }

  .card-content {
    padding: 12px;
  }

  .card-content.edit-mode {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }

  .form-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .field {
    margin-bottom: 8px;
  }

  .field:last-child {
    margin-bottom: 0;
  }

  .label {
    font-size: 12px;
    color: #666;
    display: block;
    margin-bottom: 2px;
  }

  .value {
    font-size: 13px;
    color: #333;
  }

  .empty-hint {
    font-size: 13px;
    color: #999;
    margin: 0;
    text-align: center;
    padding: 8px 0;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #007aff;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 40px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
    flex-shrink: 0;
  }

  .btn-cancel,
  .btn-save {
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid #ccc;
    color: #666;
  }

  .btn-cancel:hover {
    background: #f0f0f0;
  }

  .btn-save {
    background: #007aff;
    border: none;
    color: white;
  }

  .btn-save:hover {
    background: #0056b3;
  }

  @media (prefers-color-scheme: dark) {
    .card {
      background: #2a2a2a;
      border-color: #333;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .card-header {
      background: #252525;
      border-top-color: rgba(255, 255, 255, 0.03);
    }

    .card-header:hover {
      background: #2a2a2a;
    }

    .card-title {
      color: #e0e0e0;
    }

    .edit-button {
      border-color: #444;
      color: #aaa;
    }

    .edit-button:hover {
      background: #3a3a3a;
    }

    .close-button {
      color: #aaa;
    }

    .close-button:hover {
      background: #3a3a3a;
    }

    .label {
      color: #999;
    }

    .value {
      color: #e0e0e0;
    }

    .form-group input,
    .form-group textarea {
      background: #333;
      border-color: #444;
      color: #e0e0e0;
    }

    .form-actions {
      border-top-color: #333;
      background: #252525;
    }

    .btn-cancel {
      border-color: #444;
      color: #aaa;
    }

    .btn-cancel:hover {
      background: #3a3a3a;
    }
  }
</style>
