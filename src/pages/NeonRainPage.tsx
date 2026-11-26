import { useEffect, useRef, useState } from 'react';
import { DemoSwitcher } from '../components/DemoSwitcher';
import { STATUS } from '../data/status';
import { LOOK_PRESETS, LookPresetId } from '../scenes/neonRainPostFx';
import {
  CameraPresetId,
  mountNeonRainScene,
  NeonRainSceneHandle,
} from '../scenes/neonRainScene';
import { RainAudioController } from '../scenes/rainAudio';
import { trackEvent } from '../utils/analytics';

const CAMERA_OPTIONS: Array<{ id: CameraPresetId; label: string }> = [
  { id: 'isometric', label: 'Isometric' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'street', label: 'Street' },
  { id: 'topdown', label: 'Top-Down' },
];

const LOOK_OPTIONS: Array<{ id: LookPresetId; label: string }> = [
  { id: 'cinema', label: 'Cinema Neon' },
  { id: 'bayer', label: 'Bayer Dither' },
  { id: 'crt', label: 'CRT Retro' },
  { id: 'typhoon', label: 'Typhoon Noir' },
];

export function NeonRainPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneHandleRef = useRef<NeonRainSceneHandle | null>(null);
  const audioRef = useRef<RainAudioController | null>(null);

  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('isometric');
  const [lookPreset, setLookPreset] = useState<LookPresetId>('cinema');
  const [rainEnabled, setRainEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Neon Rain · Hong Kong — Gemini Survival Lab';

    const container = containerRef.current;
    if (!container) {
      return () => {
        document.title = prevTitle;
      };
    }

    const handle = mountNeonRainScene(container);
    const audio = new RainAudioController();
    sceneHandleRef.current = handle;
    audioRef.current = audio;

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
        if (isSkillModalOpen) {
          setIsSkillModalOpen(false);
        } else {
          setUiHidden((prev) => !prev);
        }
        return;
      }

      if ((e.key === 'h' || e.key === 'H') && !isSkillModalOpen) {
        setUiHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSkillModalOpen]);

  const handleCameraChange = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    sceneHandleRef.current?.setCameraPreset(preset);
  };

  const handleLookChange = (preset: LookPresetId) => {
    setLookPreset(preset);
    sceneHandleRef.current?.setLookPreset(preset);
    const intensity = rainEnabled ? LOOK_PRESETS[preset].rainIntensity : 0.2;
    audioRef.current?.setIntensity(intensity);
  };

  const handleToggleRain = () => {
    const next = !rainEnabled;
    setRainEnabled(next);
    sceneHandleRef.current?.setRainEnabled(next);
    const intensity = next ? LOOK_PRESETS[lookPreset].rainIntensity : 0.2;
    audioRef.current?.setIntensity(intensity);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    const intensity = rainEnabled ? LOOK_PRESETS[lookPreset].rainIntensity : 0.2;
    audioRef.current?.setIntensity(intensity);
    audioRef.current?.setEnabled(next);
  };

  const handleOpenSkillModal = () => {
    trackEvent('click_skill_modal', { scene: 'neon_rain' });
    setIsSkillModalOpen(true);
  };

  return (
    <div className="relative w-full h-[100dvh] min-h-screen overflow-hidden bg-[#070b14] text-white select-none">
      {/* Full-viewport 3D WebGL canvas mount */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D rainy Hong Kong neon street diorama"
      />

      {/* Top HUD Bar */}
      {!uiHidden && (
        <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 p-3 sm:p-5 flex flex-wrap items-start justify-between gap-3">
          {/* Top-Left Cross-Demo Switcher + Scene Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <DemoSwitcher theme="dark" className="pointer-events-auto" />
            <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#0a0f1d]/75 backdrop-blur-md border border-white/15 rounded-[4px] px-3 py-1.5 font-mono text-xs text-slate-200 shadow-lg">
              <span className="font-semibold tracking-wide text-white whitespace-nowrap shrink-0">
                NEON RAIN · HONG KONG
              </span>
              <span className="text-white/25 hidden md:inline">|</span>
              <span className="text-slate-300 tabular-nums hidden md:inline whitespace-nowrap shrink-0">
                22.3193° N 114.1694° E
              </span>
              <span className="text-white/25 hidden lg:inline">|</span>
              <span className="text-slate-400 hidden lg:inline whitespace-nowrap shrink-0">
                Zero 3D Models · Pure Three.js
              </span>
            </div>
          </div>

          {/* Top-Right Primary CTA */}
          <button
            type="button"
            onClick={handleOpenSkillModal}
            className="pointer-events-auto bg-[#15803D] hover:bg-[#166534] text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-[4px] border border-emerald-400/30 shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            AI Skill · Preview
          </button>
        </header>
      )}

      {/* Bottom Compact Control Dock */}
      {!uiHidden && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-5 flex justify-center">
          <div className="pointer-events-auto w-fit max-w-[calc(100vw-1.5rem)] bg-[#0a0f1d]/82 backdrop-blur-md border border-white/15 rounded-[6px] px-3 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {/* Camera Presets */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 mr-1 whitespace-nowrap shrink-0">
                Cam
              </span>
              {CAMERA_OPTIONS.map((cam) => {
                const active = cameraPreset === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => handleCameraChange(cam.id)}
                    className={`font-mono text-xs px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'bg-white/5 text-slate-200 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {cam.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden xl:block h-4 w-px bg-white/15 shrink-0" />

            {/* Look Presets */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 mr-1 whitespace-nowrap shrink-0">
                Look
              </span>
              {LOOK_OPTIONS.map((look) => {
                const active = lookPreset === look.id;
                return (
                  <button
                    key={look.id}
                    type="button"
                    onClick={() => handleLookChange(look.id)}
                    className={`font-mono text-xs px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60'
                        : 'bg-white/5 text-slate-200 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {look.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden xl:block h-4 w-px bg-white/15 shrink-0" />

            {/* Rain, Sound & Recording Mode Toggles */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleRain}
                aria-pressed={rainEnabled}
                className={`font-mono text-xs px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  rainEnabled
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/60'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'
                }`}
              >
                Rain: {rainEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                aria-pressed={soundEnabled}
                className={`font-mono text-xs px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  soundEnabled
                    ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/30'
                }`}
              >
                Sound: {soundEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => setUiHidden(true)}
                className="font-mono text-xs px-2.5 py-1 rounded-[3px] border bg-white/5 text-slate-300 border-white/15 hover:border-white/35 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Hide UI (H)
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
          className="fixed bottom-4 right-4 z-30 bg-[#0a0f1d]/70 backdrop-blur-md border border-white/15 rounded-[4px] px-2.5 py-1.5 font-mono text-[11px] text-slate-200 opacity-20 hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer whitespace-nowrap"
        >
          Show UI (H)
        </button>
      )}

      {/* Editorial AI Skill Preview Modal */}
      {isSkillModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skill-modal-title"
          onClick={() => setIsSkillModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#F7F5F0] text-[#1C1917] border border-[#DED9CE] rounded-[4px] p-6 sm:p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSkillModalOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center font-mono text-lg text-[#57534E] hover:text-[#1C1917] border border-[#DED9CE] bg-white rounded-[3px] cursor-pointer"
            >
              ×
            </button>

            <div className="font-mono text-xs uppercase tracking-wider text-[#15803D] font-semibold">
              ZERO-ASSET 3D SHOWCASE · PREVIEW
            </div>
            <h2
              id="skill-modal-title"
              className="font-serif text-3xl sm:text-4xl text-[#1C1917] mt-2 leading-tight text-balance"
            >
              Make Any City With This AI Skill
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#57534E] leading-relaxed">
              This rainy Hong Kong diorama is a live, zero-asset procedural
              Three.js scene rendered in real time with our Tilt-Shift, Bayer
              4×4 dithering, and CRT shader pipeline—no external `.glb` models,
              image textures, or audio files.
            </p>
            <p className="mt-3 text-sm sm:text-base text-[#57534E] leading-relaxed">
              The upcoming{' '}
              <strong className="text-[#1C1917] font-semibold">
                Micro-Diorama AI Skill Pack
              </strong>{' '}
              for{' '}
              <span className="font-mono text-xs bg-white border border-[#DED9CE] px-1.5 py-0.5 rounded-[2px] text-[#1C1917]">
                Claude Code
              </span>
              ,{' '}
              <span className="font-mono text-xs bg-white border border-[#DED9CE] px-1.5 py-0.5 rounded-[2px] text-[#1C1917]">
                Codex
              </span>
              ,{' '}
              <span className="font-mono text-xs bg-white border border-[#DED9CE] px-1.5 py-0.5 rounded-[2px] text-[#1C1917]">
                Cursor
              </span>
              , and{' '}
              <span className="font-mono text-xs bg-white border border-[#DED9CE] px-1.5 py-0.5 rounded-[2px] text-[#1C1917]">
                Antigravity
              </span>{' '}
              is currently in development and not on sale yet.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={STATUS.buyLinks.ditherGumroad}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent('click_pro_pack', {
                    platform: 'gumroad',
                    location: 'neon_rain_modal',
                  })
                }
                className="inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] text-white px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Get Dither &amp; CRT Pro Pack ($7)
              </a>
              <a
                href={STATUS.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent('click_support_pass', {
                    location: 'neon_rain_modal',
                  })
                }
                className="inline-flex items-center justify-center bg-white border border-[#DED9CE] hover:border-[#A8A29E] text-[#1C1917] px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Back Experiment ($1+)
              </a>
            </div>

            <p className="mt-4 pt-3 border-t border-[#DED9CE] font-mono text-xs text-[#57534E] italic">
              Micro-Diorama AI Skill Pack is coming soon — supporters &amp; Pro
              buyers get early access when it launches.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
