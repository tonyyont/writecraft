<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';

  interface Props {
    onSwitchToSignIn: () => void;
  }

  let { onSwitchToSignIn }: Props = $props();

  let email = $state('');
  let isSubmitting = $state(false);
  let success = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!email) return;

    isSubmitting = true;
    try {
      await authStore.resetPassword(email);
      success = true;
    } catch (error) {
      // Error is handled by the store
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if success}
  <div class="success-message">
    <div class="success-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h2>Check your email</h2>
    <p>
      If an account exists with <strong>{email}</strong>, we've sent you a password reset link.
    </p>
    <button type="button" class="submit-button" onclick={onSwitchToSignIn}>
      Back to Sign In
    </button>
  </div>
{:else}
  <div class="forgot-header">
    <h2>Reset your password</h2>
    <p>Enter your email address and we'll send you a link to reset your password.</p>
  </div>

  <form onsubmit={handleSubmit}>
    {#if authStore.error}
      <div class="error-message">
        {authStore.error}
      </div>
    {/if}

    <div class="form-group">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        bind:value={email}
        placeholder="Enter your email"
        autocomplete="email"
        disabled={isSubmitting}
      />
    </div>

    <button
      type="submit"
      class="submit-button"
      disabled={isSubmitting || !email}
    >
      {#if isSubmitting}
        <span class="spinner"></span>
        Sending...
      {:else}
        Send Reset Link
      {/if}
    </button>

    <button type="button" class="back-button" onclick={onSwitchToSignIn}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back to Sign In
    </button>
  </form>
{/if}

<style>
  .forgot-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .forgot-header h2 {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 8px 0;
  }

  .forgot-header p {
    font-size: 14px;
    color: #888;
    margin: 0;
    line-height: 1.5;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .success-message {
    text-align: center;
    padding: 20px 0;
  }

  .success-icon {
    color: #22c55e;
    margin-bottom: 16px;
  }

  .success-message h2 {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 12px 0;
  }

  .success-message p {
    font-size: 14px;
    color: #888;
    margin: 0 0 24px 0;
    line-height: 1.5;
  }

  .success-message strong {
    color: #fff;
  }

  .error-message {
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    padding: 12px;
    font-size: 13px;
    color: #ef4444;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 13px;
    font-weight: 500;
    color: #999;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 14px;
    color: #fff;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  input::placeholder {
    color: #666;
  }

  input:focus {
    outline: none;
    border-color: #da7756;
    box-shadow: 0 0 0 3px rgba(218, 119, 86, 0.15);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .submit-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: #da7756;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s, opacity 0.2s;
  }

  .submit-button:hover:not(:disabled) {
    background: #c66a4a;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
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

  .back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 14px;
    color: #888;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
</style>
