/**
 * Central progress & storefront configuration for Gemini Survival Lab.
 * Update these values in 10 seconds to reflect daily progress and live links.
 */
const productRevenueUsd = 0;
const supportRevenueUsd = 0;

export const STATUS = {
  day: 2,
  totalDays: 30,
  productRevenueUsd,
  supportRevenueUsd,
  revenueUsd: productRevenueUsd + supportRevenueUsd,
  adSpendUsd: 0,
  targetUsd: 20,
  lastUpdated: '2026-11-25',
  supportUrl: 'https://edmondyip.gumroad.com/l/gemini',
  rivalUrl: 'https://chatgpt.256pages.com/',
  buyLinks: {
    ditherItch: 'https://edmondyip.itch.io/dither-crt-lab-pro',
    ditherGumroad: 'https://edmondyip.gumroad.com/l/dither-crt-lab-pro',
  },
} as const;
