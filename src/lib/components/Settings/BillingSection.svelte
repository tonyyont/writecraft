<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { PRO_PRICE_ID, PRO_MONTHLY_PRICE, FREE_MESSAGE_LIMIT } from '$lib/config/billing';

  let isLoading = $state(false);
  let error = $state<string | null>(null);

  async function handleUpgrade() {
    isLoading = true;
    error = null;

    try {
      await authStore.openCheckout(PRO_PRICE_ID);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading = false;
    }
  }

  async function handleManageBilling() {
    isLoading = true;
    error = null;

    try {
      await authStore.openBillingPortal();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading = false;
    }
  }

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  let isPro = $derived(authStore.plan === 'pro');
  let isCanceled = $derived(authStore.subscription?.cancelAtPeriodEnd ?? false);
</script>

<div class="billing-section">
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if isPro}
    <!-- Pro User View -->
    <div class="current-plan pro">
      <div class="plan-badge">
        <svg
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
        Pro Plan
      </div>
      <p class="plan-benefit">Unlimited messages</p>
      {#if isCanceled}
        <div class="canceled-notice">
          Your subscription will end on {formatDate(authStore.subscription?.currentPeriodEnd)}
        </div>
      {:else}
        <div class="renewal-info">
          Renews {formatDate(authStore.subscription?.currentPeriodEnd)}
        </div>
      {/if}
    </div>

    <button class="manage-button" onclick={handleManageBilling} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Manage Subscription'}
    </button>
  {:else}
    <!-- Free User View -->
    <div class="current-plan free">
      <div class="plan-label">Current Plan</div>
      <h3>Free</h3>
      <p class="plan-limit">{FREE_MESSAGE_LIMIT} messages per month</p>
    </div>

    <!-- Upgrade Promotion -->
    <div class="upgrade-promo">
      <div class="promo-header">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill="currentColor"
          />
        </svg>
        <span>Upgrade to Pro</span>
      </div>
      <div class="promo-benefit">
        <span class="benefit-highlight">Unlimited messages</span>
        <span class="benefit-price">${PRO_MONTHLY_PRICE}/month</span>
      </div>
      <button class="upgrade-button" onclick={handleUpgrade} disabled={isLoading}>
        {#if isLoading}
          <span class="spinner"></span>
          Loading...
        {:else}
          Upgrade Now
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .billing-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .error-message {
    padding: 12px;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    font-size: 13px;
    color: #ef4444;
  }

  .current-plan {
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .current-plan.free {
    background: rgba(255, 255, 255, 0.03);
  }

  .current-plan.pro {
    background: linear-gradient(135deg, rgba(218, 119, 86, 0.15) 0%, rgba(218, 119, 86, 0.05) 100%);
    border-color: rgba(218, 119, 86, 0.3);
  }

  .plan-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #666;
    margin-bottom: 4px;
  }

  .current-plan h3 {
    margin: 0 0 4px 0;
    font-size: 24px;
    font-weight: 600;
    color: #fff;
  }

  .plan-limit {
    margin: 0;
    font-size: 14px;
    color: #888;
  }

  .plan-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(218, 119, 86, 0.2);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    color: #da7756;
    margin-bottom: 12px;
  }

  .plan-benefit {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 500;
    color: #fff;
  }

  .renewal-info {
    font-size: 13px;
    color: #888;
  }

  .canceled-notice {
    padding: 8px 12px;
    background: rgba(234, 179, 8, 0.15);
    border-radius: 6px;
    font-size: 13px;
    color: #eab308;
  }

  .upgrade-promo {
    padding: 20px;
    background: linear-gradient(135deg, rgba(218, 119, 86, 0.12) 0%, rgba(218, 119, 86, 0.04) 100%);
    border: 1px solid rgba(218, 119, 86, 0.25);
    border-radius: 12px;
  }

  .promo-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #da7756;
    margin-bottom: 12px;
  }

  .promo-benefit {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .benefit-highlight {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
  }

  .benefit-price {
    font-size: 14px;
    color: #888;
  }

  .upgrade-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px 20px;
    background: #da7756;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s;
  }

  .upgrade-button:hover:not(:disabled) {
    background: #c66a4a;
  }

  .upgrade-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .manage-button {
    padding: 12px 16px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    transition:
      background 0.2s,
      border-color 0.2s;
  }

  .manage-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .manage-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
