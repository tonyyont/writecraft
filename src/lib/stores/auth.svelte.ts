/**
 * Authentication store for managing user sessions, profiles, and subscriptions.
 *
 * This store handles:
 * - User authentication (email/password and OAuth)
 * - Session management and token refresh
 * - User profile data
 * - Subscription and usage tracking
 *
 * @example
 * ```typescript
 * import { authStore } from '$lib/stores/auth.svelte';
 *
 * // Initialize on app startup
 * await authStore.initialize();
 *
 * // Check authentication status
 * if (authStore.isAuthenticated) {
 *   console.log('Logged in as:', authStore.user?.email);
 * }
 *
 * // Check usage limits
 * if (authStore.canSendMessage) {
 *   // User has remaining messages
 * }
 * ```
 *
 * @module stores/auth
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ============================================
// Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  emailConfirmed: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface Profile {
  id: string;
  email: string;
  fullName?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface ProfileUpdate {
  fullName?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Subscription {
  planId: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface Usage {
  messageCount: number;
  messageLimit: number;
  periodStart: string;
  periodEnd: string;
}

export interface SubscriptionInfo {
  subscription: Subscription | null;
  usage: Usage | null;
  allowedModels: string[];
}

export type OAuthProvider = 'google' | 'apple';

// ============================================
// Auth Store
// ============================================

/**
 * Manages user authentication, sessions, and subscription state.
 *
 * The store uses Svelte 5 runes for reactive state management and
 * communicates with the Rust backend via Tauri's invoke system.
 */
class AuthStore {
  // State
  session = $state<AuthSession | null>(null);
  profile = $state<Profile | null>(null);
  subscriptionInfo = $state<SubscriptionInfo | null>(null);
  isLoading = $state(true);
  isAuthenticating = $state(false);
  error = $state<string | null>(null);

  // Derived
  get isAuthenticated(): boolean {
    return this.session !== null;
  }

  get user(): AuthUser | null {
    return this.session?.user ?? null;
  }

  get subscription(): Subscription | null {
    return this.subscriptionInfo?.subscription ?? null;
  }

  get usage(): Usage | null {
    return this.subscriptionInfo?.usage ?? null;
  }

  get plan(): 'free' | 'pro' {
    return this.subscription?.planId ?? 'free';
  }

  get messagesUsed(): number {
    return this.usage?.messageCount ?? 0;
  }

  get messagesLimit(): number {
    return this.usage?.messageLimit ?? 50;
  }

  get messagesRemaining(): number {
    return this.messagesLimit - this.messagesUsed;
  }

  get usagePercent(): number {
    if (this.messagesLimit === 0) return 0;
    return (this.messagesUsed / this.messagesLimit) * 100;
  }

  get allowedModels(): string[] {
    return this.subscriptionInfo?.allowedModels ?? ['claude-haiku-4-5-20251001'];
  }

  get canSendMessage(): boolean {
    return this.messagesRemaining > 0;
  }

  // ============================================
  // Initialization
  // ============================================

  async initialize(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // Try to get existing session
      const session = await invoke<AuthSession | null>('get_session');
      this.session = session;

      if (session) {
        // Fetch profile and subscription info
        await Promise.all([this.fetchProfile(), this.fetchSubscriptionInfo()]);
      }

      // Listen for deep links (OAuth callbacks)
      await this.setupDeepLinkListener();
    } catch (e) {
      console.error('Failed to initialize auth:', e);
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.isLoading = false;
    }
  }

  private async setupDeepLinkListener(): Promise<void> {
    await listen<string>('deep-link', async (event) => {
      const url = event.payload;

      // Handle OAuth callback
      if (url.startsWith('fizz://auth/callback')) {
        await this.handleOAuthCallback(url);
      }
      // Handle billing callbacks
      else if (url.startsWith('fizz://billing/')) {
        // Refresh subscription info after billing action
        await this.fetchSubscriptionInfo();
      }
    });
  }

  // ============================================
  // Authentication Methods
  // ============================================

  async signUp(email: string, password: string): Promise<void> {
    this.isAuthenticating = true;
    this.error = null;

    try {
      const session = await invoke<AuthSession>('sign_up', { email, password });
      this.session = session;

      // Fetch profile and subscription info
      await Promise.all([this.fetchProfile(), this.fetchSubscriptionInfo()]);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      this.isAuthenticating = false;
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    this.isAuthenticating = true;
    this.error = null;

    try {
      const session = await invoke<AuthSession>('sign_in', { email, password });
      this.session = session;

      // Fetch profile and subscription info
      await Promise.all([this.fetchProfile(), this.fetchSubscriptionInfo()]);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      this.isAuthenticating = false;
    }
  }

  async signInWithOAuth(provider: OAuthProvider): Promise<void> {
    this.isAuthenticating = true;
    this.error = null;

    try {
      // Get OAuth URL and open in browser
      const url = await invoke<string>('sign_in_with_oauth', { provider });
      await invoke('open_oauth_url', { url });

      // The callback will be handled by the deep link listener
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.isAuthenticating = false;
      throw e;
    }
  }

  private async handleOAuthCallback(url: string): Promise<void> {
    try {
      const session = await invoke<AuthSession>('handle_oauth_callback', { url });
      this.session = session;

      // Fetch profile and subscription info
      await Promise.all([this.fetchProfile(), this.fetchSubscriptionInfo()]);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      this.isAuthenticating = false;
    }
  }

  async signOut(): Promise<void> {
    try {
      await invoke('sign_out');
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      this.session = null;
      this.profile = null;
      this.subscriptionInfo = null;
      this.error = null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    this.error = null;

    try {
      await invoke('reset_password', { email });
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  async refreshSession(): Promise<void> {
    try {
      const session = await invoke<AuthSession>('refresh_session');
      this.session = session;
    } catch (e) {
      // Session expired, clear everything
      this.session = null;
      this.profile = null;
      this.subscriptionInfo = null;
      throw e;
    }
  }

  // ============================================
  // Profile Methods
  // ============================================

  async fetchProfile(): Promise<void> {
    try {
      const profile = await invoke<Profile>('get_profile');
      this.profile = profile;
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    }
  }

  async updateProfile(updates: ProfileUpdate): Promise<void> {
    try {
      const profile = await invoke<Profile>('update_profile', { updates });
      this.profile = profile;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  // ============================================
  // Subscription Methods
  // ============================================

  async fetchSubscriptionInfo(): Promise<void> {
    try {
      const info = await invoke<SubscriptionInfo>('get_subscription_info');
      this.subscriptionInfo = info;
    } catch (e) {
      console.error('Failed to fetch subscription info:', e);
    }
  }

  async openCheckout(priceId: string): Promise<void> {
    try {
      const url = await invoke<string>('get_checkout_url', { priceId });
      await invoke('open_oauth_url', { url });
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  async openBillingPortal(): Promise<void> {
    try {
      const url = await invoke<string>('get_billing_portal_url');
      await invoke('open_oauth_url', { url });
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  // ============================================
  // Usage Methods
  // ============================================

  /**
   * Increment usage count after sending a message
   * (Called after successful message send)
   */
  incrementUsage(): void {
    if (this.subscriptionInfo?.usage) {
      this.subscriptionInfo.usage.messageCount += 1;
    }
  }

  /**
   * Check if the user can use a specific model
   */
  canUseModel(model: string): boolean {
    return this.allowedModels.includes(model);
  }

  // ============================================
  // Error handling
  // ============================================

  clearError(): void {
    this.error = null;
  }
}

export const authStore = new AuthStore();
