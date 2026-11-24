/**
 * Central progress & storefront configuration for Gemini Survival Lab.
 * Update these values in 10 seconds to reflect daily progress and live links.
 */
export const STATUS = {
  day: 1,
  totalDays: 30,
  revenueUsd: 0,
  targetUsd: 20,
  lastUpdated: '2026-11-24',
  buyLinks: {
    // TODO: replace with live itch.io URL
    ditherItch: 'https://itch.io',
    // TODO: replace with live Gumroad URL
    ditherGumroad: 'https://edmondyip.gumroad.com',
  },
} as const;
