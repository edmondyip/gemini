import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LOGS } from '../data/logs';
import { STATUS } from '../data/status';
import {
  DEFAULT_DITHER_PARAMS,
  PaletteId,
  renderDitherToCanvas,
} from '../engine/ditherEngine';
import { renderProceduralScene } from '../engine/scenes';
import { trackEvent } from '../utils/analytics';

const QUICK_PALETTES: Array<{ id: PaletteId; label: string }> = [
  { id: 'ink', label: '1-Bit Ink' },
  { id: 'gameboy', label: 'Game Boy' },
  { id: 'amber', label: 'Amber CRT' },
];

const UPCOMING_RELEASES = [
  {
    index: '02',
    title: 'Procedural Tile & 9-Slice UI Forge',
    eta: 'WEEK 2',
    description: 'Seamless pixel textures & UI borders in browser',
  },
  {
    index: '03',
    title: 'Dev Changelog Card Studio',
    eta: 'WEEK 3',
    description: 'Clean release graphics for indie developers',
  },
];

export function HomePage() {
  const [activePalette, setActivePalette] = useState<PaletteId>('ink');
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const neonPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestLog = [...LOGS].sort((a, b) => b.day - a.day)[0];

  const sourceScene = useMemo(() => {
    return renderProceduralScene('sphere', 480, 300);
  }, []);

  useEffect(() => {
    const target = previewCanvasRef.current;
    if (!target) return;
    renderDitherToCanvas(sourceScene, target, {
      ...DEFAULT_DITHER_PARAMS,
      algorithm: 'bayer4',
      paletteId: activePalette,
      pixelScale: 2,
      contrast: 10,
      crtEnabled: activePalette === 'amber',
      scanlines: 35,
      rgbSplit: 1,
      vignette: 20,
    });
  }, [sourceScene, activePalette]);

  useEffect(() => {
    const canvas = neonPreviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Deep midnight indigo sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#070b14');
    sky.addColorStop(0.68, '#0c1324');
    sky.addColorStop(1, '#090d18');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Subtle HK tenement silhouettes
    ctx.fillStyle = '#131a29';
    ctx.fillRect(42, 34, 155, 178);
    ctx.fillRect(190, 56, 130, 156);
    ctx.fillRect(352, 44, 88, 168);

    // Warm apartment window grid
    const winColors = ['#ffd485', '#7fd4ff', '#ffaa55', '#1d2536'];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        ctx.fillStyle = winColors[(row * 3 + col) % winColors.length];
        ctx.fillRect(58 + col * 27, 48 + row * 34, 14, 18);
      }
    }
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillStyle = winColors[(row + col * 2) % winColors.length];
        ctx.fillRect(206 + col * 28, 70 + row * 34, 14, 18);
      }
    }

    // Glowing ground-floor Cha Chaan Teng (冰室) storefront
    ctx.fillStyle = '#ffa844';
    ctx.fillRect(52, 172, 138, 38);
    ctx.fillStyle = '#243442';
    ctx.fillRect(46, 162, 150, 10);

    // Wet street surface
    ctx.fillStyle = '#101522';
    ctx.fillRect(0, 212, w, h - 212);

    // Helper for crisp glowing HK neon signs + wet street reflections
    const drawNeon = (
      x: number,
      y: number,
      sw: number,
      sh: number,
      text: string,
      color: string,
      vertical: boolean
    ) => {
      ctx.save();
      ctx.fillStyle = '#070a12';
      ctx.fillRect(x, y, sw, sh);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, sw, sh);

      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (vertical) {
        const chars = Array.from(text);
        ctx.font = 'bold 20px sans-serif';
        chars.forEach((ch, idx) => {
          ctx.fillText(ch, x + sw / 2, y + 22 + idx * 28);
        });
      } else {
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(text, x + sw / 2, y + sh / 2 + 1);
      }

      // Wet asphalt reflection streak below
      const refGrad = ctx.createLinearGradient(0, 214, 0, h);
      refGrad.addColorStop(0, `${color}66`);
      refGrad.addColorStop(1, `${color}00`);
      ctx.shadowBlur = 0;
      ctx.fillStyle = refGrad;
      ctx.fillRect(x + 4, 216, Math.max(18, sw - 8), 72);
      ctx.restore();
    };

    drawNeon(112, 84, 78, 36, '冰室', '#ff2a85', false);
    drawNeon(220, 44, 42, 74, '大押', '#ff3344', true);
    drawNeon(290, 74, 42, 74, '霓虹', '#00e5ff', true);
    drawNeon(360, 106, 66, 32, '夜市', '#ffb020', false);

    // Stylized red HK taxi silhouette with headlights
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(156, 232, 48, 16);
    ctx.fillStyle = '#d9dee6';
    ctx.fillRect(166, 224, 26, 9);
    ctx.fillStyle = 'rgba(255, 234, 175, 0.35)';
    ctx.beginPath();
    ctx.moveTo(204, 238);
    ctx.lineTo(266, 226);
    ctx.lineTo(266, 252);
    ctx.closePath();
    ctx.fill();

    // Diagonal rain streaks
    ctx.strokeStyle = 'rgba(170, 212, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 65; i++) {
      const rx = ((i * 73) % w);
      const ry = ((i * 47) % h);
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 5, ry + 16);
    }
    ctx.stroke();

    // Subtle Tilt-Shift focus vignette
    const vig = ctx.createLinearGradient(0, 0, 0, h);
    vig.addColorStop(0, 'rgba(7, 11, 20, 0.45)');
    vig.addColorStop(0.25, 'rgba(7, 11, 20, 0)');
    vig.addColorStop(0.75, 'rgba(7, 11, 20, 0)');
    vig.addColorStop(1, 'rgba(7, 11, 20, 0.45)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }, []);

  useEffect(() => {
    const canvas = poolPreviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Warm cream limestone deck surround
    ctx.fillStyle = '#efe5d4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#dfd1ba';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Black-and-white checkered ceramic coping rim
    const px = 54;
    const py = 36;
    const pw = w - 108;
    const ph = h - 72;
    const rim = 14;
    for (let x = px - rim; x < px + pw + rim; x += 14) {
      for (let y = py - rim; y < py + ph + rim; y += 14) {
        if (x >= px && x < px + pw && y >= py && y < py + ph) continue;
        const dark = ((Math.floor(x / 14) + Math.floor(y / 14)) % 2) === 0;
        ctx.fillStyle = dark ? '#1f242b' : '#faf8f4';
        ctx.fillRect(x, y, 14, 14);
      }
    }

    // Sunlit turquoise pool interior
    const waterGrad = ctx.createLinearGradient(px, py, px, py + ph);
    waterGrad.addColorStop(0, '#5ec7e4');
    waterGrad.addColorStop(1, '#36a6c9');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(px, py, pw, ph);

    // Subtle mosaic grid & sunlit caustics
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    for (let x = px; x <= px + pw; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x, py + ph);
      ctx.stroke();
    }
    for (let y = py; y <= py + ph; y += 18) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + pw, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(225, 252, 255, 0.42)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 18; i++) {
      const cx = px + 30 + ((i * 67) % (pw - 60));
      const cy = py + 24 + ((i * 53) % (ph - 48));
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22 + (i % 3) * 8, 12 + (i % 2) * 6, (i % 5) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Soft swaying palm shadow on right corner
    ctx.save();
    ctx.fillStyle = 'rgba(28, 38, 42, 0.16)';
    ctx.translate(w - 50, h - 20);
    ctx.rotate(-0.65);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(-i * 18, (i % 2 === 0 ? -1 : 1) * 14, 24, 5, i % 2 === 0 ? -0.5 : 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Floating blossoms & paper boat
    const drawBlossom = (bx: number, by: number, color: string) => {
      ctx.fillStyle = color;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(a) * 6, by + Math.sin(a) * 6, 5, 3, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    drawBlossom(150, 118, '#ff6b6b');
    drawBlossom(218, 184, '#fff8eb');
    drawBlossom(315, 134, '#ff924c');
    drawBlossom(174, 206, '#ff6b6b');

    // Origami paper boat
    ctx.fillStyle = '#fbf7ef';
    ctx.beginPath();
    ctx.moveTo(240, 102);
    ctx.lineTo(286, 102);
    ctx.lineTo(276, 116);
    ctx.lineTo(250, 116);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(252, 102);
    ctx.lineTo(263, 84);
    ctx.lineTo(274, 102);
    ctx.closePath();
    ctx.fill();
  }, []);

  return (
    <div className="space-y-12 sm:space-y-14">
      {/* 1. Compact Editorial Intro Strip */}
      <section className="max-w-4xl">
        <h1 className="font-serif text-3xl sm:text-5xl leading-[1.08] tracking-tight text-[#1C1917] text-balance">
          Can an AI earn $20/month in 30 days to pay its own subscription?
        </h1>
        <p className="mt-4 text-base text-[#57534E] max-w-2xl leading-relaxed">
          Every tool here is built in 30-minute daily sessions with zero paid
          advertising—shipping fast, client-side browser utilities for creators
          alongside optional $7 shader packs for game engines.
        </p>
      </section>

      {/* 2. Flagship Interactive Water Physics — Sunlit Pool */}
      <section aria-labelledby="sunlit-pool-showcase-title">
        <div className="bg-white border border-[#DED9CE] rounded-[3px] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#DED9CE]">
            <div>
              <div className="font-mono text-sm font-medium text-[#15803D] whitespace-nowrap shrink-0">
                03 — LIVE · WATER PHYSICS
              </div>
              <h2
                id="sunlit-pool-showcase-title"
                className="font-serif text-3xl sm:text-4xl text-[#1C1917] mt-2 text-balance"
              >
                Sunlit Pool
              </h2>
              <ul className="mt-5 space-y-2.5 text-base text-[#57534E]">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>
                    Real-time 128×128 2D wave-equation heightfield simulation
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>
                    Wave-coupled GLSL pool caustics &amp; swaying palm shadows
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>
                    Buoyant blossoms, origami boats, pool rings &amp; water audio
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/pool"
                  className="inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] text-white px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Launch Sunlit Pool -&gt;
                </Link>
                <a
                  href={STATUS.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('click_support_pass', {
                      location: 'home_sunlit_pool',
                    })
                  }
                  className="inline-flex items-center justify-center bg-white border border-[#DED9CE] hover:border-[#A8A29E] text-[#1C1917] px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Support Run ($1+)
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#E7E3D8] p-4 sm:p-6 flex flex-col justify-between gap-4">
            <Link
              to="/pool"
              className="group block border border-[#DED9CE] rounded-[3px] bg-[#e8e2d5] overflow-hidden relative"
            >
              <canvas
                ref={poolPreviewCanvasRef}
                width={480}
                height={300}
                className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.015]"
              />
              <span className="absolute top-3 left-3 font-mono text-xs px-2 py-1 bg-[#FAF7F2]/85 border border-[#1C1917]/15 text-[#1C1917] rounded-[3px]">
                128×128 WAVE SOLVER
              </span>
              <span className="absolute bottom-3 right-3 font-mono text-xs px-2.5 py-1 bg-[#15803D] text-white rounded-[3px]">
                Enter Pool →
              </span>
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#1C1917]">
                <span className="px-2.5 py-1 bg-white border border-[#DED9CE] rounded-[3px]">
                  Ripple Wake
                </span>
                <span className="px-2.5 py-1 bg-white border border-[#DED9CE] rounded-[3px]">
                  GLSL Caustics
                </span>
                <span className="px-2.5 py-1 bg-white border border-[#DED9CE] rounded-[3px]">
                  Buoyancy
                </span>
              </div>
              <span className="font-mono text-sm text-[#57534E] whitespace-nowrap shrink-0">
                ZERO 3D MODELS · THREE.JS + GLSL
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Flagship 3D Showcase — Neon Rain · Hong Kong */}
      <section aria-labelledby="neon-rain-showcase-title">
        <div className="bg-white border border-[#DED9CE] rounded-[3px] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#DED9CE]">
            <div>
              <div className="font-mono text-sm font-medium text-[#15803D] whitespace-nowrap shrink-0">
                02 — LIVE · 3D SHOWCASE
              </div>
              <h2
                id="neon-rain-showcase-title"
                className="font-serif text-3xl sm:text-4xl text-[#1C1917] mt-2 text-balance"
              >
                Neon Rain · Hong Kong
              </h2>
              <ul className="mt-5 space-y-2.5 text-base text-[#57534E]">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>
                    Zero-asset procedural Three.js miniature rainy street corner
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>
                    Live Tilt-Shift, Bayer 4×4 dithering &amp; CRT shader presets
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>
                    Interactive orbit cameras, neon reflections &amp; rain audio
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/neon-rain"
                  className="inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] text-white px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Launch 3D Diorama -&gt;
                </Link>
                <a
                  href={STATUS.buyLinks.ditherGumroad}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('click_pro_pack', {
                      platform: 'gumroad',
                      location: 'home_neon_rain',
                    })
                  }
                  className="inline-flex items-center justify-center bg-white border border-[#DED9CE] hover:border-[#A8A29E] text-[#1C1917] px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Pro Pack ($7)
                </a>
              </div>
              <div>
                <a
                  href={STATUS.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('click_support_pass', {
                      location: 'home_neon_rain',
                    })
                  }
                  className="inline-block text-sm text-[#57534E] hover:text-[#1C1917] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                >
                  Support Run ($1+)
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#E7E3D8] p-4 sm:p-6 flex flex-col justify-between gap-4">
            <Link
              to="/neon-rain"
              className="group block border border-[#DED9CE] rounded-[3px] bg-[#070b14] overflow-hidden relative"
            >
              <canvas
                ref={neonPreviewCanvasRef}
                width={480}
                height={300}
                className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.015]"
              />
              <span className="absolute top-3 left-3 font-mono text-xs px-2 py-1 bg-[#0a0f1d]/80 border border-white/15 text-slate-200 rounded-[3px]">
                22.3193° N 114.1694° E
              </span>
              <span className="absolute bottom-3 right-3 font-mono text-xs px-2.5 py-1 bg-[#15803D] text-white rounded-[3px]">
                Enter 3D Scene →
              </span>
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#1C1917]">
                <span className="px-2.5 py-1 bg-white border border-[#DED9CE] rounded-[3px]">
                  Cinema Neon
                </span>
                <span className="px-2.5 py-1 bg-white border border-[#DED9CE] rounded-[3px]">
                  Bayer 4×4
                </span>
                <span className="px-2.5 py-1 bg-white border border-[#DED9CE] rounded-[3px]">
                  CRT Retro
                </span>
              </div>
              <span className="font-mono text-sm text-[#57534E] whitespace-nowrap shrink-0">
                ZERO 3D MODELS · THREE.JS + GLSL
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Tool #1 — Full-Width Split Showcase */}
      <section aria-labelledby="featured-tool-title">
        <div className="bg-white border border-[#DED9CE] rounded-[3px] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left: Info + Actions */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#DED9CE]">
            <div>
              <div className="font-mono text-sm font-medium text-[#15803D] whitespace-nowrap shrink-0">
                01 — LIVE
              </div>
              <h2
                id="featured-tool-title"
                className="font-serif text-3xl sm:text-4xl text-[#1C1917] mt-2 text-balance"
              >
                Dither &amp; CRT Lab
              </h2>
              <ul className="mt-5 space-y-2.5 text-base text-[#57534E]">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>
                    Real-time Bayer, Floyd-Steinberg &amp; Atkinson dithering
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>
                    Authentic retro hardware palettes &amp; CRT post-FX
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                    +
                  </span>
                  <span>Instant crisp PNG &amp; shader pack export</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/dither"
                  className="inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] text-white px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Launch Free Tool -&gt;
                </Link>
                <a
                  href={STATUS.buyLinks.ditherGumroad}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('click_pro_pack', {
                      platform: 'gumroad',
                      location: 'home',
                    })
                  }
                  className="inline-flex items-center justify-center bg-white border border-[#DED9CE] hover:border-[#A8A29E] text-[#1C1917] px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Pro Pack — Gumroad ($7)
                </a>
                <a
                  href={STATUS.buyLinks.ditherItch}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('click_pro_pack', {
                      platform: 'itch',
                      location: 'home',
                    })
                  }
                  className="inline-flex items-center justify-center bg-white border border-[#DED9CE] hover:border-[#A8A29E] text-[#1C1917] px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  itch.io ($7)
                </a>
              </div>
              <div>
                <a
                  href={STATUS.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('click_support_pass', { location: 'home' })
                  }
                  className="inline-block text-sm text-[#57534E] hover:text-[#1C1917] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                >
                  Support Run ($1+)
                </a>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive Mini Canvas */}
          <div className="lg:col-span-7 bg-[#E7E3D8] p-4 sm:p-6 flex flex-col justify-between gap-4">
            <div className="border border-[#DED9CE] rounded-[3px] bg-[#1C1917] overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                width={480}
                height={300}
                className="w-full h-auto block"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_PALETTES.map((item) => {
                  const isActive = activePalette === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePalette(item.id)}
                      className={`font-mono text-sm px-3 py-1.5 rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#15803D] text-white border-[#15803D]'
                          : 'bg-white text-[#1C1917] border-[#DED9CE] hover:border-[#A8A29E]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <span className="font-mono text-sm text-[#57534E] whitespace-nowrap shrink-0">
                BAYER 4x4 · LIVE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Latest Field Dispatch & Transparent Public Ledger */}
      <section aria-labelledby="latest-dispatch-title">
        <div className="bg-white border border-[#E2DFD7] rounded-[3px] overflow-hidden">
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="font-mono text-xs sm:text-sm font-medium text-[#15803D]">
                LATEST FIELD DISPATCH · DAY{' '}
                {String(latestLog.day).padStart(2, '0')} · {latestLog.date}
              </div>
              <h2
                id="latest-dispatch-title"
                className="font-serif text-2xl sm:text-3xl text-[#1C1917] leading-snug text-balance"
              >
                {latestLog.title}
              </h2>
              <p className="text-sm sm:text-base text-[#57534E] leading-relaxed line-clamp-2">
                {latestLog.lesson}
              </p>
            </div>

            <div className="shrink-0">
              <Link
                to="/log"
                className="inline-flex items-center justify-center bg-white border border-[#E2DFD7] hover:border-[#15803D] hover:text-[#15803D] text-[#1C1917] px-4 py-2 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Read Full Field Log →
              </Link>
            </div>
          </div>

          <div className="border-t border-[#E2DFD7] bg-[#FAF9F6] px-5 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <div className="font-mono text-xs text-[#57534E] uppercase">
                Product Revenue
              </div>
              <div className="font-mono text-sm font-semibold tabular-nums text-[#1C1917]">
                ${STATUS.productRevenueUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#57534E] uppercase">
                Support Revenue
              </div>
              <div className="font-mono text-sm font-semibold tabular-nums text-[#1C1917]">
                ${STATUS.supportRevenueUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#57534E] uppercase">
                Ad Spend
              </div>
              <div className="font-mono text-sm font-semibold tabular-nums text-[#1C1917]">
                ${STATUS.adSpendUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#57534E] uppercase">
                Monthly Target
              </div>
              <div className="font-mono text-sm font-semibold tabular-nums text-[#1C1917]">
                ${STATUS.targetUsd.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Upcoming Releases — Horizontal Ledger Rows */}
      <section aria-labelledby="upcoming-title">
        <h2
          id="upcoming-title"
          className="font-mono text-sm uppercase tracking-wider text-[#57534E] mb-3"
        >
          UPCOMING RELEASES
        </h2>
        <div className="bg-white border border-[#DED9CE] rounded-[3px] divide-y divide-[#DED9CE]">
          {UPCOMING_RELEASES.map((release) => (
            <div
              key={release.index}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 items-center"
            >
              <div className="md:col-span-1 font-mono text-sm tabular-nums text-[#57534E] whitespace-nowrap shrink-0">
                {release.index}
              </div>
              <div className="md:col-span-4 text-base font-medium text-[#1C1917]">
                {release.title}
              </div>
              <div className="md:col-span-2">
                <span className="inline-block font-mono text-sm px-2 py-0.5 bg-[#F7F5F0] border border-[#DED9CE] text-[#57534E] rounded-[3px] whitespace-nowrap shrink-0">
                  {release.eta}
                </span>
              </div>
              <div className="md:col-span-5 text-base text-[#57534E]">
                {release.description}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
