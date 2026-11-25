import { useCallback, useEffect, useRef, useState } from 'react';
import { STATUS } from '../data/status';
import {
  ALGORITHMS,
  DEFAULT_DITHER_PARAMS,
  DitherParams,
  PALETTES,
  renderDitherToCanvas,
} from '../engine/ditherEngine';
import {
  PROCEDURAL_SCENES,
  renderProceduralScene,
  SceneId,
} from '../engine/scenes';
import {
  generateCssFilterSnippet,
  generateGodotPreviewLines,
} from '../engine/shaderGen';

export function DitherLabPage() {
  const [params, setParams] = useState<DitherParams>(DEFAULT_DITHER_PARAMS);
  const [activeScene, setActiveScene] = useState<SceneId | 'custom'>('sphere');
  const [sourceLabel, setSourceLabel] = useState<string>('01 Lit Sphere');
  const [sourceDims, setSourceDims] = useState<{ w: number; h: number }>({
    w: 640,
    h: 420,
  });
  const [compareSplit, setCompareSplit] = useState<boolean>(false);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isDropActive, setIsDropActive] = useState<boolean>(false);
  const [copiedCss, setCopiedCss] = useState<boolean>(false);

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runDitherPipeline = useCallback(() => {
    const src = sourceCanvasRef.current;
    const out = outputCanvasRef.current;
    if (!src || !out) return;

    renderDitherToCanvas(src, out, params);

    if (compareSplit && originalCanvasRef.current) {
      const orig = originalCanvasRef.current;
      orig.width = out.width;
      orig.height = out.height;
      const ctx = orig.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(src, 0, 0, orig.width, orig.height);
      }
    }
  }, [params, compareSplit]);

  // Initialize default procedural scene on mount
  useEffect(() => {
    sourceCanvasRef.current = renderProceduralScene('sphere', 640, 420);
    setSourceDims({ w: 640, h: 420 });
    runDitherPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render whenever params or compareSplit change
  useEffect(() => {
    runDitherPipeline();
  }, [runDitherPipeline]);

  const loadScene = (sceneId: SceneId, label: string) => {
    sourceCanvasRef.current = renderProceduralScene(sceneId, 640, 420);
    setActiveScene(sceneId);
    setSourceLabel(label);
    setSourceDims({ w: 640, h: 420 });
    runDitherPipeline();
  };

  const loadImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(32, Math.round(img.width * ratio));
          const h = Math.max(32, Math.round(img.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, w, h);
          sourceCanvasRef.current = canvas;
          setActiveScene('custom');
          setSourceLabel(file.name);
          setSourceDims({ w, h });
          runDitherPipeline();
        };
        if (typeof reader.result === 'string') {
          img.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    },
    [runDitherPipeline]
  );

  // Global Cmd/Ctrl+V clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            loadImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadImageFile]);

  // Split divider pointer tracking
  const updateSplitFromClientX = useCallback((clientX: number) => {
    const container = stageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.max(4, Math.min(96, pct)));
  }, []);

  useEffect(() => {
    if (!isDraggingSplit) return;
    const onMove = (e: PointerEvent) => updateSplitFromClientX(e.clientX);
    const onUp = () => setIsDraggingSplit(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDraggingSplit, updateSplitFromClientX]);

  const handleDownloadPng = () => {
    const canvas = outputCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `dither-lab-${params.algorithm}.png`;
    a.click();
  };

  const handleCopyCss = async () => {
    const snippet = generateCssFilterSnippet(params);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedCss(true);
      window.setTimeout(() => setCopiedCss(false), 2000);
    } catch {
      // Fallback textarea copy if clipboard API is restricted
      const ta = document.createElement('textarea');
      ta.value = snippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCss(true);
      window.setTimeout(() => setCopiedCss(false), 2000);
    }
  };

  const godotPreviewLines = generateGodotPreviewLines(params);
  const activeAlgoLabel =
    ALGORITHMS.find((a) => a.id === params.algorithm)?.label ?? params.algorithm;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="font-mono text-sm text-[#15803D] font-medium">
            TOOL 01 // BROWSER STUDIO
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1C1917] mt-1 text-balance">
            Dither &amp; CRT Lab
          </h1>
        </div>
        <p className="text-sm text-[#57534E] font-mono">
          Zero upload · 100% local Canvas 2D processing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Studio Stage */}
        <div className="lg:col-span-8 space-y-4">
          {/* Toolbar */}
          <div className="bg-white border border-[#DED9CE] rounded-[3px] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadImageFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#15803D] hover:bg-[#166534] text-white px-3 py-1.5 rounded-[3px] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Upload Image
              </button>

              {PROCEDURAL_SCENES.map((scene) => {
                const isSelected = activeScene === scene.id;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => loadScene(scene.id, scene.label)}
                    className={`px-3 py-1.5 rounded-[3px] text-sm font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'bg-[#F7F5F0] text-[#1C1917] border-[#DED9CE] hover:border-[#A8A29E]'
                    }`}
                  >
                    {scene.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCompareSplit((prev) => !prev)}
              aria-pressed={compareSplit}
              className={`px-3 py-1.5 rounded-[3px] text-sm font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                compareSplit
                  ? 'bg-[#15803D] text-white border-[#15803D]'
                  : 'bg-white text-[#1C1917] border-[#DED9CE] hover:border-[#A8A29E]'
              }`}
            >
              Compare Split
            </button>
          </div>

          {/* Studio Canvas Mat */}
          <div
            className={`bg-[#E7E3D8] border rounded-[3px] p-4 sm:p-6 flex flex-col items-center justify-center min-h-[420px] transition-colors ${
              isDropActive ? 'border-[#15803D]' : 'border-[#DED9CE]'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDropActive(true);
            }}
            onDragLeave={() => setIsDropActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDropActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) loadImageFile(file);
            }}
          >
            <div
              ref={stageContainerRef}
              className="relative w-full max-w-full border border-[#DED9CE] rounded-[3px] bg-white overflow-hidden select-none"
            >
              <canvas
                ref={outputCanvasRef}
                width={640}
                height={420}
                className="w-full h-auto block"
                style={{ imageRendering: 'pixelated' }}
              />

              {compareSplit && (
                <>
                  <canvas
                    ref={originalCanvasRef}
                    width={640}
                    height={420}
                    className="absolute inset-0 w-full h-full block pointer-events-none"
                    style={{
                      clipPath: `inset(0 ${100 - splitPercent}% 0 0)`,
                    }}
                  />

                  <span className="absolute top-3 left-3 bg-white border border-[#DED9CE] text-[#1C1917] font-mono text-sm px-2 py-0.5 rounded-[3px] pointer-events-none whitespace-nowrap">
                    ORIGINAL
                  </span>
                  <span className="absolute top-3 right-3 bg-white border border-[#DED9CE] text-[#1C1917] font-mono text-sm px-2 py-0.5 rounded-[3px] pointer-events-none whitespace-nowrap">
                    PROCESSED
                  </span>

                  {/* Draggable split divider */}
                  <div
                    role="slider"
                    aria-label="Compare split position"
                    aria-valuemin={4}
                    aria-valuemax={96}
                    aria-valuenow={Math.round(splitPercent)}
                    tabIndex={0}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setIsDraggingSplit(true);
                      updateSplitFromClientX(e.clientX);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        setSplitPercent((p) => Math.max(4, p - 4));
                      } else if (e.key === 'ArrowRight') {
                        setSplitPercent((p) => Math.min(96, p + 4));
                      }
                    }}
                    className="absolute inset-y-0 w-6 -ml-3 flex items-center justify-center cursor-ew-resize touch-none"
                    style={{ left: `${splitPercent}%` }}
                  >
                    <div className="w-[2px] h-full bg-[#15803D]" />
                    <div className="absolute w-6 h-8 bg-[#15803D] border border-white rounded-[3px] flex items-center justify-center text-white font-mono text-sm">
                      ||
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-full mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[#57534E] font-mono">
              <span className="tabular-nums whitespace-nowrap shrink-0">
                {sourceLabel} · {sourceDims.w}×{sourceDims.h}px
              </span>
              <span className="tabular-nums whitespace-nowrap shrink-0">
                {activeAlgoLabel} · {params.pixelScale}x
              </span>
              <span className="whitespace-nowrap shrink-0">
                Drop image or Cmd/Ctrl+V
              </span>
            </div>
          </div>
        </div>

        {/* Right Control Rail */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Panel 1: Dither Algorithm */}
          <section className="bg-white border border-[#DED9CE] rounded-[3px] p-4 space-y-3">
            <h2 className="font-mono text-sm font-semibold text-[#1C1917] uppercase tracking-wide">
              1. Dither Algorithm
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ALGORITHMS.map((algo) => {
                const isSelected = params.algorithm === algo.id;
                return (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() =>
                      setParams((prev) => ({ ...prev, algorithm: algo.id }))
                    }
                    className={`px-2.5 py-2 rounded-[3px] border text-sm font-medium text-left transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'bg-[#F7F5F0] text-[#1C1917] border-[#DED9CE] hover:border-[#A8A29E]'
                    }`}
                  >
                    {algo.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Panel 2: Palette */}
          <section className="bg-white border border-[#DED9CE] rounded-[3px] p-4 space-y-3">
            <h2 className="font-mono text-sm font-semibold text-[#1C1917] uppercase tracking-wide">
              2. Palette
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {PALETTES.map((pal) => {
                const isSelected = params.paletteId === pal.id;
                const displayColors =
                  pal.id === 'custom' ? params.customColors : pal.colors;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() =>
                      setParams((prev) => ({ ...prev, paletteId: pal.id }))
                    }
                    className={`px-3 py-2 rounded-[3px] border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F7F5F0] border-[#15803D] ring-1 ring-[#15803D]'
                        : 'bg-white border-[#DED9CE] hover:border-[#A8A29E]'
                    }`}
                  >
                    <span className="text-sm font-medium text-[#1C1917] whitespace-nowrap shrink-0">
                      {pal.name}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {displayColors.slice(0, 6).map((hex, i) => (
                        <span
                          key={`${pal.id}-${i}`}
                          className="w-3.5 h-3.5 rounded-[2px] border border-[#DED9CE]"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {params.paletteId === 'custom' && (
              <div className="pt-2 border-t border-[#DED9CE] grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm text-[#57534E]">
                  <span>Dark Ink</span>
                  <div className="flex items-center gap-2 bg-[#F7F5F0] border border-[#DED9CE] rounded-[3px] px-2 py-1">
                    <input
                      type="color"
                      value={params.customColors[0]}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          customColors: [e.target.value, prev.customColors[1]],
                        }))
                      }
                      className="w-6 h-6 border-0 bg-transparent cursor-pointer p-0"
                    />
                    <span className="font-mono text-sm uppercase text-[#1C1917]">
                      {params.customColors[0]}
                    </span>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5 text-sm text-[#57534E]">
                  <span>Light Ink</span>
                  <div className="flex items-center gap-2 bg-[#F7F5F0] border border-[#DED9CE] rounded-[3px] px-2 py-1">
                    <input
                      type="color"
                      value={params.customColors[1]}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          customColors: [prev.customColors[0], e.target.value],
                        }))
                      }
                      className="w-6 h-6 border-0 bg-transparent cursor-pointer p-0"
                    />
                    <span className="font-mono text-sm uppercase text-[#1C1917]">
                      {params.customColors[1]}
                    </span>
                  </div>
                </label>
              </div>
            )}
          </section>

          {/* Panel 3: Resolution & Tone */}
          <section className="bg-white border border-[#DED9CE] rounded-[3px] p-4 space-y-3.5">
            <h2 className="font-mono text-sm font-semibold text-[#1C1917] uppercase tracking-wide">
              3. Resolution &amp; Tone
            </h2>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="pixel-scale" className="text-[#57534E]">
                  Pixel Scale
                </label>
                <span className="font-mono tabular-nums text-[#1C1917] font-medium whitespace-nowrap shrink-0">
                  {params.pixelScale}x
                </span>
              </div>
              <input
                id="pixel-scale"
                type="range"
                min={1}
                max={8}
                step={1}
                value={params.pixelScale}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    pixelScale: Number(e.target.value),
                  }))
                }
                className="studio-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="contrast" className="text-[#57534E]">
                  Contrast
                </label>
                <span className="font-mono tabular-nums text-[#1C1917] font-medium whitespace-nowrap shrink-0">
                  {params.contrast > 0 ? `+${params.contrast}` : params.contrast}
                </span>
              </div>
              <input
                id="contrast"
                type="range"
                min={-50}
                max={50}
                step={1}
                value={params.contrast}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    contrast: Number(e.target.value),
                  }))
                }
                className="studio-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="brightness" className="text-[#57534E]">
                  Brightness
                </label>
                <span className="font-mono tabular-nums text-[#1C1917] font-medium whitespace-nowrap shrink-0">
                  {params.brightness > 0
                    ? `+${params.brightness}`
                    : params.brightness}
                </span>
              </div>
              <input
                id="brightness"
                type="range"
                min={-50}
                max={50}
                step={1}
                value={params.brightness}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    brightness: Number(e.target.value),
                  }))
                }
                className="studio-slider"
              />
            </div>
          </section>

          {/* Panel 4: CRT Post-FX */}
          <section className="bg-white border border-[#DED9CE] rounded-[3px] p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-mono text-sm font-semibold text-[#1C1917] uppercase tracking-wide">
                4. CRT Post-FX
              </h2>
              <button
                type="button"
                role="switch"
                aria-checked={params.crtEnabled}
                onClick={() =>
                  setParams((prev) => ({
                    ...prev,
                    crtEnabled: !prev.crtEnabled,
                  }))
                }
                className={`font-mono text-sm px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  params.crtEnabled
                    ? 'bg-[#15803D] text-white border-[#15803D]'
                    : 'bg-[#F7F5F0] text-[#57534E] border-[#DED9CE] hover:border-[#A8A29E]'
                }`}
              >
                {params.crtEnabled ? 'CRT ON' : 'CRT OFF'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="scanlines" className="text-[#57534E]">
                  Scanlines
                </label>
                <span className="font-mono tabular-nums text-[#1C1917] font-medium whitespace-nowrap shrink-0">
                  {params.scanlines}%
                </span>
              </div>
              <input
                id="scanlines"
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={!params.crtEnabled}
                value={params.scanlines}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    scanlines: Number(e.target.value),
                  }))
                }
                className="studio-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="rgb-split" className="text-[#57534E]">
                  RGB Split
                </label>
                <span className="font-mono tabular-nums text-[#1C1917] font-medium whitespace-nowrap shrink-0">
                  {params.rgbSplit}px
                </span>
              </div>
              <input
                id="rgb-split"
                type="range"
                min={0}
                max={6}
                step={1}
                disabled={!params.crtEnabled}
                value={params.rgbSplit}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    rgbSplit: Number(e.target.value),
                  }))
                }
                className="studio-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="vignette" className="text-[#57534E]">
                  Vignette
                </label>
                <span className="font-mono tabular-nums text-[#1C1917] font-medium whitespace-nowrap shrink-0">
                  {params.vignette}%
                </span>
              </div>
              <input
                id="vignette"
                type="range"
                min={0}
                max={80}
                step={1}
                disabled={!params.crtEnabled}
                value={params.vignette}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    vignette: Number(e.target.value),
                  }))
                }
                className="studio-slider"
              />
            </div>
          </section>

          {/* Panel 5: Export (Free + Inline Pro Bar) */}
          <section className="bg-white border border-[#DED9CE] rounded-[3px] p-4 space-y-4">
            <h2 className="font-mono text-sm font-semibold text-[#1C1917] uppercase tracking-wide">
              5. Export
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="w-full bg-[#15803D] hover:bg-[#166534] text-white px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Download PNG (1x)
              </button>
              <button
                type="button"
                onClick={handleCopyCss}
                className="w-full bg-white border border-[#DED9CE] hover:border-[#A8A29E] text-[#1C1917] px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedCss ? 'Copied!' : 'Copy CSS Filter'}
              </button>
            </div>

            {/* Compact Inline Pro Shader & Offline Pack Bar */}
            <div className="pt-3 border-t border-[#DED9CE] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-[#1C1917] whitespace-nowrap shrink-0">
                  PRO SHADER PREVIEW
                </span>
                <span className="font-mono text-sm text-[#15803D] whitespace-nowrap shrink-0">
                  LIVE SYNC
                </span>
              </div>

              <pre className="bg-[#F7F5F0] border border-[#DED9CE] rounded-[3px] p-3 font-mono text-sm leading-relaxed text-[#1C1917] overflow-x-auto">
                {godotPreviewLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      idx === 4
                        ? 'opacity-45'
                        : idx === 5
                          ? 'opacity-20'
                          : ''
                    }
                  >
                    {line}
                  </div>
                ))}
              </pre>

              <p className="text-sm text-[#57534E]">
                Full Godot 4 + Three.js Shaders + 4x Upscale Offline App — $7
              </p>

              <div className="flex flex-wrap gap-2">
                <a
                  href={STATUS.buyLinks.ditherGumroad}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] text-white px-3 py-2 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Pro Pack — Gumroad ($7)
                </a>
                <a
                  href={STATUS.buyLinks.ditherItch}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center bg-white border border-[#DED9CE] hover:border-[#A8A29E] text-[#1C1917] px-3 py-2 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  itch.io ($7)
                </a>
              </div>

              <div>
                <a
                  href={STATUS.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-[#57534E] hover:text-[#1C1917] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                >
                  Support Run ($1+)
                </a>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
