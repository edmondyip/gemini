export type DitherAlgorithm =
  | 'bayer4'
  | 'bayer8'
  | 'bayer2'
  | 'floyd'
  | 'atkinson'
  | 'threshold';

export interface AlgorithmOption {
  id: DitherAlgorithm;
  label: string;
}

export const ALGORITHMS: readonly AlgorithmOption[] = [
  { id: 'bayer4', label: 'Bayer 4x4' },
  { id: 'bayer8', label: 'Bayer 8x8' },
  { id: 'bayer2', label: 'Bayer 2x2' },
  { id: 'floyd', label: 'Floyd-Steinberg' },
  { id: 'atkinson', label: 'Atkinson (Mac)' },
  { id: 'threshold', label: 'Threshold' },
];

export type PaletteId =
  | 'ink'
  | 'gameboy'
  | 'amber'
  | 'phosphor'
  | 'pico8'
  | 'custom';

export interface PaletteDefinition {
  id: PaletteId;
  name: string;
  shortName: string;
  colors: string[];
  isTonalRamp: boolean;
}

export const PALETTES: readonly PaletteDefinition[] = [
  {
    id: 'ink',
    name: '1-Bit Ink',
    shortName: '1-Bit Ink',
    colors: ['#1C1917', '#F7F5F0'],
    isTonalRamp: true,
  },
  {
    id: 'gameboy',
    name: 'Game Boy DMG',
    shortName: 'Game Boy',
    colors: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'],
    isTonalRamp: true,
  },
  {
    id: 'amber',
    name: 'Amber CRT',
    shortName: 'Amber CRT',
    colors: ['#1A0E00', '#7A3E00', '#D97706', '#FDE68A'],
    isTonalRamp: true,
  },
  {
    id: 'phosphor',
    name: 'Phosphor Green',
    shortName: 'Phosphor',
    colors: ['#061409', '#14532D', '#22C55E', '#DCFCE7'],
    isTonalRamp: true,
  },
  {
    id: 'pico8',
    name: 'PICO-8 Retro',
    shortName: 'PICO-8',
    colors: [
      '#000000',
      '#1D2B53',
      '#7E2553',
      '#008751',
      '#AB5236',
      '#5F574F',
      '#FFA300',
      '#FFF1E8',
    ],
    isTonalRamp: false,
  },
  {
    id: 'custom',
    name: 'Custom 2-Color',
    shortName: 'Custom',
    colors: ['#1C1917', '#F7F5F0'],
    isTonalRamp: true,
  },
];

export interface DitherParams {
  algorithm: DitherAlgorithm;
  paletteId: PaletteId;
  customColors: [string, string];
  pixelScale: number;
  contrast: number;
  brightness: number;
  crtEnabled: boolean;
  scanlines: number;
  rgbSplit: number;
  vignette: number;
}

export const DEFAULT_DITHER_PARAMS: DitherParams = {
  algorithm: 'bayer4',
  paletteId: 'ink',
  customColors: ['#1C1917', '#F7F5F0'],
  pixelScale: 2,
  contrast: 8,
  brightness: 0,
  crtEnabled: false,
  scanlines: 45,
  rgbSplit: 2,
  vignette: 25,
};

type RgbColor = [number, number, number];

const BAYER_2X2 = [
  [0, 2],
  [3, 1],
];

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) {
    return [28, 25, 23];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function resolvePaletteHexColors(params: DitherParams): string[] {
  if (params.paletteId === 'custom') {
    return [params.customColors[0], params.customColors[1]];
  }
  const found = PALETTES.find((p) => p.id === params.paletteId);
  return found ? [...found.colors] : ['#1C1917', '#F7F5F0'];
}

function getPaletteDef(paletteId: PaletteId): PaletteDefinition {
  return PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
}

function clampByte(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : val;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function findNearestPaletteColor(
  r: number,
  g: number,
  b: number,
  palette: RgbColor[]
): RgbColor {
  let best = palette[0];
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const pr = palette[i][0];
    const pg = palette[i][1];
    const pb = palette[i][2];
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = palette[i];
    }
  }
  return best;
}

function getBayerNormalized(
  algorithm: DitherAlgorithm,
  x: number,
  y: number
): number {
  if (algorithm === 'bayer2') {
    return (BAYER_2X2[y & 1][x & 1] + 0.5) / 4;
  }
  if (algorithm === 'bayer4') {
    return (BAYER_4X4[y & 3][x & 3] + 0.5) / 16;
  }
  if (algorithm === 'bayer8') {
    return (BAYER_8X8[y & 7][x & 7] + 0.5) / 64;
  }
  return 0.5;
}

