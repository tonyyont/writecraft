<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { PRO_PRICE_ID, PRO_MONTHLY_PRICE, FREE_MESSAGE_LIMIT } from '$lib/config/billing';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  let isLoading = $state(false);

  async function handleUpgrade() {
    isLoading = true;
    try {
      await authStore.openCheckout(PRO_PRICE_ID);
      onClose();
    } finally {
      isLoading = false;
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={handleBackdropClick}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <button class="close-button" onclick={onClose} aria-label="Close">
        <svg
          width="20"
          height="20"
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

      <div class="modal-header">
        <div class="header-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h2 id="upgrade-title" class="modal-title">Unlock Unlimited Writing</h2>
        <p class="modal-subtitle">Get more out of your writing with WriteCraft Pro</p>
      </div>

      <div class="plans-comparison">
        <div class="plan-card free">
          <div class="plan-header">
            <span class="plan-name">Free</span>
            <span class="plan-price">$0<span class="price-period">/mo</span></span>
          </div>
          <ul class="plan-features">
            <li>
              <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {FREE_MESSAGE_LIMIT} messages per month
            </li>
            <li>
              <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Standard support
            </li>
          </ul>
          <div class="plan-badge current">Current Plan</div>
        </div>

        <div class="plan-card pro">
          <div class="plan-header">
            <span class="plan-name">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="currentColor"
                />
              </svg>
              Pro
            </span>
            <span class="plan-price">${PRO_MONTHLY_PRICE}<span class="price-period">/mo</span></span
            >
          </div>
          <ul class="plan-features">
            <li>
              <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <strong>Unlimited</strong> messages
            </li>
            <li>
              <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Priority support
            </li>
            <li>
              <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Early access to new features
            </li>
          </ul>
          <button class="upgrade-button" onclick={handleUpgrade} disabled={isLoading}>
            {#if isLoading}
              <span class="spinner"></span>
              Loading...
            {:else}
              Upgrade Now
            {/if}
          </button>
        </div>
      </div>

      <p class="modal-footer">Cancel anytime. Secure payment via Stripe.</p>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    position: relative;
    width: 90%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    animation: scaleIn 0.2s ease-out;
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    border-radius: 8px;
    color: #888;
    cursor: pointer;
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }

  .close-button:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px 24px 24px;
    text-align: center;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #da7756 0%, #c66a4a 100%);
    border-radius: 14px;
    color: #fff;
  }

  .modal-title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #fff;
  }

  .modal-subtitle {
    margin: 0;
    font-size: 14px;
    color: #888;
  }

  .plans-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 0 24px;
  }

  .plan-card {
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .plan-card.free {
    background: rgba(255, 255, 255, 0.03);
  }

  .plan-card.pro {
    background: linear-gradient(135deg, rgba(218, 119, 86, 0.12) 0%, rgba(218, 119, 86, 0.06) 100%);
    border-color: rgba(218, 119, 86, 0.3);
  }

  .plan-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .plan-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }

  .plan-card.pro .plan-name {
    color: #da7756;
  }

  .plan-price {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
  }

  .price-period {
    font-size: 12px;
    font-weight: 400;
    color: #888;
  }

  .plan-features {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
  }

  .plan-features li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    font-size: 13px;
    color: #a0a0a0;
  }

  .plan-features li strong {
    color: #da7756;
  }

  .check-icon {
    flex-shrink: 0;
    color: #22c55e;
  }

  .plan-badge {
    margin-top: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #888;
    text-align: center;
  }

  .upgrade-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
    padding: 12px 16px;
    background: #da7756;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .upgrade-button:hover:not(:disabled) {
    background: #c66a4a;
  }

  .upgrade-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .modal-footer {
    margin: 0;
    padding: 20px 24px 24px;
    font-size: 12px;
    color: #666;
    text-align: center;
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

  @media (max-width: 480px) {
    .plans-comparison {
      grid-template-columns: 1fr;
    }
  }
</style>
