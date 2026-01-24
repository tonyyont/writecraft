<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { PRO_PRICE_ID } from '$lib/config/billing';

  interface Props {
    onDismiss?: () => void;
  }

  let { onDismiss }: Props = $props();

  let isLoading = $state(false);

  async function handleUpgrade() {
    isLoading = true;
    try {
      await authStore.openCheckout(PRO_PRICE_ID);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="upgrade-banner">
  <div class="banner-content">
    <svg
      class="sparkle-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="currentColor"
      />
    </svg>
    <span class="banner-text">
      Only <strong>{authStore.messagesRemaining}</strong> messages left this month
    </span>
  </div>

  <div class="banner-actions">
    <button class="upgrade-button" onclick={handleUpgrade} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Upgrade'}
    </button>
    {#if onDismiss}
      <button class="dismiss-button" onclick={onDismiss} aria-label="Dismiss">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .upgrade-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: linear-gradient(135deg, rgba(218, 119, 86, 0.12) 0%, rgba(218, 119, 86, 0.06) 100%);
    border: 1px solid rgba(218, 119, 86, 0.25);
    border-radius: 10px;
    margin-bottom: 12px;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sparkle-icon {
    color: #da7756;
    flex-shrink: 0;
  }

  .banner-text {
    font-size: 13px;
    color: #e0e0e0;
  }

  .banner-text strong {
    color: #da7756;
    font-weight: 600;
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .upgrade-button {
    padding: 6px 14px;
    background: #da7756;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .upgrade-button:hover:not(:disabled) {
    background: #c66a4a;
  }

  .upgrade-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .dismiss-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #888;
    cursor: pointer;
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }

  .dismiss-button:hover {
    color: #e0e0e0;
    background: rgba(255, 255, 255, 0.05);
  }
</style>
