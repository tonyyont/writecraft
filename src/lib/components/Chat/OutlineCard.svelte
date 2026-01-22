<script lang="ts">
  import type { OutlinePrompt } from '$lib/types/sidecar';
  import { chatStore } from '$lib/stores/chat.svelte';

  let isExpanded = $state(true);
  let isEditing = $state(false);

  // Local editable state - array of outline prompts
  let editPrompts = $state<OutlinePrompt[]>([]);

  let outline = $derived(chatStore.getOutline());

  function toggleExpand() {
    if (!isEditing) {
      isExpanded = !isExpanded;
    }
  }

  function startEditing() {
    if (outline && outline.length > 0) {
      editPrompts = outline.map(p => ({ ...p }));
    } else {
      // Start with one empty prompt
      editPrompts = [createEmptyPrompt()];
    }
    isEditing = true;
    isExpanded = true;
  }

  function cancelEditing() {
    isEditing = false;
  }

  function saveEditing() {
    // Filter out empty prompts
    const filtered = editPrompts.filter(p => p.title.trim() || p.description.trim());
    chatStore.updateOutline(filtered);
    isEditing = false;
  }

  function createEmptyPrompt(): OutlinePrompt {
    return {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      estimatedWords: null
    };
  }

  function addPrompt() {
    editPrompts = [...editPrompts, createEmptyPrompt()];
  }

  function removePrompt(index: number) {
    editPrompts = editPrompts.filter((_, i) => i !== index);
  }

  function updatePrompt(index: number, field: keyof OutlinePrompt, value: string | number | null) {
    editPrompts = editPrompts.map((p, i) => {
      if (i === index) {
        return { ...p, [field]: value };
      }
      return p;
    });
  }
</script>

<div class="card" class:editing={isEditing}>
  <div class="card-header" onclick={toggleExpand} onkeydown={(e) => e.key === 'Enter' && toggleExpand()} role="button" tabindex="0">
    <span class="card-title">
      <svg class="icon" class:rotated={!isExpanded} width="12" height="12" viewBox="0 0 12 12">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>
      Outline
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
          <div class="prompt-list">
            {#each editPrompts as prompt, index (prompt.id)}
              <div class="prompt-item">
                <div class="prompt-header">
                  <span class="prompt-number">{index + 1}.</span>
                  <button class="remove-button" onclick={() => removePrompt(index)} title="Remove">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Section title"
                  value={prompt.title}
                  oninput={(e) => updatePrompt(index, 'title', (e.target as HTMLInputElement).value)}
                />
                <textarea
                  placeholder="Description or key points..."
                  rows="2"
                  value={prompt.description}
                  oninput={(e) => updatePrompt(index, 'description', (e.target as HTMLTextAreaElement).value)}
                ></textarea>
              </div>
            {/each}
          </div>
          <button class="add-button" onclick={addPrompt}>+ Add Section</button>
        </div>
        <div class="form-actions">
          <button class="btn-cancel" onclick={cancelEditing}>Cancel</button>
          <button class="btn-save" onclick={saveEditing}>Save</button>
        </div>
      {:else if outline && outline.length > 0}
        <ol class="outline-list">
          {#each outline as prompt (prompt.id)}
            <li>
              <span class="prompt-title">{prompt.title}</span>
              {#if prompt.description}
                <p class="prompt-description">{prompt.description}</p>
              {/if}
            </li>
          {/each}
        </ol>
      {:else}
        <p class="empty-hint">No outline defined yet. Click Edit to add sections.</p>
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
    max-height: 350px;
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

  .outline-list {
    margin: 0;
    padding-left: 20px;
    list-style-type: decimal;
  }

  .outline-list li {
    margin-bottom: 8px;
  }

  .outline-list li:last-child {
    margin-bottom: 0;
  }

  .prompt-title {
    font-size: 13px;
    font-weight: 500;
    color: #333;
  }

  .prompt-description {
    font-size: 12px;
    color: #666;
    margin: 4px 0 0;
  }

  .empty-hint {
    font-size: 13px;
    color: #999;
    margin: 0;
    text-align: center;
    padding: 8px 0;
  }

  .prompt-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .prompt-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: #f8f8f8;
    border-radius: 6px;
  }

  .prompt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .prompt-number {
    font-size: 12px;
    font-weight: 500;
    color: #666;
  }

  .remove-button {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    border-radius: 4px;
  }

  .remove-button:hover {
    background: #e0e0e0;
    color: #666;
  }

  .prompt-item input,
  .prompt-item textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
  }

  .prompt-item input:focus,
  .prompt-item textarea:focus {
    outline: none;
    border-color: #007aff;
  }

  .prompt-item textarea {
    resize: vertical;
    min-height: 40px;
  }

  .add-button {
    width: 100%;
    padding: 8px;
    margin-top: 8px;
    background: transparent;
    border: 1px dashed #ccc;
    border-radius: 4px;
    color: #666;
    cursor: pointer;
    font-size: 12px;
  }

  .add-button:hover {
    background: #f0f0f0;
    border-color: #999;
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

    .prompt-title {
      color: #e0e0e0;
    }

    .prompt-description {
      color: #999;
    }

    .prompt-item {
      background: #333;
    }

    .prompt-item input,
    .prompt-item textarea {
      background: #2a2a2a;
      border-color: #444;
      color: #e0e0e0;
    }

    .remove-button:hover {
      background: #3a3a3a;
    }

    .add-button {
      border-color: #444;
      color: #aaa;
    }

    .add-button:hover {
      background: #2a2a2a;
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
