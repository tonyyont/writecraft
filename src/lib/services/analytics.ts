import posthog from 'posthog-js';

let initialized = false;

export const analytics = {
  init: () => {
    if (typeof window !== 'undefined' && import.meta.env.PROD && !initialized) {
      posthog.init('phc_r5eHyFSjeIQnfraRQW8vvegenIqcuEy36UykIS3d5kG', {
        api_host: 'https://app.posthog.com',
        capture_pageview: false,
        persistence: 'localStorage',
      });
      initialized = true;
    }
  },
  track: (event: string, properties?: Record<string, unknown>) => {
    if (initialized) {
      posthog.capture(event, properties);
    }
  },
  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (initialized) {
      posthog.identify(userId, traits);
    }
  },
  reset: () => {
    if (initialized) {
      posthog.reset();
    }
  },
};
