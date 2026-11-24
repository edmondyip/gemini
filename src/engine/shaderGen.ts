import {
  DitherParams,
  hexToRgb,
  resolvePaletteHexColors,
} from './ditherEngine';

function rgbToVec3(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `vec3(${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)})`;
}

export function generateCssFilterSnippet(params: DitherParams): string {
  const contrastPct = Math.round(100 + params.contrast);
  const brightPct = Math.round(100 + params.brightness);
  const lines = [
    `.dither-crt-surface {`,
    `  image-rendering: pixelated;`,
    `  image-rendering: crisp-edges;`,
    `  filter: contrast(${contrastPct}%) brightness(${brightPct}%);`,
    `}`,
  ];

  if (params.crtEnabled) {
    lines.push(
      `/* CRT Scanline overlay (${params.scanlines}% intensity, ${params.rgbSplit}px RGB split) */`
    );
    lines.push(
      `.dither-crt-surface::after { opacity: ${(params.scanlines / 100).toFixed(2)}; pointer-events: none; }`
    );
  }

  return lines.join('\n');
}

export function generateGodotPreviewLines(params: DitherParams): string[] {
  const colors = resolvePaletteHexColors(params);
  const c0 = colors[0] ?? '#1C1917';
  const c1 = colors[colors.length - 1] ?? '#F7F5F0';
  const scanNorm = params.crtEnabled ? (params.scanlines / 100).toFixed(2) : '0.00';
  const splitVal = params.crtEnabled ? params.rgbSplit.toFixed(1) : '0.0';

  return [
    `shader_type canvas_item;`,
    `uniform float pixel_size : hint_range(1.0, 8.0) = ${params.pixelScale.toFixed(1)};`,
    `uniform float scanline_strength : hint_range(0.0, 1.0) = ${scanNorm};`,
    `uniform float rgb_split_px : hint_range(0.0, 6.0) = ${splitVal};`,
    `uniform vec3 palette_dark : source_color = ${rgbToVec3(c0)};`,
    `uniform vec3 palette_light : source_color = ${rgbToVec3(c1)};`,
  ];
}
