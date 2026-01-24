/**
 * Billing configuration constants
 * Centralized location for Stripe price IDs and billing-related values
 */

// Stripe Price IDs (from Stripe dashboard)
// Product: Pro Plan (prod_Tq8bmYhN4SYG1I)
export const PRO_PRICE_ID = 'price_0SsSKTEu2QaDui1JQS0gYvWA';

// Pricing (display price - update when changing Stripe price)
export const PRO_MONTHLY_PRICE = 1; // $1/month in test mode

// Plan limits
export const FREE_MESSAGE_LIMIT = 50;
export const PRO_MESSAGE_LIMIT = 1000; // Displayed as "unlimited" to users

// Upgrade banner threshold (show when this many messages remaining)
export const UPGRADE_BANNER_THRESHOLD = 10;
