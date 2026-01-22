<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import OAuthButtons from './OAuthButtons.svelte';

  interface Props {
    onSwitchToSignUp: () => void;
    onSwitchToForgot: () => void;
  }

  let { onSwitchToSignUp, onSwitchToForgot }: Props = $props();

  let email = $state('');
  let password = $state('');
  let showPassword = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    try {
      await authStore.signIn(email, password);
    } catch (error) {
      // Error is handled by the store
    }
  }
</script>

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
        placeholder="Enter your password"
        autocomplete="current-password"
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
  </div>

  <button
    type="button"
    class="forgot-link"
    onclick={onSwitchToForgot}
  >
    Forgot password?
  </button>

  <button
    type="submit"
    class="submit-button"
    disabled={authStore.isAuthenticating || !email || !password}
  >
    {#if authStore.isAuthenticating}
      <span class="spinner"></span>
      Signing in...
    {:else}
      Sign In
    {/if}
  </button>

  <p class="switch-text">
    Don't have an account?
    <button type="button" class="link-button" onclick={onSwitchToSignUp}>
      Sign up
    </button>
  </p>
</form>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
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

  .forgot-link {
    align-self: flex-end;
    background: none;
    border: none;
    color: #888;
    font-size: 13px;
    cursor: pointer;
    padding: 0;
  }

  .forgot-link:hover {
    color: #da7756;
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
