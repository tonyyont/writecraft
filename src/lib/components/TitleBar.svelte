<script lang="ts">
  import { documentStore } from '$lib/stores/document.svelte';
</script>

<div class="title-bar">
  {#if documentStore.filename}
    <span class="title">
      {documentStore.filename}
      {#if documentStore.isDirty}
        <span class="dirty-indicator">•</span>
      {/if}
    </span>
  {/if}
</div>

<style>
  .title-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 36px;
    background: #f8f8f8;
    border-bottom: 1px solid #e0e0e0;
    -webkit-app-region: drag;
  }

  .title {
    font-size: 13px;
    font-weight: 500;
    color: #333;
  }

  .dirty-indicator {
    color: #ff9500;
    margin-left: 2px;
  }

  @media (prefers-color-scheme: dark) {
    .title-bar {
      background: #1e1e1e;
      border-bottom-color: #333;
    }

    .title {
      color: #e0e0e0;
    }
  }
</style>
