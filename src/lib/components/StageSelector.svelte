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
      {@const isCompleted = stages.indexOf(documentStore.sidecar.stage) > index}
      {@const isActive = documentStore.sidecar.stage === stage}
      <button
        class="stage-pill"
        class:active={isActive}
        class:completed={isCompleted}
        onclick={() => handleStageChange(stage)}
        title={stageDescriptions[stage]}
      >
        <span class="stage-indicator">
          {#if isCompleted}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {:else}
            {index + 1}
          {/if}
        </span>
        <span class="stage-name">{formatStageName(stage)}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .stage-selector {
    display: flex;
    flex-direction: column;
    gap: 4px;
    -webkit-app-region: no-drag;
  }

  .stage-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    color: #666;
    transition: background 0.15s ease, color 0.15s ease;
    white-space: nowrap;
    text-align: left;
  }

  .stage-pill:hover {
    background: #f5f5f5;
  }

  .stage-pill.active {
    background: #007aff;
    color: #fff;
  }

  .stage-pill.active:hover {
    background: #0066d6;
  }

  .stage-pill.active .stage-indicator {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .stage-pill.completed:not(.active) {
    color: #34c759;
  }

  .stage-pill.completed:not(.active) .stage-indicator {
    background: rgba(52, 199, 89, 0.15);
    color: #34c759;
  }

  .stage-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #e8e8e8;
    font-size: 12px;
    font-weight: 500;
    color: #666;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .stage-name {
    font-size: 12px;
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .stage-pill {
      color: #999;
    }

    .stage-pill:hover {
      background: #2a2a2a;
    }

    .stage-pill.active {
      background: #007aff;
      color: #fff;
    }

    .stage-pill.active:hover {
      background: #0066d6;
    }

    .stage-pill.active .stage-indicator {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .stage-pill.completed:not(.active) {
      color: #32d74b;
    }

    .stage-pill.completed:not(.active) .stage-indicator {
      background: rgba(50, 215, 75, 0.15);
      color: #32d74b;
    }

    .stage-indicator {
      background: #3a3a3a;
      color: #999;
    }
  }
</style>