/**
 * Processes `sourceCanvas` into `targetCanvas` using typed arrays (`Uint8ClampedArray` & `Float32Array`).
 * Supports downscaled pixelation, ordered Bayer matrices, Floyd-Steinberg, Atkinson,
 * tonal ramps, multi-hue palettes, and optional CRT post-processing.
 */
export function renderDitherToCanvas(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  params: DitherParams
): void {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  if (srcW === 0 || srcH === 0) return;

  const scale = Math.max(1, Math.min(8, Math.round(params.pixelScale)));
  const workW = Math.max(1, Math.floor(srcW / scale));
  const workH = Math.max(1, Math.floor(srcH / scale));
  const outW = workW * scale;
  const outH = workH * scale;

  // Step 1: Downscale source into work canvas
  const workCanvas = document.createElement('canvas');
  workCanvas.width = workW;
  workCanvas.height = workH;
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!workCtx) return;

  workCtx.imageSmoothingEnabled = true;
  workCtx.drawImage(sourceCanvas, 0, 0, workW, workH);
  const srcData = workCtx.getImageData(0, 0, workW, workH).data;

  // Step 2: Apply brightness & contrast into float buffer
  const totalPixels = workW * workH;
  const buf = new Float32Array(totalPixels * 3);
  const brightOffset = params.brightness * 2.55;
  const cVal = params.contrast * 2.55;
  const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

  for (let i = 0; i < totalPixels; i++) {
    const sIdx = i * 4;
    const bIdx = i * 3;
    buf[bIdx] = clampByte(
      contrastFactor * (srcData[sIdx] - 128) + 128 + brightOffset
    );
    buf[bIdx + 1] = clampByte(
      contrastFactor * (srcData[sIdx + 1] - 128) + 128 + brightOffset
    );
    buf[bIdx + 2] = clampByte(
      contrastFactor * (srcData[sIdx + 2] - 128) + 128 + brightOffset
    );
  }

  // Step 3: Prepare palette
  const paletteDef = getPaletteDef(params.paletteId);
  const hexColors = resolvePaletteHexColors(params);
  let rgbPalette = hexColors.map(hexToRgb);

  if (paletteDef.isTonalRamp) {
    rgbPalette = [...rgbPalette].sort(
      (a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2])
    );
  }

  const quantWork = new Uint8ClampedArray(totalPixels * 3);
  const levels = Math.max(2, rgbPalette.length);

  // Step 4: Dither quantization
  if (
    params.algorithm === 'bayer2' ||
    params.algorithm === 'bayer4' ||
    params.algorithm === 'bayer8' ||
    params.algorithm === 'threshold'
  ) {
    for (let y = 0; y < workH; y++) {
      for (let x = 0; x < workW; x++) {
        const i = y * workW + x;
        const bIdx = i * 3;
        const r = buf[bIdx];
        const g = buf[bIdx + 1];
        const b = buf[bIdx + 2];

        const thresholdNorm = getBayerNormalized(params.algorithm, x, y);

        if (paletteDef.isTonalRamp) {
          const lum = luminance(r, g, b);
          const spread = 255 / (levels - 1);
          const adjusted = lum + (thresholdNorm - 0.5) * spread;
          let idx = Math.round((adjusted / 255) * (levels - 1));
          if (idx < 0) idx = 0;
          if (idx >= levels) idx = levels - 1;
          const chosen = rgbPalette[idx];
          quantWork[bIdx] = chosen[0];
          quantWork[bIdx + 1] = chosen[1];
          quantWork[bIdx + 2] = chosen[2];
        } else {
          const bias = (thresholdNorm - 0.5) * 64;
          const chosen = findNearestPaletteColor(
            clampByte(r + bias),
            clampByte(g + bias),
            clampByte(b + bias),
            rgbPalette
          );
          quantWork[bIdx] = chosen[0];
          quantWork[bIdx + 1] = chosen[1];
          quantWork[bIdx + 2] = chosen[2];
        }
      }
    }
  } else {
    // Error diffusion: Floyd-Steinberg or Atkinson
    const isAtkinson = params.algorithm === 'atkinson';
    for (let y = 0; y < workH; y++) {
      for (let x = 0; x < workW; x++) {
        const i = y * workW + x;
        const bIdx = i * 3;
        const oldR = clampByte(buf[bIdx]);
        const oldG = clampByte(buf[bIdx + 1]);
        const oldB = clampByte(buf[bIdx + 2]);

        let chosen: RgbColor;
        if (paletteDef.isTonalRamp) {
          const lum = luminance(oldR, oldG, oldB);
          let idx = Math.round((lum / 255) * (levels - 1));
          if (idx < 0) idx = 0;
          if (idx >= levels) idx = levels - 1;
          chosen = rgbPalette[idx];
        } else {
          chosen = findNearestPaletteColor(oldR, oldG, oldB, rgbPalette);
        }

        quantWork[bIdx] = chosen[0];
        quantWork[bIdx + 1] = chosen[1];
        quantWork[bIdx + 2] = chosen[2];

        const errR = oldR - chosen[0];
        const errG = oldG - chosen[1];
        const errB = oldB - chosen[2];

        const distribute = (nx: number, ny: number, weight: number) => {
          if (nx < 0 || nx >= workW || ny < 0 || ny >= workH) return;
          const nIdx = (ny * workW + nx) * 3;
          buf[nIdx] += errR * weight;
          buf[nIdx + 1] += errG * weight;
          buf[nIdx + 2] += errB * weight;
        };

        if (isAtkinson) {
          const w = 1 / 8;
          distribute(x + 1, y, w);
          distribute(x + 2, y, w);
          distribute(x - 1, y + 1, w);
          distribute(x, y + 1, w);
          distribute(x + 1, y + 1, w);
          distribute(x, y + 2, w);
        } else {
          distribute(x + 1, y, 7 / 16);
          distribute(x - 1, y + 1, 3 / 16);
          distribute(x, y + 1, 5 / 16);
          distribute(x + 1, y + 1, 1 / 16);
        }
      }
    }
  }

  // Step 5: Nearest-neighbor upscale to outW x outH
  const outBytes = new Uint8ClampedArray(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const wy = Math.floor(y / scale);
    const wyRow = wy * workW;
    const outRow = y * outW;
    for (let x = 0; x < outW; x++) {
      const wx = Math.floor(x / scale);
      const qIdx = (wyRow + wx) * 3;
      const oIdx = (outRow + x) * 4;
      outBytes[oIdx] = quantWork[qIdx];
      outBytes[oIdx + 1] = quantWork[qIdx + 1];
      outBytes[oIdx + 2] = quantWork[qIdx + 2];
      outBytes[oIdx + 3] = 255;
    }
  }

  // Step 6: Optional CRT Post-FX (RGB Split + Scanlines + Vignette)
  if (params.crtEnabled) {
    const splitPx = Math.max(0, Math.round(params.rgbSplit));
    const scanFactor = Math.max(0, Math.min(1, params.scanlines / 100)) * 0.65;
    const vigStrength = Math.max(0, Math.min(1, params.vignette / 100));

    let sourceForCrt = outBytes;
    if (splitPx > 0) {
      sourceForCrt = new Uint8ClampedArray(outBytes);
    }

    const halfW = outW * 0.5;
    const halfH = outH * 0.5;

    for (let y = 0; y < outH; y++) {
      const scanMult = y % 2 === 1 ? 1 - scanFactor : 1;
      const ny = (y - halfH) / halfH;
      const ny2 = ny * ny;
      const rowOffset = y * outW;

      for (let x = 0; x < outW; x++) {
        const oIdx = (rowOffset + x) * 4;
        let r: number;
        let g: number;
        let b: number;

        if (splitPx > 0) {
          const rx = Math.max(0, Math.min(outW - 1, x - splitPx));
          const bx = Math.max(0, Math.min(outW - 1, x + splitPx));
          r = sourceForCrt[(rowOffset + rx) * 4];
          g = sourceForCrt[oIdx + 1];
          b = sourceForCrt[(rowOffset + bx) * 4 + 2];
        } else {
          r = outBytes[oIdx];
          g = outBytes[oIdx + 1];
          b = outBytes[oIdx + 2];
        }

        const nx = (x - halfW) / halfW;
        const dist2 = Math.min(1.4, nx * nx + ny2);
        const vigMult = Math.max(0, 1 - dist2 * vigStrength * 0.75);
        const mult = scanMult * vigMult;

        outBytes[oIdx] = clampByte(r * mult);
        outBytes[oIdx + 1] = clampByte(g * mult);
        outBytes[oIdx + 2] = clampByte(b * mult);
      }
    }
  }

  targetCanvas.width = outW;
  targetCanvas.height = outH;
  const outCtx = targetCanvas.getContext('2d');
  if (!outCtx) return;
  outCtx.putImageData(new ImageData(outBytes, outW, outH), 0, 0);
}
