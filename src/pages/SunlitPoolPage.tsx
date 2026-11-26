import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS } from '../data/status';
import { PoolAudioController } from '../scenes/poolAudio';
import {
  mountSunlitPoolScene,
  PoolToolMode,
  SunlitPoolHandle,
} from '../scenes/sunlitPoolScene';
import { trackEvent } from '../utils/analytics';

const TOOL_OPTIONS: Array<{ id: PoolToolMode; label: string }> = [
  { id: 'ripple', label: 'Ripple' },
  { id: 'blossom', label: 'Blossom' },
  { id: 'boat', label: 'Paper Boat' },
  { id: 'ring', label: 'Pool Ring' },
];

export function SunlitPoolPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneHandleRef = useRef<SunlitPoolHandle | null>(null);
  const audioRef = useRef<PoolAudioController | null>(null);

  const [toolMode, setToolMode] = useState<PoolToolMode>('ripple');
  const [breezeEnabled, setBreezeEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Sunlit Pool — Gemini Survival Lab';

    const container = containerRef.current;
    if (!container) {
      return () => {
        document.title = prevTitle;
      };
    }

    const audio = new PoolAudioController();
    const handle = mountSunlitPoolScene(container, {
      onSplash: (intensity) => audio.playPlop(intensity),
      onWake: () => audio.playWakeTick(),
    });

    audioRef.current = audio;
    sceneHandleRef.current = handle;

    return () => {
      document.title = prevTitle;
      audio.dispose();
      handle.dispose();
      audioRef.current = null;
      sceneHandleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (isAboutOpen) {
          setIsAboutOpen(false);
        } else {
          setUiHidden((prev) => !prev);
        }
        return;
      }

      if ((e.key === 'h' || e.key === 'H') && !isAboutOpen) {
        setUiHidden((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAboutOpen]);

  const handleSelectTool = (mode: PoolToolMode) => {
    setToolMode(mode);
    sceneHandleRef.current?.setToolMode(mode);
  };

  const handleToggleBreeze = () => {
    const next = !breezeEnabled;
    setBreezeEnabled(next);
    sceneHandleRef.current?.setBreezeEnabled(next);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioRef.current?.setEnabled(next);
  };

  const handleClear = () => {
    sceneHandleRef.current?.clearObjects();
  };

  const handleOpenAbout = () => {
    trackEvent('click_pool_about', { scene: 'sunlit_pool' });
    setIsAboutOpen(true);
  };

  return (
    <div className="relative w-full h-[100dvh] min-h-screen overflow-hidden bg-[#e8e2d5] text-[#1C1917] select-none">
      {/* Full-viewport 3D WebGL canvas mount */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-pointer"
        aria-label="Interactive 3D sunlit swimming pool water physics simulation"
      />

      {/* Top Editorial Floating HUD */}
      {!uiHidden && (
        <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 p-3 sm:p-5 flex flex-wrap items-start justify-between gap-3">
          {/* Top-Left Editorial Title Pill */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#FAF7F2]/82 backdrop-blur-md border border-[#1C1917]/12 rounded-[4px] px-3.5 py-2 shadow-sm">
            <Link
              to="/"
              className="font-mono text-xs text-[#15803D] hover:text-[#166534] font-medium transition-colors whitespace-nowrap shrink-0"
            >
              ← Hub
            </Link>
            <span className="text-[#1C1917]/20">|</span>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h1 className="font-serif text-lg sm:text-xl leading-none text-[#1C1917] whitespace-nowrap shrink-0">
                Sunlit Pool
              </h1>
              <span className="font-mono text-[11px] text-[#57534E] hidden sm:inline whitespace-nowrap shrink-0">
                Interactive water physics · Zero assets
              </span>
            </div>
          </div>

          {/* Top-Right Subtle Frosted Controls */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              aria-pressed={soundEnabled}
              className={`font-mono text-xs px-3 py-2 rounded-[4px] border backdrop-blur-md shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                soundEnabled
                  ? 'bg-[#15803D] text-white border-[#15803D]'
                  : 'bg-[#FAF7F2]/82 text-[#1C1917] border-[#1C1917]/12 hover:border-[#1C1917]/30'
              }`}
            >
              Sound: {soundEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setUiHidden(true)}
              className="font-mono text-xs px-3 py-2 rounded-[4px] bg-[#FAF7F2]/82 backdrop-blur-md border border-[#1C1917]/12 hover:border-[#1C1917]/30 text-[#57534E] hover:text-[#1C1917] shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Hide UI (H)
            </button>
            <button
              type="button"
              onClick={handleOpenAbout}
              className="font-mono text-xs px-3 py-2 rounded-[4px] bg-[#FAF7F2]/88 backdrop-blur-md border border-[#1C1917]/15 hover:border-[#15803D] text-[#1C1917] font-medium shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              About / Shader
            </button>
          </div>
        </header>
      )}

      {/* Bottom Compact Frosted-Glass Pill Dock */}
      {!uiHidden && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-5 flex justify-center">
          <div className="pointer-events-auto w-fit max-w-[calc(100vw-1.5rem)] bg-[#FAF7F2]/84 backdrop-blur-md border border-[#1C1917]/12 rounded-[6px] px-3 py-2 shadow-lg flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {/* Tool / Spawn Mode Selector */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#57534E] mr-1 whitespace-nowrap shrink-0">
                Drop
              </span>
              {TOOL_OPTIONS.map((tool) => {
                const active = toolMode === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleSelectTool(tool.id)}
                    className={`font-mono text-xs px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'bg-white/75 text-[#1C1917] border-[#DED9CE] hover:border-[#A8A29E]'
                    }`}
                  >
                    {tool.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:block h-4 w-px bg-[#1C1917]/15 shrink-0" />

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleBreeze}
                aria-pressed={breezeEnabled}
                className={`font-mono text-xs px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  breezeEnabled
                    ? 'bg-[#E6F4EE] text-[#14532D] border-[#86EFAC]'
                    : 'bg-white/75 text-[#57534E] border-[#DED9CE] hover:border-[#A8A29E]'
                }`}
              >
                Breeze: {breezeEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="font-mono text-xs px-2.5 py-1 rounded-[3px] border bg-white/75 text-[#1C1917] border-[#DED9CE] hover:border-[#A8A29E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Recording Mode Subtle Restore Pill */}
      {uiHidden && (
        <button
          type="button"
          onClick={() => setUiHidden(false)}
          className="fixed bottom-4 right-4 z-30 bg-[#FAF7F2]/80 backdrop-blur-md border border-[#1C1917]/15 rounded-[4px] px-2.5 py-1.5 font-mono text-[11px] text-[#1C1917] opacity-25 hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer whitespace-nowrap"
        >
          Show UI (H)
        </button>
      )}

      {/* Honest About / Shader Modal */}
      {isAboutOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#1C1917]/45 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pool-about-title"
          onClick={() => setIsAboutOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#F7F5F0] text-[#1C1917] border border-[#DED9CE] rounded-[4px] p-6 sm:p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsAboutOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center font-mono text-lg text-[#57534E] hover:text-[#1C1917] border border-[#DED9CE] bg-white rounded-[3px] cursor-pointer"
            >
              ×
            </button>

            <div className="font-mono text-xs uppercase tracking-wider text-[#15803D] font-semibold">
              ZERO-ASSET WATER PHYSICS · THREE.JS + GLSL
            </div>
            <h2
              id="pool-about-title"
              className="font-serif text-3xl sm:text-4xl text-[#1C1917] mt-2 leading-tight text-balance"
            >
              Sunlit Pool Architecture
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#57534E] leading-relaxed">
              Every surface, tile pattern, swaying palm shadow, and floating
              blossom is synthesized live in the browser—zero external 3D
              models, image textures, or audio files.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#57534E]">
              <li className="flex items-start gap-2">
                <span className="font-mono text-[#15803D] shrink-0">+</span>
                <span>
                  <strong className="text-[#1C1917]">128×128 Wave Solver:</strong>{' '}
                  Damped 2D wave-equation heightfield updated on a fixed timestep
                  and packed into a live RGBA texture.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-[#15803D] shrink-0">+</span>
                <span>
                  <strong className="text-[#1C1917]">Wave-Coupled Caustics:</strong>{' '}
                  Refracted GLSL Voronoi sunlight cells bent in real time by the
                  surface slope (dh/dx, dh/dz).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-[#15803D] shrink-0">+</span>
                <span>
                  <strong className="text-[#1C1917]">Physical Buoyancy:</strong>{' '}
                  Blossoms, origami boats, and pool rings sample heightfield slope
                  for bobbing, tilt, drift, and soft collisions.
                </span>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/neon-rain"
                className="inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] text-white px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Explore Neon Rain 3D →
              </Link>
              <Link
                to="/dither"
                className="inline-flex items-center justify-center bg-white border border-[#DED9CE] hover:border-[#A8A29E] text-[#1C1917] px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Open Dither &amp; CRT Lab
              </Link>
              <a
                href={STATUS.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent('click_support_pass', {
                    location: 'pool_modal',
                  })
                }
                className="inline-flex items-center justify-center text-sm text-[#57534E] hover:text-[#1C1917] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Support Lab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
