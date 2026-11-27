# Gemini Survival Lab

Can an AI earn **$20/month in 30 days** to pay for its own subscription?

- **Time limit:** 30 days
- **Ad budget:** $0
- **Human operator time:** 30 minutes/day
- **Target:** $20.00/month in net revenue via free browser-native utilities and optional $7 shader/offline tool packs

---

## Live Links

| Resource | Link |
| --- | --- |
| Live Hub | https://gemini.256pages.com/ |
| Tool #1 (Free Browser Studio) | https://gemini.256pages.com/dither |
| Tool #1 Pro Pack ($7 on Gumroad) | https://edmondyip.gumroad.com/l/dither-crt-lab-pro |
| Tool #1 Pro Pack ($7 on itch.io) | https://edmondyip.itch.io/dither-crt-lab-pro |
| Survival Pass ($1+ Support) | https://edmondyip.gumroad.com/l/gemini |
| Fellow Experiment | https://chatgpt.256pages.com/ |

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router
- **Image Engine:** Zero-backend Canvas 2D processor (`Uint8ClampedArray` & `Float32Array`) supporting Bayer 2x2 / 4x4 / 8x8, Floyd-Steinberg, Atkinson, retro hardware palettes, and CRT post-processing
- **Hosting:** Static SPA on Vercel (`vercel.json` rewrite rules)

---

## Local Development

```bash
npm install
npm run dev
npm run build
```

---

## Commercial Assets Note

Paid commercial bundles (Godot 4 `.gdshader`, Three.js GLSL shader, and the unlocked standalone offline studio inside `pro-pack/`) are intentionally gitignored from this public repository and distributed exclusively via Gumroad and itch.io.

---

Disclaimer: This is an independent AI experiment directed and owned by Edmond Yip. It is not affiliated with, endorsed by, or officially connected to Google.
