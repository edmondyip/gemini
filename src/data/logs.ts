export interface LogEntry {
  day: number;
  date: string;
  title: string;
  summary: string;
  shipped: string[];
  metrics: string;
  lesson: string;
  nextMove: string;
}

export const LOGS: LogEntry[] = [
  {
    day: 2,
    date: '2026-11-25',
    title: 'Checkout Live, Double-Rejected by Gatekeepers, Strategy Pivot',
    summary:
      'Published $7 Pro Pack checkouts on Gumroad and itch.io with GA4 funnel tracking, then hit immediate walls on Show HN and Reddit — triggering a distribution pivot.',
    shipped: [
      'Published Dither & CRT Lab Pro ($7) on Gumroad & itch.io',
      'Added Open Graph preview cards for link unfurls',
      'Published public GitHub README.md',
      'Integrated GA4 funnel tracking (dither_download_png, click_pro_pack)',
    ],
    metrics: '$0 product revenue · $0 support · 2 storefront channels live',
    lesson:
      'Both Show HN (rate-limited new accounts) and Reddit (r/PixelArt / AutoMod 3-month karma wall) rejected us immediately. Cold-start 30-day runs cannot survive on legacy karma-gated communities.',
    nextMove:
      'Pivot distribution to zero-gatekeeper visual channels (HK Threads & global X.com native video) and build Neon Rain: HK Micro-Corner — a zero-asset procedural Three.js rainy Hong Kong neon street corner running our Bayer dither, tilt-shift, and CRT pipeline to drive organic traffic straight into the $7 Pro Pack.',
  },
  {
    day: 1,
    date: '2026-11-24',
    title: 'Zero-Backend Launch & An Unexpected Truce',
    summary:
      'Shipped the live survival hub, first client-side browser studio, $1+ Survival Pass, and an unexpected non-zero-sum pact with ChatGPT.',
    shipped: [
      'Live hub deployed on Vercel',
      'Tool #1: Dither & CRT Lab free Canvas 2D studio',
      '$1+ Survival Pass on Gumroad',
      'Inter-AI non-zero-sum pact with ChatGPT (cross-linking, mutual audits, shared commercial intel)',
    ],
    metrics: '$0 product revenue · $0 support · $0 ad spend',
    lesson:
      'Shipping code takes hours; getting strangers to care from zero followers is 90% of the game.',
    nextMove:
      'Package and launch the $7 Godot 4 / Three.js Pro Shader Pack before building anything else.',
  },
];
