<script lang="ts">
  import { authStore, type OAuthProvider } from '$lib/stores/auth.svelte';

  async function handleOAuth(provider: OAuthProvider) {
    try {
      await authStore.signInWithOAuth(provider);
    } catch (error) {
      // Error is handled by the store
    }
  }
</script>

<div class="oauth-buttons">
  <button
    type="button"
    class="oauth-button google"
    onclick={() => handleOAuth('google')}
    disabled={authStore.isAuthenticating}
  >
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
    <span>Continue with Google</span>
  </button>

  <!-- Apple Sign-In disabled - requires additional setup -->
  <!-- <button
    type="button"
    class="oauth-button apple"
    onclick={() => handleOAuth('apple')}
    disabled={authStore.isAuthenticating}
  >
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.94 15.012c-.668.979-1.392 1.95-2.486 1.968-1.088.019-1.438-.648-2.683-.648-1.245 0-1.632.63-2.664.667-1.07.037-1.886-1.057-2.561-2.03-1.38-1.99-2.435-5.625-1.018-8.08.7-1.217 1.95-1.986 3.31-2.005 1.051-.02 2.042.71 2.684.71.64 0 1.842-.877 3.104-.748.528.022 2.013.214 2.966 1.614-.077.048-1.77 1.034-1.753 3.087.02 2.453 2.152 3.27 2.177 3.28-.023.067-.34 1.166-1.119 2.31M11.37.37c-.648.756-1.702 1.346-2.737 1.268-.133-.983.36-2.022.926-2.664.648-.736 1.74-1.288 2.641-1.322.115 1.003-.298 1.99-.83 2.718" fill="currentColor"/>
    </svg>
    <span>Continue with Apple</span>
  </button> -->
</div>

<style>
  .oauth-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .oauth-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .oauth-button:hover:not(:disabled) {
    background: #333;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .oauth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .oauth-button svg {
    flex-shrink: 0;
  }
</style>
