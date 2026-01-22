<script lang="ts">
  import { documentStore } from '$lib/stores/document.svelte';
  import { stageDescriptions } from '$lib/prompts/system';
  import type { DocumentStage } from '$lib/types/sidecar';

  const stages: DocumentStage[] = ['concept', 'outline', 'draft', 'edits', 'polish'];

  function handleStageChange(stage: DocumentStage) {
    documentStore.updateStage(stage);
  }

  // Format stage name for display (capitalize first letter)
  function formatStageName(stage: DocumentStage): string {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  }
</script>

{#if documentStore.sidecar}
  <div class="stage-selector">
    {#each stages as stage, index}
      <button
        class="stage-pill"
        class:active={documentStore.sidecar.stage === stage}
        class:completed={stages.indexOf(documentStore.sidecar.stage) > index}
        onclick={() => handleStageChange(stage)}
        title={stageDescriptions[stage]}
      >
        <span class="stage-number">{index + 1}</span>
        <span class="stage-name">{formatStageName(stage)}</span>
      </button>
      {#if index < stages.length - 1}
        <div
          class="stage-connector"
          class:completed={stages.indexOf(documentStore.sidecar.stage) > index}
        ></div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .stage-selector {
    display: flex;
    flex-direction: column;
    gap: 2px;
    -webkit-app-region: no-drag;
  }

  .stage-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    color: #666;
    transition: all 0.15s ease;
    white-space: nowrap;
    text-align: left;
  }

  .stage-pill:hover {
    background: #e8e8e8;
  }

  .stage-pill.active {
    background: #333;
    color: #fff;
  }

  .stage-pill.active .stage-number {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .stage-pill.completed:not(.active) {
    color: #2e7d32;
  }

  .stage-pill.completed:not(.active) .stage-number {
    background: #a5d6a7;
    color: #1b5e20;
  }

  .stage-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #e0e0e0;
    font-size: 10px;
    font-weight: 600;
    color: #666;
    flex-shrink: 0;
  }

  .stage-name {
    font-weight: 500;
  }

  .stage-connector {
    display: none;
  }

  @media (prefers-color-scheme: dark) {
    .stage-pill {
      color: #aaa;
    }

    .stage-pill:hover {
      background: #333;
    }

    .stage-pill.active {
      background: #0066cc;
      color: #fff;
    }

    .stage-pill.active .stage-number {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .stage-pill.completed:not(.active) {
      color: #81c784;
    }

    .stage-pill.completed:not(.active) .stage-number {
      background: #2e5a33;
      color: #a5d6a7;
    }

    .stage-number {
      background: #444;
      color: #aaa;
    }
  }
</style>
