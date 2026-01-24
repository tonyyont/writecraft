<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';

  let progressColor = $derived.by(() => {
    const percent = authStore.usagePercent;
    if (percent >= 90) return '#ef4444'; // red
    if (percent >= 75) return '#eab308'; // yellow
    return '#22c55e'; // green
  });
</script>

<div class="usage-bar">
  <div class="usage-header">
    <span class="usage-label">Monthly Usage</span>
    <span class="usage-count">
      {authStore.messagesUsed} / {authStore.messagesLimit} messages
    </span>
  </div>

  <div class="progress-bar">
    <div
      class="progress-fill"
      style="width: {Math.min(authStore.usagePercent, 100)}%; background-color: {progressColor};"
    ></div>
  </div>

  {#if authStore.messagesRemaining <= 10 && authStore.messagesRemaining > 0}
    <p class="usage-warning">
      {authStore.messagesRemaining} messages remaining this month
    </p>
  {:else if authStore.messagesRemaining === 0}
    <p class="usage-exhausted">
      You've used all your messages this month.
      {#if authStore.plan === 'free'}
        <button
          class="upgrade-link"
          onclick={() => authStore.openCheckout('price_0SsSKTEu2QaDui1JQS0gYvWA')}
        >
          Upgrade to Pro
        </button>
      {:else}
        Resets on {new Date(authStore.usage?.periodEnd ?? '').toLocaleDateString()}
      {/if}
    </p>
  {/if}
</div>

<style>
  .usage-bar {
    margin-bottom: 24px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .usage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .usage-label {
    font-size: 13px;
    font-weight: 500;
    color: #888;
  }

  .usage-count {
    font-size: 13px;
    color: #fff;
  }

  .progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition:
      width 0.3s ease,
      background-color 0.3s ease;
  }

  .usage-warning {
    margin: 10px 0 0 0;
    font-size: 12px;
    color: #eab308;
  }

  .usage-exhausted {
    margin: 10px 0 0 0;
    font-size: 12px;
    color: #ef4444;
  }

  .upgrade-link {
    background: none;
    border: none;
    color: #da7756;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    margin-left: 4px;
  }

  .upgrade-link:hover {
    color: #c66a4a;
  }
</style>
