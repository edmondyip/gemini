import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

      {/* 3. Upcoming Releases — Horizontal Ledger Rows */}
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
