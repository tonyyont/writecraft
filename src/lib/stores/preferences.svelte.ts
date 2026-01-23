/**
 * Preferences store for theme and appearance settings
 * Supports light, dark, and system theme modes
 */

type Theme = 'light' | 'dark' | 'system';

class PreferencesStore {
  theme = $state<Theme>('system');
  private initialized = false;

  /**
   * Set the theme and persist to localStorage
   */
  setTheme(newTheme: Theme) {
    this.theme = newTheme;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('writecraft-theme', newTheme);
    }
    this.applyTheme();
  }

  /**
   * Apply the current theme to the document
   */
  private applyTheme() {
    if (typeof window === 'undefined') return;

    const isDark =
      this.theme === 'dark' ||
      (this.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }

  /**
   * Initialize the store - load saved preferences and apply theme
   */
  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('writecraft-theme') as Theme | null;
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        this.theme = saved;
      }
    }

    this.applyTheme();

    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme === 'system') {
          this.applyTheme();
        }
      });
    }
  }

  /**
   * Get the effective theme (resolved system to actual light/dark)
   */
  get effectiveTheme(): 'light' | 'dark' {
    if (this.theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return this.theme;
  }
}

export const preferencesStore = new PreferencesStore();
