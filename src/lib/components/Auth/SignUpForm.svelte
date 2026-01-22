<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import OAuthButtons from './OAuthButtons.svelte';

  interface Props {
    onSwitchToSignIn: () => void;
  }

  let { onSwitchToSignIn }: Props = $props();

  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let showPassword = $state(false);
  let signUpSuccess = $state(false);

  let passwordError = $derived.by(() => {
    if (!password) return null;
    if (password.length < 8) return 'Password must be at least 8 characters';
    return null;
  });

  let confirmError = $derived.by(() => {
    if (!confirmPassword) return null;
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  });

  let isValid = $derived(
    email &&
    password &&
    confirmPassword &&
    !passwordError &&
    !confirmError
  );

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!isValid) return;

    try {
      await authStore.signUp(email, password);
      signUpSuccess = true;
    } catch (error) {
      // Error is handled by the store
    }
  }
</script>

{#if signUpSuccess}
  <div class="success-message">
    <div class="success-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h2>Check your email</h2>
    <p>
      We've sent a verification link to <strong>{email}</strong>.
      Please click the link to verify your account.
    </p>
    <button type="button" class="submit-button" onclick={onSwitchToSignIn}>
      Back to Sign In
    </button>
  </div>
{:else}
  <form onsubmit={handleSubmit}>
    <OAuthButtons />

    <div class="divider">
      <span>or continue with email</span>
    </div>

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
        disabled={authStore.isAuthenticating}
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <div class="password-input">
        <input
          type={showPassword ? 'text' : 'password'}
          id="password"
          bind:value={password}
          placeholder="Create a password"
          autocomplete="new-password"
          disabled={authStore.isAuthenticating}
        />
        <button
          type="button"
          class="toggle-password"
          onclick={() => showPassword = !showPassword}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      {#if passwordError}
        <span class="field-error">{passwordError}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="confirmPassword">Confirm Password</label>
      <input
        type={showPassword ? 'text' : 'password'}
        id="confirmPassword"
        bind:value={confirmPassword}
        placeholder="Confirm your password"
        autocomplete="new-password"
        disabled={authStore.isAuthenticating}
      />
      {#if confirmError}
        <span class="field-error">{confirmError}</span>
      {/if}
    </div>

    <button
      type="submit"
      class="submit-button"
      disabled={authStore.isAuthenticating || !isValid}
    >
      {#if authStore.isAuthenticating}
        <span class="spinner"></span>
        Creating account...
      {:else}
        Create Account
      {/if}
    </button>

    <p class="switch-text">
      Already have an account?
      <button type="button" class="link-button" onclick={onSwitchToSignIn}>
        Sign in
      </button>
    </p>
  </form>
{/if}

<style>
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

  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }

  .divider span {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
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

  .password-input {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-input input {
    padding-right: 60px;
  }

  .toggle-password {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    color: #888;
    font-size: 12px;
    cursor: pointer;
    padding: 4px;
  }

  .toggle-password:hover {
    color: #fff;
  }

  .field-error {
    font-size: 12px;
    color: #ef4444;
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
    margin-top: 8px;
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

  .switch-text {
    text-align: center;
    font-size: 13px;
    color: #888;
    margin-top: 8px;
  }

  .link-button {
    background: none;
    border: none;
    color: #da7756;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    padding: 0;
  }

  .link-button:hover {
    text-decoration: underline;
  }
</style>
