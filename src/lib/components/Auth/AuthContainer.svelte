<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import SignInForm from './SignInForm.svelte';
  import SignUpForm from './SignUpForm.svelte';
  import ForgotPassword from './ForgotPassword.svelte';

  type AuthView = 'signin' | 'signup' | 'forgot';

  let currentView = $state<AuthView>('signin');

  function switchToSignIn() {
    currentView = 'signin';
    authStore.clearError();
  }

  function switchToSignUp() {
    currentView = 'signup';
    authStore.clearError();
  }

  function switchToForgot() {
    currentView = 'forgot';
    authStore.clearError();
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <div class="logo">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M16 28c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="24" cy="18" r="4" stroke="currentColor" stroke-width="2.5" fill="none"/>
        </svg>
      </div>
      <h1>WriteCraft</h1>
      <p class="tagline">AI-powered writing assistant</p>
    </div>

    {#if currentView === 'signin'}
      <SignInForm
        onSwitchToSignUp={switchToSignUp}
        onSwitchToForgot={switchToForgot}
      />
    {:else if currentView === 'signup'}
      <SignUpForm
        onSwitchToSignIn={switchToSignIn}
      />
    {:else if currentView === 'forgot'}
      <ForgotPassword
        onSwitchToSignIn={switchToSignIn}
      />
    {/if}
  </div>

  <div class="auth-footer">
    <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
  </div>
</div>

<style>
  .auth-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
    background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    background: #1e1e1e;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .auth-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .logo {
    margin-bottom: 16px;
    color: #da7756;
  }

  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .tagline {
    font-size: 14px;
    color: #888;
    margin: 0;
  }

  .auth-footer {
    margin-top: 24px;
    text-align: center;
  }

  .auth-footer p {
    font-size: 12px;
    color: #666;
    margin: 0;
  }
</style>
