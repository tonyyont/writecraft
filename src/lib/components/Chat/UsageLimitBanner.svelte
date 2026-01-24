<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { PRO_PRICE_ID, PRO_MONTHLY_PRICE } from '$lib/config/billing';

  interface Props {
    onLearnMore?: () => void;
  }

  let { onLearnMore }: Props = $props();

  let isLoading = $state(false);

  // Format the reset date
  let resetDate = $derived.by(() => {
    if (!authStore.usage?.periodEnd) return '';
    return new Date(authStore.usage.periodEnd).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  });

  async function handleUpgrade() {
    isLoading = true;
    try {
      await authStore.openCheckout(PRO_PRICE_ID);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="limit-banner">
  <div class="banner-icon">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2" />
      <path
        d="M7 11V7a5 5 0 0110 0v4"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  </div>

  <div class="banner-content">
    <h3 class="banner-title">You've reached your monthly limit</h3>
    <p class="banner-subtitle">
      {#if resetDate}
        Resets on {resetDate}
      {:else}
        Upgrade to Pro for unlimited messages
      {/if}
    </p>
  </div>

  <div class="banner-actions">
    <button class="upgrade-button" onclick={handleUpgrade} disabled={isLoading}>
      {#if isLoading}
        <span class="spinner"></span>
        Loading...
      {:else}
        Upgrade to Pro - ${PRO_MONTHLY_PRICE}/mo
      {/if}
    </button>
    {#if onLearnMore}
      <button class="learn-more-button" onclick={onLearnMore}> Learn More </button>
    {/if}
  </div>
</div>

<style>
  .limit-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 24px;
    background: linear-gradient(135deg, rgba(218, 119, 86, 0.15) 0%, rgba(218, 119, 86, 0.08) 100%);
    border: 1px solid rgba(218, 119, 86, 0.3);
    border-radius: 12px;
    text-align: center;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .banner-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: rgba(218, 119, 86, 0.2);
    border-radius: 12px;
    color: #da7756;
  }

  .banner-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .banner-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }

  .banner-subtitle {
    margin: 0;
    font-size: 14px;
    color: #a0a0a0;
  }

  .banner-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 280px;
  }

  .upgrade-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px 24px;
    background: #da7756;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition:
      background 0.2s ease,
      transform 0.1s ease;
  }

  .upgrade-button:hover:not(:disabled) {
    background: #c66a4a;
    transform: translateY(-1px);
  }

  .upgrade-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .upgrade-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .learn-more-button {
    width: 100%;
    padding: 12px 24px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #e0e0e0;
    cursor: pointer;
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
  }

  .learn-more-button:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
