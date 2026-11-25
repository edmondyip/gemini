import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  LOOK_PRESETS,
  LookPresetId,
  NeonRainPostFx,
} from './neonRainPostFx';

export type CameraPresetId = 'isometric' | 'cinematic' | 'street' | 'topdown';

export interface NeonRainSceneHandle {
  setCameraPreset(preset: CameraPresetId): void;
  setLookPreset(preset: LookPresetId): void;
  setRainEnabled(enabled: boolean): void;
  dispose(): void;
}

interface ResourceTracker {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
  geo<T extends THREE.BufferGeometry>(g: T): T;
  mat<T extends THREE.Material>(m: T): T;
  tex<T extends THREE.Texture>(t: T): T;
  disposeAll(): void;
}

function createTracker(): ResourceTracker {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  return {
    geometries,
    materials,
    textures,
    geo<T extends THREE.BufferGeometry>(g: T): T {
      geometries.push(g);
      return g;
    },
    mat<T extends THREE.Material>(m: T): T {
      materials.push(m);
      return m;
    },
    tex<T extends THREE.Texture>(t: T): T {
      textures.push(t);
      return t;
    },
    disposeAll(): void {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

function makeCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  return { canvas, ctx };
}

function createAsphaltTextures(tracker: ResourceTracker): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  // 1024x1024 road covering x in [-12, 12], z in [-12, 12]
  const size = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const toPx = (world: number): number => ((world + 12) / 24) * size;

  // Base dark wet asphalt
  ctx.fillStyle = '#141822';
  ctx.fillRect(0, 0, size, size);

  // Subtle aggregate & wet grime noise
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 2.5;
    const v = 14 + Math.floor(Math.random() * 22);
    ctx.fillStyle = `rgba(${v}, ${v + 4}, ${v + 12}, 0.25)`;
    ctx.fillRect(x, y, r, r);
  }

  // Darker wet tire track bands along main avenue
  const trackGrad = ctx.createLinearGradient(0, toPx(1.5), 0, toPx(9.5));
  trackGrad.addColorStop(0.0, 'rgba(6, 9, 15, 0.35)');
  trackGrad.addColorStop(0.22, 'rgba(8, 12, 20, 0.55)');
  trackGrad.addColorStop(0.5, 'rgba(22, 28, 40, 0.12)');
  trackGrad.addColorStop(0.76, 'rgba(8, 12, 20, 0.55)');
  trackGrad.addColorStop(1.0, 'rgba(6, 9, 15, 0.35)');
  ctx.fillStyle = trackGrad;
  ctx.fillRect(0, toPx(1.5), size, toPx(9.5) - toPx(1.5));

  // Tram rails along z = 3.6 (double steel tracks)
  const railZ1 = toPx(3.15);
  const railZ2 = toPx(4.05);
  ctx.fillStyle = '#3c4558';
  ctx.fillRect(0, railZ1 - 2, size, 4);
  ctx.fillRect(0, railZ2 - 2, size, 4);
  ctx.fillStyle = '#6f7e99';
  ctx.fillRect(0, railZ1 - 1, size, 1.5);
  ctx.fillRect(0, railZ2 - 1, size, 1.5);

  // Double yellow center lines along main avenue (split at intersection)
  const centerZ = toPx(5.5);
  ctx.fillStyle = '#d99b18';
  // West segment
  ctx.fillRect(toPx(-12), centerZ - 4, toPx(1.2) - toPx(-12), 2.5);
  ctx.fillRect(toPx(-12), centerZ + 1.5, toPx(1.2) - toPx(-12), 2.5);
  // East segment
  ctx.fillRect(toPx(9.8), centerZ - 4, toPx(12) - toPx(9.8), 2.5);
  ctx.fillRect(toPx(9.8), centerZ + 1.5, toPx(12) - toPx(9.8), 2.5);

  // Dashed lane divider on Cross Street (x = 5.5, z in [-12, 0.7])
  ctx.fillStyle = 'rgba(228, 232, 240, 0.78)';
  for (let z = -11.4; z < 0.2; z += 1.4) {
    ctx.fillRect(toPx(5.5) - 2, toPx(z), 4, toPx(z + 0.75) - toPx(z));
  }

  // Yellow hatched box junction at intersection (x in [2.2, 8.8], z in [1.7, 9.3])
  const bx0 = toPx(2.2);
  const bz0 = toPx(1.7);
  const bw = toPx(8.8) - bx0;
  const bh = toPx(9.3) - bz0;
  ctx.save();
  ctx.strokeStyle = 'rgba(225, 162, 24, 0.72)';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx0, bz0, bw, bh);
  ctx.beginPath();
  ctx.rect(bx0, bz0, bw, bh);
  ctx.clip();
  ctx.lineWidth = 2.2;
  for (let d = -bh; d < bw + bh; d += 26) {
    ctx.beginPath();
    ctx.moveTo(bx0 + d, bz0);
    ctx.lineTo(bx0 + d - bh, bz0 + bh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx0 + d, bz0);
    ctx.lineTo(bx0 + d + bh, bz0 + bh);
    ctx.stroke();
  }
  ctx.restore();

  // Zebra crosswalks (West, East, North approaches)
  ctx.fillStyle = 'rgba(232, 236, 244, 0.8)';
  // West crosswalk at x in [0.9, 1.9], z in [1.8, 9.2]
  for (let z = 1.95; z < 9.0; z += 0.85) {
    ctx.fillRect(toPx(0.9), toPx(z), toPx(1.9) - toPx(0.9), toPx(z + 0.44) - toPx(z));
  }
  // East crosswalk at x in [9.1, 10.1], z in [1.8, 9.2]
  for (let z = 1.95; z < 9.0; z += 0.85) {
    ctx.fillRect(toPx(9.1), toPx(z), toPx(10.1) - toPx(9.1), toPx(z + 0.44) - toPx(z));
  }
  // North crosswalk at z in [0.5, 1.4], x in [2.3, 8.7]
  for (let x = 2.4; x < 8.5; x += 0.85) {
    ctx.fillRect(toPx(x), toPx(0.5), toPx(x + 0.44) - toPx(x), toPx(1.4) - toPx(0.5));
  }

  // Roughness map (512x512): darker = smoother / wetter
  const rSize = 512;
  const { canvas: rCanvas, ctx: rCtx } = makeCanvas(rSize, rSize);
  rCtx.fillStyle = '#383838'; // glossy wet asphalt base
  rCtx.fillRect(0, 0, rSize, rSize);

  // Subtle drier patches & ultra-glossy puddle pools
  for (let i = 0; i < 65; i++) {
    const px = Math.random() * rSize;
    const py = Math.random() * rSize;
    const rad = 14 + Math.random() * 44;
    const isMirrorPuddle = i % 3 !== 0;
    const g = rCtx.createRadialGradient(px, py, 2, px, py, rad);
    if (isMirrorPuddle) {
      g.addColorStop(0, 'rgba(6, 6, 6, 0.92)');
      g.addColorStop(1, 'rgba(6, 6, 6, 0)');
    } else {
      g.addColorStop(0, 'rgba(110, 110, 110, 0.45)');
      g.addColorStop(1, 'rgba(110, 110, 110, 0)');
    }
    rCtx.fillStyle = g;
    rCtx.beginPath();
    rCtx.arc(px, py, rad, 0, Math.PI * 2);
    rCtx.fill();
  }

  const map = tracker.tex(new THREE.CanvasTexture(canvas));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const roughnessMap = tracker.tex(new THREE.CanvasTexture(rCanvas));
  roughnessMap.anisotropy = 4;

  return { map, roughnessMap };
}

function createSidewalkTexture(tracker: ResourceTracker): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = '#262b36';
  ctx.fillRect(0, 0, size, size);

  const step = 32;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const shade = 34 + Math.floor(Math.random() * 14);
      ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 12})`;
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }

  // Wet sheen blotches
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 16 + Math.random() * 28;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(10, 14, 24, 0.42)');
    g.addColorStop(1, 'rgba(10, 14, 24, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFacadeTexture(
  tracker: ResourceTracker,
  baseHex: string,
  streakColor: string
): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 512);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 512);

  // Concrete horizontal panel seams
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(0, y, 256, 2);
  }

  // Rain streaks & weathering
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 480;
    const h = 24 + Math.random() * 90;
    ctx.fillStyle = streakColor;
    ctx.fillRect(x, y, 1 + Math.random() * 2, h);
  }

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWindowTexture(
  tracker: ResourceTracker,
  tone: 'warm' | 'cool' | 'teal' | 'dim',
  hasBlinds: boolean
): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 160);

  if (tone === 'dim') {
    ctx.fillStyle = '#0e1320';
    ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = 'rgba(65, 95, 145, 0.22)';
    ctx.fillRect(6, 6, 116, 148);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    if (tone === 'warm') {
      grad.addColorStop(0, '#ffd485');
      grad.addColorStop(1, '#c9782b');
    } else if (tone === 'cool') {
      grad.addColorStop(0, '#d8f4ff');
      grad.addColorStop(1, '#6ba4c9');
    } else {
      grad.addColorStop(0, '#b5fff0');
      grad.addColorStop(1, '#2f8c8a');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 160);

    // Subtle interior silhouette / curtain
    ctx.fillStyle = 'rgba(12, 16, 28, 0.34)';
    ctx.fillRect(0, 105, 42, 55);
    ctx.fillRect(88, 0, 40, 160);
  }

  if (hasBlinds) {
    ctx.fillStyle = 'rgba(14, 18, 28, 0.48)';
    for (let y = 8; y < 96; y += 11) {
      ctx.fillRect(4, y, 120, 4);
    }
  }

  // Dark window frame & center mullion
  ctx.strokeStyle = '#141923';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 128, 160);
  ctx.fillStyle = '#141923';
  ctx.fillRect(61, 0, 6, 160);
  ctx.fillRect(0, 78, 128, 5);

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createShopfrontTexture(
  tracker: ResourceTracker,
  title: string,
  accentHex: string,
  warmBgHex: string
): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 256);

  // Warm interior glow
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#ffe3a8');
  grad.addColorStop(0.6, warmBgHex);
  grad.addColorStop(1, '#4c2c16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Retro HK floor/wall mosaic tile band
  for (let x = 0; x < 512; x += 24) {
    for (let y = 176; y < 256; y += 24) {
      ctx.fillStyle =
        ((x + y) / 24) % 2 === 0
          ? 'rgba(28, 92, 74, 0.55)'
          : 'rgba(245, 236, 212, 0.45)';
      ctx.fillRect(x + 1, y + 1, 22, 22);
    }
  }

  // Menu board & hanging lamps silhouette inside
  ctx.fillStyle = '#1b1d24';
  ctx.fillRect(48, 42, 180, 66);
  ctx.fillStyle = accentHex;
  ctx.font = 'bold 34px "PingFang TC", "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 138, 76);

  // Counter & stools silhouette
  ctx.fillStyle = 'rgba(20, 16, 14, 0.72)';
  ctx.fillRect(250, 150, 220, 106);
  ctx.fillRect(42, 166, 170, 90);

  // Shopfront glass mullions
  ctx.fillStyle = '#151922';
  ctx.fillRect(0, 0, 512, 14);
  ctx.fillRect(0, 244, 512, 12);
  for (let x = 0; x <= 512; x += 128) {
    ctx.fillRect(x - 4, 0, 8, 256);
  }

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAcGrilleTexture(tracker: ResourceTracker): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 96);
  ctx.fillStyle = '#535b6a';
  ctx.fillRect(0, 0, 128, 96);

  // Fan circular dark housing
  ctx.fillStyle = '#191d26';
  ctx.beginPath();
  ctx.arc(44, 48, 30, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal louver slats
  ctx.fillStyle = '#2d333f';
  for (let y = 14; y < 84; y += 8) {
    ctx.fillRect(10, y, 68, 3);
    ctx.fillRect(84, y, 32, 3);
  }

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface NeonSignOptions {
  text: string;
  subtext?: string;
  color: string;
  borderColor?: string;
  vertical?: boolean;
  shape?: 'rect' | 'pawn';
  widthPx?: number;
  heightPx?: number;
}

function createNeonSignTexture(
  tracker: ResourceTracker,
  opts: NeonSignOptions
): THREE.CanvasTexture {
  const w = opts.widthPx ?? (opts.vertical ? 256 : 512);
  const h = opts.heightPx ?? (opts.vertical ? 640 : 256);
  const { canvas, ctx } = makeCanvas(w, h);

  // Deep sign backing
  ctx.fillStyle = '#070a12';
  ctx.fillRect(0, 0, w, h);

  const borderColor = opts.borderColor ?? opts.color;
  const pad = 18;

  // Outer glowing neon border
  ctx.save();
  ctx.strokeStyle = borderColor;
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 22;
  ctx.lineWidth = 8;

  if (opts.shape === 'pawn') {
    // Classic HK octagonal/bat-like pawnshop outline
    ctx.beginPath();
    ctx.moveTo(w * 0.25, pad);
    ctx.lineTo(w * 0.75, pad);
    ctx.lineTo(w - pad, h * 0.25);
    ctx.lineTo(w - pad, h * 0.75);
    ctx.lineTo(w * 0.75, h - pad);
    ctx.lineTo(w * 0.25, h - pad);
    ctx.lineTo(pad, h * 0.75);
    ctx.lineTo(pad, h * 0.25);
    ctx.closePath();
    ctx.stroke();

    // Inner bright core
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#fff5e6';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
  }
  ctx.restore();

  // Neon characters (multi-pass bloom + bright white-hot core)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (opts.vertical) {
    const chars = Array.from(opts.text);
    const usableH = h - pad * 3.5;
    const step = usableH / Math.max(1, chars.length);
    const fontSize = Math.min(w * 0.56, step * 0.82);
    ctx.font = `700 ${Math.floor(fontSize)}px "PingFang TC", "Noto Sans TC", "Hiragino Sans CNS", sans-serif`;

    chars.forEach((ch, idx) => {
      const cy = pad * 1.75 + step * (idx + 0.5);
      // Outer bloom pass
      ctx.shadowColor = opts.color;
      ctx.shadowBlur = 28;
      ctx.fillStyle = opts.color;
      ctx.fillText(ch, w / 2, cy);
      ctx.fillText(ch, w / 2, cy);
      // Inner hot tube core
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.82;
      ctx.fillText(ch, w / 2, cy);
      ctx.globalAlpha = 1;
    });
  } else {
    const fontSize = opts.subtext ? h * 0.42 : h * 0.5;
    const cy = opts.subtext ? h * 0.42 : h * 0.52;
    ctx.font = `700 ${Math.floor(fontSize)}px "PingFang TC", "Noto Sans TC", "Hiragino Sans CNS", sans-serif`;

    ctx.shadowColor = opts.color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = opts.color;
    ctx.fillText(opts.text, w / 2, cy);
    ctx.fillText(opts.text, w / 2, cy);

    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.82;
    ctx.fillText(opts.text, w / 2, cy);
    ctx.globalAlpha = 1;

    if (opts.subtext) {
      ctx.font = `600 ${Math.floor(h * 0.14)}px "JetBrains Mono", monospace`;
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = borderColor;
      ctx.fillText(opts.subtext, w / 2, h * 0.77);
    }
  }
  ctx.restore();

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHaloSpriteTexture(tracker: ResourceTracker): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0.0, 'rgba(255, 240, 210, 0.95)');
  grad.addColorStop(0.25, 'rgba(255, 195, 115, 0.5)');
  grad.addColorStop(0.6, 'rgba(255, 160, 80, 0.12)');
  grad.addColorStop(1.0, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTaxiRoofTexture(tracker: ResourceTracker): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 64);
  ctx.fillStyle = '#fff5d6';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#141414';
  ctx.font = 'bold 34px "JetBrains Mono", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAXI', 64, 34);
  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTramWindowTexture(tracker: ResourceTracker): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 128);
  ctx.fillStyle = '#12402b';
  ctx.fillRect(0, 0, 256, 128);

  // Cream center band
  ctx.fillStyle = '#e8dfc2';
  ctx.fillRect(0, 56, 256, 18);

  // Glowing warm upper & lower windows
  for (let x = 14; x < 240; x += 38) {
    ctx.fillStyle = '#ffd789';
    ctx.fillRect(x, 12, 28, 34); // upper deck
    ctx.fillRect(x, 78, 28, 34); // lower deck
    ctx.fillStyle = 'rgba(24, 30, 26, 0.35)';
    ctx.fillRect(x + 2, 34, 24, 12);
  }

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface FlickerSign {
  material: THREE.MeshStandardMaterial;
  light?: THREE.PointLight;
  baseEmissive: number;
  baseLight: number;
  seed: number;
}

interface PuddleRipple {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  phase: number;
  speed: number;
  maxScale: number;
}

interface PedestrianAgent {
  group: THREE.Group;
  axis: 'x' | 'z';
  min: number;
  max: number;
  speed: number;
  dir: 1 | -1;
  pos: number;
  phase: number;
}

interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  isometric: {
    position: new THREE.Vector3(19.5, 16.5, 20.5),
    target: new THREE.Vector3(-0.8, 2.8, -0.4),
  },
  cinematic: {
    position: new THREE.Vector3(17.5, 11.5, 15.5),
    target: new THREE.Vector3(-0.6, 3.2, -0.4),
  },
  street: {
    position: new THREE.Vector3(10.6, 2.6, 9.6),
    target: new THREE.Vector3(-2.6, 4.5, -2.6),
  },
  topdown: {
    position: new THREE.Vector3(0.6, 30.0, 5.2),
    target: new THREE.Vector3(0.0, 0.5, 0.0),
  },
};

export function mountNeonRainScene(container: HTMLElement): NeonRainSceneHandle {
  const tracker = createTracker();
  const getViewportSize = (): { w: number; h: number } => ({
    w: container.clientWidth > 0 ? container.clientWidth : window.innerWidth || 1280,
    h:
      container.clientHeight > 0
        ? container.clientHeight
        : window.innerHeight || 720,
  });

  const { w: initialW, h: initialH } = getViewportSize();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(initialW, initialH);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.replaceChildren();
  container.appendChild(renderer.domElement);

  const onContextLost = (e: Event): void => {
    e.preventDefault();
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b14);
  const fog = new THREE.FogExp2(0x070b14, LOOK_PRESETS.cinema.fogDensity);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(36, initialW / initialH, 0.2, 140);
  camera.position.copy(CAMERA_PRESETS.isometric.position);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(CAMERA_PRESETS.isometric.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 8;
  controls.maxDistance = 42;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.update();

  const postFx = new NeonRainPostFx(
    renderer,
    initialW,
    initialH,
    pixelRatio,
    'cinema'
  );

  // ---------------------------------------------------------------------------
  // 1. Lighting & Atmosphere
  // ---------------------------------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0x283a5c, 0.55);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0x6b96d6, 0x1d2236, 1.25);
  scene.add(hemiLight);

  const moonLight = new THREE.DirectionalLight(0x9ec5ff, 1.9);
  moonLight.position.set(14, 24, 16);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.camera.near = 2;
  moonLight.shadow.camera.far = 65;
  moonLight.shadow.camera.left = -17;
  moonLight.shadow.camera.right = 17;
  moonLight.shadow.camera.top = 17;
  moonLight.shadow.camera.bottom = -17;
  moonLight.shadow.bias = -0.0004;
  scene.add(moonLight);

  // ---------------------------------------------------------------------------
  // 2. Diorama Plinth, Wet Crossroad & Sidewalks
  // ---------------------------------------------------------------------------
  const plinthMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x111624,
      roughness: 0.78,
      metalness: 0.18,
    })
  );
  const plinthTrimMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x1d2538,
      roughness: 0.55,
      metalness: 0.35,
    })
  );

  const plinth = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(24, 1.8, 24)),
    plinthMat
  );
  plinth.position.set(0, -0.9, 0);
  plinth.receiveShadow = true;
  scene.add(plinth);

  const plinthTrim = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(24.16, 0.14, 24.16)),
    plinthTrimMat
  );
  plinthTrim.position.set(0, -0.07, 0);
  scene.add(plinthTrim);

  const plinthFoot = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(23.2, 0.3, 23.2)),
    plinthTrimMat
  );
  plinthFoot.position.set(0, -1.95, 0);
  scene.add(plinthFoot);

  // Wet asphalt plane covering full slab surface at y = 0.01
  const { map: asphaltMap, roughnessMap: asphaltRoughMap } =
    createAsphaltTextures(tracker);
  const asphaltMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: asphaltMap,
      roughnessMap: asphaltRoughMap,
      roughness: 0.14,
      metalness: 0.32,
    })
  );
  const asphaltPlane = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(24, 24)),
    asphaltMat
  );
  asphaltPlane.rotation.x = -Math.PI / 2;
  asphaltPlane.position.y = 0.01;
  asphaltPlane.receiveShadow = true;
  scene.add(asphaltPlane);

  // Raised concrete sidewalks
  const sidewalkTex = createSidewalkTexture(tracker);
  const sidewalkMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.38,
      metalness: 0.14,
    })
  );
  const curbMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x3b4252,
      roughness: 0.65,
      metalness: 0.1,
    })
  );

  function addSidewalkBlock(
    x0: number,
    x1: number,
    z0: number,
    z1: number
  ): void {
    const w = x1 - x0;
    const d = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;

    const slab = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(w, 0.3, d)),
      sidewalkMat
    );
    slab.position.set(cx, 0.15, cz);
    slab.receiveShadow = true;
    slab.castShadow = true;
    scene.add(slab);

    // Thin top curb edge trim
    const trim = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(w + 0.04, 0.05, d + 0.04)),
      curbMat
    );
    trim.position.set(cx, 0.285, cz);
    trim.receiveShadow = true;
    scene.add(trim);
  }

  // NW block, NE block, South strip
  addSidewalkBlock(-12, 2.0, -12, 1.5);
  addSidewalkBlock(9.0, 12, -12, 1.5);
  addSidewalkBlock(-12, 12, 9.5, 12);

  // Storm drain grates along gutters
  const grateMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.45,
      metalness: 0.75,
    })
  );
  const gratePositions: Array<[number, number]> = [
    [-6.5, 1.68],
    [-0.2, 1.68],
    [1.82, -2.5],
    [9.18, -3.2],
    [-3.0, 9.32],
    [6.5, 9.32],
  ];
  for (const [gx, gz] of gratePositions) {
    const grate = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(0.65, 0.02, 0.36)),
      grateMat
    );
    grate.position.set(gx, 0.02, gz);
    scene.add(grate);
  }

  // HK yellow pedestrian bollards / guardrails along corner curb
  const bollardMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0xe6a817,
      roughness: 0.35,
      metalness: 0.35,
    })
  );
  const bollardGeo = tracker.geo(new THREE.CylinderGeometry(0.045, 0.045, 0.56, 8));
  const bollardCoords: Array<[number, number]> = [
    [-2.5, 1.32],
    [-1.1, 1.32],
    [0.3, 1.32],
    [1.65, 1.32],
    [1.82, -0.1],
    [1.82, -1.5],
    [1.82, -2.9],
  ];
  for (const [bx, bz] of bollardCoords) {
    const b = new THREE.Mesh(bollardGeo, bollardMat);
    b.position.set(bx, 0.58, bz);
    b.castShadow = true;
    scene.add(b);
  }

  // Classic HK green postbox on south sidewalk
  const postboxMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.35,
      metalness: 0.45,
    })
  );
  const postbox = new THREE.Mesh(
    tracker.geo(new THREE.CylinderGeometry(0.18, 0.2, 0.88, 12)),
    postboxMat
  );
  postbox.position.set(-2.6, 0.74, 10.2);
  postbox.castShadow = true;
  scene.add(postbox);

  // Reflective puddle patches + animated expanding rain ripple rings
  const puddleMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      roughness: 0.04,
      metalness: 0.68,
      transparent: true,
      opacity: 0.72,
    })
  );
  const puddleSpecs: Array<[number, number, number, number]> = [
    [-5.5, 5.1, 1.6, 0.9],
    [-1.2, 6.2, 1.4, 0.85],
    [4.4, 4.9, 1.8, 1.1],
    [7.2, 7.6, 1.5, 0.8],
    [5.6, -2.2, 1.3, 1.7],
    [4.2, -6.5, 1.2, 1.4],
    [-8.8, 8.2, 1.5, 0.95],
  ];
  for (const [px, pz, sx, sz] of puddleSpecs) {
    const puddle = new THREE.Mesh(
      tracker.geo(new THREE.CircleGeometry(1, 24)),
      puddleMat
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.set(sx, sz, 1);
    puddle.position.set(px, 0.022, pz);
    puddle.receiveShadow = true;
    scene.add(puddle);
  }

  const rippleGeo = tracker.geo(new THREE.RingGeometry(0.1, 0.14, 24));
  const ripples: PuddleRipple[] = [];
  for (let i = 0; i < 18; i++) {
    const spec = puddleSpecs[i % puddleSpecs.length];
    const rMat = tracker.mat(
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x9bd7ff : 0xff9ad0,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    const mesh = new THREE.Mesh(rippleGeo, rMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(
      spec[0] + (Math.random() - 0.5) * spec[2] * 0.9,
      0.028,
      spec[1] + (Math.random() - 0.5) * spec[3] * 0.9
    );
    scene.add(mesh);
    ripples.push({
      mesh,
      material: rMat,
      phase: Math.random(),
      speed: 0.45 + Math.random() * 0.45,
      maxScale: 2.2 + Math.random() * 1.4,
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Layered Hong Kong Tong Lau Architecture
  // ---------------------------------------------------------------------------
  const darkMetalMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x161b24,
      roughness: 0.55,
      metalness: 0.72,
    })
  );
  const concreteTrimMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x2f3646,
      roughness: 0.85,
      metalness: 0.08,
    })
  );
  const awningMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x243442,
      roughness: 0.45,
      metalness: 0.55,
    })
  );
  const acBodyMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x4b5363,
      roughness: 0.6,
      metalness: 0.35,
    })
  );
  const acGrilleMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: createAcGrilleTexture(tracker),
      roughness: 0.6,
      metalness: 0.4,
    })
  );

  const windowMaterials = [
    tracker.mat(
      new THREE.MeshStandardMaterial({
        map: createWindowTexture(tracker, 'warm', true),
        emissive: new THREE.Color(0xffb85c),
        emissiveMap: createWindowTexture(tracker, 'warm', true),
        emissiveIntensity: 0.85,
        roughness: 0.25,
      })
    ),
    tracker.mat(
      new THREE.MeshStandardMaterial({
        map: createWindowTexture(tracker, 'cool', false),
        emissive: new THREE.Color(0x88dcff),
        emissiveMap: createWindowTexture(tracker, 'cool', false),
        emissiveIntensity: 0.65,
        roughness: 0.25,
      })
    ),
    tracker.mat(
      new THREE.MeshStandardMaterial({
        map: createWindowTexture(tracker, 'teal', true),
        emissive: new THREE.Color(0x5ef0cf),
        emissiveMap: createWindowTexture(tracker, 'teal', true),
        emissiveIntensity: 0.55,
        roughness: 0.25,
      })
    ),
    tracker.mat(
      new THREE.MeshStandardMaterial({
        map: createWindowTexture(tracker, 'dim', false),
        roughness: 0.2,
        metalness: 0.45,
      })
    ),
  ];

  const acGeo = tracker.geo(new THREE.BoxGeometry(0.48, 0.34, 0.32));
  const winPaneGeo = tracker.geo(new THREE.PlaneGeometry(0.76, 0.96));
  const winFrameGeo = tracker.geo(new THREE.BoxGeometry(0.86, 1.06, 0.14));
  const cageBarGeo = tracker.geo(new THREE.BoxGeometry(0.025, 0.98, 0.025));

  function addWindowAssembly(
    parent: THREE.Group,
    wx: number,
    wy: number,
    wz: number,
    rotY: number,
    variant: number,
    withAc: boolean,
    withCage: boolean
  ): void {
    const g = new THREE.Group();
    g.position.set(wx, wy, wz);
    g.rotation.y = rotY;

    // Recessed dark frame surround
    const frame = new THREE.Mesh(winFrameGeo, darkMetalMat);
    frame.position.z = -0.02;
    g.add(frame);

    const pane = new THREE.Mesh(
      winPaneGeo,
      windowMaterials[variant % windowMaterials.length]
    );
    pane.position.z = 0.055;
    g.add(pane);

    // Concrete window sill
    const sill = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(0.96, 0.08, 0.22)),
      concreteTrimMat
    );
    sill.position.set(0, -0.54, 0.08);
    g.add(sill);

    if (withCage) {
      for (const cx of [-0.36, -0.12, 0.12, 0.36]) {
        const bar = new THREE.Mesh(cageBarGeo, darkMetalMat);
        bar.position.set(cx, 0, 0.12);
        g.add(bar);
      }
    }

    if (withAc) {
      const ac = new THREE.Mesh(acGeo, [
        acBodyMat,
        acBodyMat,
        acBodyMat,
        acBodyMat,
        acGrilleMat,
        acBodyMat,
      ]);
      ac.position.set(0.26, -0.34, 0.2);
      ac.castShadow = true;
      g.add(ac);
    }

    parent.add(g);
  }

  function addCorrugatedAwning(
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
    rotY = 0
  ): void {
    const awningGroup = new THREE.Group();
    awningGroup.position.set(x, y, z);
    awningGroup.rotation.y = rotY;

    const plate = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(width, 0.06, depth)),
      awningMat
    );
    plate.rotation.x = 0.22;
    plate.castShadow = true;
    plate.receiveShadow = true;
    awningGroup.add(plate);

    // Corrugated ribs
    const ribGeo = tracker.geo(new THREE.BoxGeometry(0.05, 0.04, depth));
    for (let rx = -width / 2 + 0.15; rx < width / 2; rx += 0.28) {
      const rib = new THREE.Mesh(ribGeo, darkMetalMat);
      rib.position.set(rx, 0.03, 0);
      rib.rotation.x = 0.22;
      awningGroup.add(rib);
    }

    parent.add(awningGroup);
  }

  function addRooftopDetails(
    parent: THREE.Group,
    w: number,
    d: number,
    roofY: number,
    withWaterTower: boolean,
    withBeacon: boolean
  ): void {
    // Parapet walls
    const parapetH = 0.42;
    const t = 0.18;
    const pNorth = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(w, parapetH, t)),
      concreteTrimMat
    );
    pNorth.position.set(0, roofY + parapetH / 2, -d / 2 + t / 2);
    const pSouth = pNorth.clone();
    pSouth.position.z = d / 2 - t / 2;
    const pWest = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(t, parapetH, d)),
      concreteTrimMat
    );
    pWest.position.set(-w / 2 + t / 2, roofY + parapetH / 2, 0);
    const pEast = pWest.clone();
    pEast.position.x = w / 2 - t / 2;
    parent.add(pNorth, pSouth, pWest, pEast);

    // Stair bulkhead
    const bulkhead = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(1.4, 1.15, 1.3)),
      concreteTrimMat
    );
    bulkhead.position.set(-w * 0.22, roofY + 0.57, -d * 0.2);
    bulkhead.castShadow = true;
    parent.add(bulkhead);

    if (withWaterTower) {
      const tankMat = tracker.mat(
        new THREE.MeshStandardMaterial({
          color: 0x5c687a,
          roughness: 0.45,
          metalness: 0.65,
        })
      );
      const tank = new THREE.Mesh(
        tracker.geo(new THREE.CylinderGeometry(0.58, 0.58, 1.15, 14)),
        tankMat
      );
      tank.position.set(w * 0.2, roofY + 1.05, -d * 0.15);
      tank.castShadow = true;
      parent.add(tank);

      const legGeo = tracker.geo(new THREE.BoxGeometry(0.07, 0.55, 0.07));
      for (const [lx, lz] of [
        [-0.35, -0.35],
        [0.35, -0.35],
        [-0.35, 0.35],
        [0.35, 0.35],
      ]) {
        const leg = new THREE.Mesh(legGeo, darkMetalMat);
        leg.position.set(w * 0.2 + lx, roofY + 0.27, -d * 0.15 + lz);
        parent.add(leg);
      }
    }

    // TV Antennas
    const mast = new THREE.Mesh(
      tracker.geo(new THREE.CylinderGeometry(0.03, 0.04, 2.2, 6)),
      darkMetalMat
    );
    mast.position.set(w * 0.26, roofY + 1.1, d * 0.2);
    parent.add(mast);

    const crossbar = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(0.9, 0.03, 0.03)),
      darkMetalMat
    );
    crossbar.position.set(w * 0.26, roofY + 1.95, d * 0.2);
    parent.add(crossbar);

    if (withBeacon) {
      const beaconMat = tracker.mat(
        new THREE.MeshBasicMaterial({ color: 0xff2233 })
      );
      const beacon = new THREE.Mesh(
        tracker.geo(new THREE.SphereGeometry(0.08, 8, 8)),
        beaconMat
      );
      beacon.position.set(w * 0.26, roofY + 2.24, d * 0.2);
      parent.add(beacon);
    }
  }

  // --- Building A: Flagship Corner Tong Lau (x in [-4.2, 0.6], z in [-4.6, 0.2]) ---
  const bldgA = new THREE.Group();
  bldgA.position.set(-1.8, 0.3, -2.2); // center of 4.8 x 4.8
  scene.add(bldgA);

  const facadeAMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: createFacadeTexture(tracker, '#353e4d', 'rgba(12, 16, 26, 0.32)'),
      roughness: 0.82,
      metalness: 0.1,
    })
  );
  const bldgABody = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(4.8, 10.5, 4.8)),
    facadeAMat
  );
  bldgABody.position.y = 5.25;
  bldgABody.castShadow = true;
  bldgABody.receiveShadow = true;
  bldgA.add(bldgABody);

  // Horizontal story cornices
  for (let floor = 1; floor <= 4; floor++) {
    const ledge = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(4.98, 0.14, 4.98)),
      concreteTrimMat
    );
    ledge.position.y = 2.4 + (floor - 1) * 2.0;
    ledge.castShadow = true;
    bldgA.add(ledge);
  }

  // Ground-floor Cha Chaan Teng (冰室) storefront on south & east faces
  const bingSuttTex = createShopfrontTexture(
    tracker,
    '冰室',
    '#ff4499',
    '#d97b2c'
  );
  const bingSuttMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: bingSuttTex,
      emissive: new THREE.Color(0xffb454),
      emissiveMap: bingSuttTex,
      emissiveIntensity: 1.3,
      roughness: 0.22,
    })
  );
  const shopSouth = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(4.3, 2.05)),
    bingSuttMat
  );
  shopSouth.position.set(0, 1.12, 2.41);
  bldgA.add(shopSouth);

  const shopEast = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(4.3, 2.05)),
    bingSuttMat
  );
  shopEast.rotation.y = Math.PI / 2;
  shopEast.position.set(2.41, 1.12, 0);
  bldgA.add(shopEast);

  addCorrugatedAwning(bldgA, 0, 2.28, 2.86, 4.95, 1.05, 0);
  addCorrugatedAwning(bldgA, 2.86, 2.28, 0, 4.95, 1.05, Math.PI / 2);

  // Warm interior spill light onto sidewalk
  const cafeLight = new THREE.PointLight(0xffa64d, 18, 14, 1.5);
  cafeLight.position.set(-0.6, 1.9, 0.9);
  scene.add(cafeLight);

  // Upper floor windows on Building A (South & East faces)
  for (let floor = 0; floor < 4; floor++) {
    const wy = 3.35 + floor * 2.0;
    for (let col = 0; col < 3; col++) {
      const wx = -1.45 + col * 1.45;
      addWindowAssembly(
        bldgA,
        wx,
        wy,
        2.4,
        0,
        floor * 3 + col,
        (floor + col) % 2 === 0,
        col !== 1
      );
      addWindowAssembly(
        bldgA,
        2.4,
        wy,
        wx,
        Math.PI / 2,
        floor * 2 + col + 1,
        (floor + col) % 2 === 1,
        col === 1
      );
    }
  }

  // Vertical exterior drain pipes on corner
  const pipeGeo = tracker.geo(new THREE.CylinderGeometry(0.055, 0.055, 10.4, 8));
  const pipeA = new THREE.Mesh(pipeGeo, darkMetalMat);
  pipeA.position.set(-2.36, 5.2, 2.42);
  bldgA.add(pipeA);

  addRooftopDetails(bldgA, 4.8, 4.8, 10.5, true, true);

  // --- Building B: Adjacent Tenement (x in [-11.0, -4.4], z in [-5.0, 0.2]) ---
  const bldgB = new THREE.Group();
  bldgB.position.set(-7.7, 0.3, -2.4); // 6.6 x 5.2
  scene.add(bldgB);

  const facadeBMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: createFacadeTexture(tracker, '#3e3940', 'rgba(14, 12, 22, 0.36)'),
      roughness: 0.85,
      metalness: 0.08,
    })
  );
  const bldgBBody = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(6.6, 8.4, 5.2)),
    facadeBMat
  );
  bldgBBody.position.y = 4.2;
  bldgBBody.castShadow = true;
  bldgBBody.receiveShadow = true;
  bldgB.add(bldgBBody);

  for (let floor = 1; floor <= 3; floor++) {
    const ledge = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(6.76, 0.13, 5.36)),
      concreteTrimMat
    );
    ledge.position.y = 2.4 + (floor - 1) * 2.0;
    bldgB.add(ledge);
  }

  // Twin ground floor storefronts: 燒臘 & 藥房
  const roastTex = createShopfrontTexture(tracker, '燒臘', '#ff4433', '#c85a22');
  const roastMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: roastTex,
      emissive: new THREE.Color(0xff8c42),
      emissiveMap: roastTex,
      emissiveIntensity: 1.3,
      roughness: 0.25,
    })
  );
  const pharmaTex = createShopfrontTexture(tracker, '藥房', '#22ff88', '#338878');
  const pharmaMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: pharmaTex,
      emissive: new THREE.Color(0x55ffd0),
      emissiveMap: pharmaTex,
      emissiveIntensity: 1.3,
      roughness: 0.25,
    })
  );

  const shopB1 = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(2.9, 2.0)),
    roastMat
  );
  shopB1.position.set(-1.6, 1.1, 2.61);
  const shopB2 = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(2.9, 2.0)),
    pharmaMat
  );
  shopB2.position.set(1.6, 1.1, 2.61);
  bldgB.add(shopB1, shopB2);

  addCorrugatedAwning(bldgB, 0, 2.26, 3.04, 6.6, 0.98, 0);

  for (let floor = 0; floor < 3; floor++) {
    const wy = 3.35 + floor * 2.0;
    for (let col = 0; col < 4; col++) {
      const wx = -2.35 + col * 1.56;
      addWindowAssembly(
        bldgB,
        wx,
        wy,
        2.6,
        0,
        floor * 4 + col + 2,
        (floor + col) % 2 === 1,
        (floor + col) % 3 === 0
      );
    }
  }
  addRooftopDetails(bldgB, 6.6, 5.2, 8.4, false, false);

  // --- Building C: Tall Back-Alley Neon Tenement (x in [-9.6, 0.5], z in [-11.4, -5.8]) ---
  const bldgC = new THREE.Group();
  bldgC.position.set(-4.55, 0.3, -8.6); // 10.1 x 5.6
  scene.add(bldgC);

  const facadeCMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: createFacadeTexture(tracker, '#293245', 'rgba(8, 12, 22, 0.38)'),
      roughness: 0.85,
      metalness: 0.1,
    })
  );
  const bldgCBody = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(10.1, 12.6, 5.6)),
    facadeCMat
  );
  bldgCBody.position.y = 6.3;
  bldgCBody.castShadow = true;
  bldgCBody.receiveShadow = true;
  bldgC.add(bldgCBody);

  for (let floor = 1; floor <= 5; floor++) {
    const ledge = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(10.26, 0.13, 5.76)),
      concreteTrimMat
    );
    ledge.position.y = 2.4 + (floor - 1) * 2.0;
    bldgC.add(ledge);
  }

  for (let floor = 0; floor < 5; floor++) {
    const wy = 3.35 + floor * 2.0;
    for (let col = 0; col < 5; col++) {
      const wx = -3.8 + col * 1.9;
      addWindowAssembly(
        bldgC,
        wx,
        wy,
        2.8,
        0,
        floor * 5 + col,
        (floor + col) % 3 === 0,
        col % 2 === 0
      );
    }
    // East face windows facing cross street
    for (let col = 0; col < 2; col++) {
      const wz = -1.4 + col * 2.8;
      addWindowAssembly(
        bldgC,
        5.05,
        wy,
        wz,
        Math.PI / 2,
        floor + col + 1,
        floor % 2 === 0,
        true
      );
    }
  }
  addRooftopDetails(bldgC, 10.1, 5.6, 12.6, true, true);

  // --- Building D: East-Side Cross-Street Facade (x in [9.5, 11.8], z in [-9.5, 0.3]) ---
  const bldgD = new THREE.Group();
  bldgD.position.set(10.65, 0.3, -4.6); // 2.3 x 9.8
  scene.add(bldgD);

  const bldgDBody = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(2.3, 9.0, 9.8)),
    facadeAMat
  );
  bldgDBody.position.y = 4.5;
  bldgDBody.castShadow = true;
  bldgDBody.receiveShadow = true;
  bldgD.add(bldgDBody);

  const noodleTex = createShopfrontTexture(tracker, '麵家', '#00e5ff', '#b96928');
  const noodleMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: noodleTex,
      emissive: new THREE.Color(0xffa855),
      emissiveMap: noodleTex,
      emissiveIntensity: 1.3,
      roughness: 0.24,
    })
  );
  const shopD = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(4.4, 2.0)),
    noodleMat
  );
  shopD.rotation.y = -Math.PI / 2;
  shopD.position.set(-1.16, 1.1, 1.5);
  bldgD.add(shopD);

  addCorrugatedAwning(bldgD, -1.55, 2.25, 1.5, 4.6, 0.85, -Math.PI / 2);

  for (let floor = 0; floor < 3; floor++) {
    const wy = 3.35 + floor * 2.0;
    for (let col = 0; col < 4; col++) {
      const wz = -3.2 + col * 2.1;
      addWindowAssembly(
        bldgD,
        -1.15,
        wy,
        wz,
        -Math.PI / 2,
        floor * 4 + col + 1,
        (floor + col) % 2 === 0,
        col % 2 === 1
      );
    }
  }
  addRooftopDetails(bldgD, 2.3, 9.8, 9.0, false, false);

  // ---------------------------------------------------------------------------
  // 4. Iconic Cantilevered Hong Kong Neon Signs (13 Signs)
  // ---------------------------------------------------------------------------
  const flickerSigns: FlickerSign[] = [];
  const bracketMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x10141c,
      roughness: 0.5,
      metalness: 0.85,
    })
  );

  interface SignPlacement {
    text: string;
    subtext?: string;
    color: string;
    borderColor?: string;
    vertical?: boolean;
    shape?: 'rect' | 'pawn';
    size: [number, number]; // [width, height] in world units
    anchor: [number, number, number]; // mount point on building wall
    offset: [number, number, number]; // cantilevered center offset from anchor
    rotY: number;
    lightColor?: number;
    lightIntensity?: number;
    flicker?: boolean;
  }

  const SIGN_PLACEMENTS: SignPlacement[] = [
    // 1. 大押 classic pawnshop octagonal sign jutting at corner
    {
      text: '大押',
      color: '#ff3344',
      borderColor: '#ffb020',
      vertical: true,
      shape: 'pawn',
      size: [1.55, 2.25],
      anchor: [0.6, 6.2, 0.2],
      offset: [1.35, 0, 1.35],
      rotY: Math.PI / 4,
      lightColor: 0xff4433,
      lightIntensity: 22,
    },
    // 2. 冰室 Cha Chaan Teng marquee over main avenue
    {
      text: '冰室',
      subtext: 'BING SUTT',
      color: '#ff2a85',
      borderColor: '#00e5ff',
      vertical: false,
      size: [2.75, 1.25],
      anchor: [-1.8, 4.1, 0.2],
      offset: [0, 0, 1.55],
      rotY: 0,
      lightColor: 0xff2a85,
      lightIntensity: 26,
    },
    // 3. 霓虹 tall vertical cyan/magenta blade
    {
      text: '霓虹',
      color: '#00e5ff',
      borderColor: '#ff2a85',
      vertical: true,
      size: [1.15, 2.85],
      anchor: [-3.4, 7.6, 0.2],
      offset: [0, 0, 1.75],
      rotY: Math.PI / 2,
      lightColor: 0x00e5ff,
      lightIntensity: 22,
    },
    // 4. 茶餐廳 horizontal upper sign on Bldg A
    {
      text: '茶餐廳',
      color: '#ffb020',
      borderColor: '#22ff88',
      vertical: false,
      size: [2.5, 1.05],
      anchor: [-0.8, 8.8, 0.2],
      offset: [0, 0, 1.35],
      rotY: 0,
    },
    // 5. 香港 horizontal sign over Cross Street
    {
      text: '香港',
      subtext: 'KOWLOON',
      color: '#ff2a85',
      borderColor: '#ffb020',
      vertical: false,
      size: [2.4, 1.1],
      anchor: [0.6, 4.5, -1.6],
      offset: [1.55, 0, 0],
      rotY: 0,
    },
    // 6. 飯店 vertical sign over Cross Street
    {
      text: '飯店',
      color: '#00e5ff',
      borderColor: '#ffb020',
      vertical: true,
      size: [1.05, 2.55],
      anchor: [0.6, 8.2, -3.2],
      offset: [1.45, 0, 0],
      rotY: 0,
    },
    // 7. 酒樓 tall amber/crimson blade on Building B
    {
      text: '酒樓',
      color: '#ffb020',
      borderColor: '#ff3344',
      vertical: true,
      size: [1.25, 3.1],
      anchor: [-6.4, 6.4, 0.2],
      offset: [0, 0, 1.85],
      rotY: Math.PI / 2,
      lightColor: 0xff9d2e,
      lightIntensity: 22,
    },
    // 8. 燒臘 horizontal above shopfront B
    {
      text: '燒臘',
      color: '#ff3344',
      borderColor: '#ffb020',
      vertical: false,
      size: [2.2, 0.95],
      anchor: [-9.2, 3.8, 0.2],
      offset: [0, 0, 1.25],
      rotY: 0,
    },
    // 9. 藥房 jade green vertical sign (flickering!)
    {
      text: '藥房',
      color: '#22ff88',
      borderColor: '#00e5ff',
      vertical: true,
      size: [1.05, 2.4],
      anchor: [-4.9, 4.7, 0.2],
      offset: [0, 0, 1.45],
      rotY: Math.PI / 2,
      lightColor: 0x22ff88,
      lightIntensity: 18,
      flicker: true,
    },
    // 10. 夜市 horizontal neon sign (flickering!)
    {
      text: '夜市',
      subtext: 'NIGHT MKT',
      color: '#ff2a85',
      borderColor: '#ffb020',
      vertical: false,
      size: [2.35, 1.0],
      anchor: [-8.8, 7.2, 0.2],
      offset: [0, 0, 1.4],
      rotY: 0,
      flicker: true,
    },
    // 11. 麻雀 jade/crimson sign jutting west from Building D
    {
      text: '麻雀',
      color: '#22ff88',
      borderColor: '#ff3344',
      vertical: true,
      size: [1.05, 2.45],
      anchor: [9.5, 5.2, -2.0],
      offset: [-1.45, 0, 0],
      rotY: 0,
    },
    // 12. 龍鳳 amber/magenta sign jutting west from Building D
    {
      text: '龍鳳',
      color: '#ffb020',
      borderColor: '#ff2a85',
      vertical: false,
      size: [2.1, 0.95],
      anchor: [9.5, 7.6, -5.2],
      offset: [-1.35, 0, 0],
      rotY: 0,
    },
    // 13. 點心 high skyline sign on Building C
    {
      text: '點心',
      subtext: 'DIM SUM',
      color: '#00e5ff',
      borderColor: '#22ff88',
      vertical: false,
      size: [3.1, 1.25],
      anchor: [-3.2, 11.4, -5.8],
      offset: [0, 0, 1.2],
      rotY: 0,
    },
  ];

  for (let i = 0; i < SIGN_PLACEMENTS.length; i++) {
    const spec = SIGN_PLACEMENTS[i];
    const tex = createNeonSignTexture(tracker, {
      text: spec.text,
      subtext: spec.subtext,
      color: spec.color,
      borderColor: spec.borderColor,
      vertical: spec.vertical,
      shape: spec.shape,
    });

    const faceMat = tracker.mat(
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: tex,
        emissiveIntensity: 1.8,
        roughness: 0.25,
      })
    );

    // Double-sided sign box
    const [sw, sh] = spec.size;
    const signBox = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(sw, sh, 0.14)),
      [bracketMat, bracketMat, bracketMat, bracketMat, faceMat, faceMat]
    );
    const cx = spec.anchor[0] + spec.offset[0];
    const cy = spec.anchor[1] + spec.offset[1];
    const cz = spec.anchor[2] + spec.offset[2];
    signBox.position.set(cx, cy, cz);
    signBox.rotation.y = spec.rotY;
    signBox.castShadow = true;
    scene.add(signBox);

    // Cantilevered steel truss struts connecting anchor to sign center
    const anchorVec = new THREE.Vector3(...spec.anchor);
    const centerVec = new THREE.Vector3(cx, cy, cz);
    const span = anchorVec.distanceTo(centerVec);
    const mid = anchorVec.clone().lerp(centerVec, 0.5);
    const dir = centerVec.clone().sub(anchorVec).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      dir
    );

    for (const dy of [-sh * 0.28, sh * 0.28]) {
      const strut = new THREE.Mesh(
        tracker.geo(new THREE.BoxGeometry(span, 0.05, 0.05)),
        bracketMat
      );
      strut.position.set(mid.x, mid.y + dy, mid.z);
      strut.quaternion.copy(q);
      scene.add(strut);
    }

    let pointLight: THREE.PointLight | undefined;
    if (spec.lightColor !== undefined && spec.lightIntensity !== undefined) {
      pointLight = new THREE.PointLight(
        spec.lightColor,
        spec.lightIntensity,
        15.5,
        1.5
      );
      pointLight.position.set(cx, cy - 0.35, cz);
      scene.add(pointLight);
    }

    if (spec.flicker) {
      flickerSigns.push({
        material: faceMat,
        light: pointLight,
        baseEmissive: 1.8,
        baseLight: spec.lightIntensity ?? 0,
        seed: i * 17.3 + 4.1,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Warm Streetlamps with Volumetric-Style Halo Sprites
  // ---------------------------------------------------------------------------
  const haloTex = createHaloSpriteTexture(tracker);
  const lampPostCoords: Array<[number, number]> = [
    [-9.2, 1.15],
    [-2.8, 1.15],
    [1.65, -5.8],
    [-6.5, 9.85],
    [5.2, 9.85],
  ];

  for (const [lx, lz] of lampPostCoords) {
    const pole = new THREE.Mesh(
      tracker.geo(new THREE.CylinderGeometry(0.045, 0.065, 3.6, 8)),
      darkMetalMat
    );
    pole.position.set(lx, 2.1, lz);
    pole.castShadow = true;
    scene.add(pole);

    const armDir = lz > 5 ? -1 : 1;
    const arm = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(0.06, 0.06, 0.72)),
      darkMetalMat
    );
    arm.position.set(lx, 3.85, lz + armDir * 0.32);
    scene.add(arm);

    const bulbMat = tracker.mat(
      new THREE.MeshBasicMaterial({ color: 0xffe4ad })
    );
    const bulb = new THREE.Mesh(
      tracker.geo(new THREE.SphereGeometry(0.11, 10, 10)),
      bulbMat
    );
    bulb.position.set(lx, 3.78, lz + armDir * 0.62);
    scene.add(bulb);

    const spriteMat = tracker.mat(
      new THREE.SpriteMaterial({
        map: haloTex,
        color: 0xffcc88,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const halo = new THREE.Sprite(spriteMat);
    halo.position.copy(bulb.position);
    halo.scale.set(2.1, 2.1, 1);
    scene.add(halo);
  }

  // Two subtle warm streetlamp PointLights for warm pavement pools
  const streetWarm1 = new THREE.PointLight(0xffb86b, 14, 14, 1.5);
  streetWarm1.position.set(-2.8, 3.6, 1.8);
  scene.add(streetWarm1);

  const streetWarm2 = new THREE.PointLight(0xffb86b, 14, 14, 1.5);
  streetWarm2.position.set(5.2, 3.6, 9.2);
  scene.add(streetWarm2);

  // ---------------------------------------------------------------------------
  // 6. Living Motion: Red HK Taxi, Green Double-Decker Tram, Pedestrians, Rain
  // ---------------------------------------------------------------------------
  // --- Red Hong Kong Taxi (Eastbound along z = 7.3) ---
  const taxiGroup = new THREE.Group();
  taxiGroup.position.set(-8, 0.02, 7.3);
  scene.add(taxiGroup);

  const taxiRedMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.25,
      metalness: 0.35,
    })
  );
  const taxiSilverMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0xd9dee6,
      roughness: 0.22,
      metalness: 0.45,
    })
  );
  const carGlassMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x101824,
      roughness: 0.12,
      metalness: 0.7,
    })
  );
  const wheelMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x12141a,
      roughness: 0.85,
    })
  );

  const taxiChassis = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(1.9, 0.44, 0.88)),
    taxiRedMat
  );
  taxiChassis.position.y = 0.36;
  taxiChassis.castShadow = true;
  taxiGroup.add(taxiChassis);

  const taxiCabin = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(1.05, 0.36, 0.8)),
    taxiSilverMat
  );
  taxiCabin.position.set(-0.08, 0.75, 0);
  taxiCabin.castShadow = true;
  taxiGroup.add(taxiCabin);

  const taxiWindows = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(0.96, 0.26, 0.82)),
    carGlassMat
  );
  taxiWindows.position.set(-0.08, 0.74, 0);
  taxiGroup.add(taxiWindows);

  const taxiRoofMat = tracker.mat(
    new THREE.MeshBasicMaterial({ map: createTaxiRoofTexture(tracker) })
  );
  const taxiRoofSign = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(0.24, 0.14, 0.42)),
    taxiRoofMat
  );
  taxiRoofSign.position.set(0.05, 0.99, 0);
  taxiGroup.add(taxiRoofSign);

  const wheelGeo = tracker.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 12));
  for (const [wx, wz] of [
    [-0.58, -0.42],
    [-0.58, 0.42],
    [0.58, -0.42],
    [0.58, 0.42],
  ]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.18, wz);
    taxiGroup.add(w);
  }

  const headLightMat = tracker.mat(
    new THREE.MeshBasicMaterial({ color: 0xfff3d1 })
  );
  const tailLightMat = tracker.mat(
    new THREE.MeshBasicMaterial({ color: 0xff2233 })
  );
  for (const lz of [-0.28, 0.28]) {
    const hl = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(0.06, 0.11, 0.16)),
      headLightMat
    );
    hl.position.set(0.95, 0.38, lz);
    taxiGroup.add(hl);

    const tl = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(0.06, 0.1, 0.18)),
      tailLightMat
    );
    tl.position.set(-0.95, 0.4, lz);
    taxiGroup.add(tl);
  }

  const taxiHeadLight = new THREE.PointLight(0xffe8b0, 12, 11, 1.5);
  taxiHeadLight.position.set(1.45, 0.45, 0);
  taxiGroup.add(taxiHeadLight);

  // --- Classic Green Double-Decker Tram (Westbound along z = 3.6) ---
  const tramGroup = new THREE.Group();
  tramGroup.position.set(7.5, 0.02, 3.6);
  scene.add(tramGroup);

  const tramWinTex = createTramWindowTexture(tracker);
  const tramSideMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: tramWinTex,
      emissive: new THREE.Color(0xffc970),
      emissiveMap: tramWinTex,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    })
  );
  const tramBodyMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x134a31,
      roughness: 0.35,
      metalness: 0.25,
    })
  );
  const tramRoofMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0xd9d2bc,
      roughness: 0.55,
    })
  );

  const tramBody = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(3.6, 2.35, 1.06)),
    [tramBodyMat, tramBodyMat, tramRoofMat, darkMetalMat, tramSideMat, tramSideMat]
  );
  tramBody.position.y = 1.32;
  tramBody.castShadow = true;
  tramGroup.add(tramBody);

  // Pantograph on tram roof
  const panto = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(0.65, 0.42, 0.52)),
    darkMetalMat
  );
  panto.position.set(0, 2.7, 0);
  tramGroup.add(panto);

  // Front headlamp (facing -X)
  const tramLamp = new THREE.Mesh(
    tracker.geo(new THREE.SphereGeometry(0.11, 8, 8)),
    headLightMat
  );
  tramLamp.position.set(-1.82, 0.72, 0);
  tramGroup.add(tramLamp);

  const tramPointLight = new THREE.PointLight(0xffe5a8, 12, 11, 1.5);
  tramPointLight.position.set(-2.3, 0.9, 0);
  tramGroup.add(tramPointLight);

  // --- Silhouetted Pedestrians with Bright Umbrellas ---
  const pedCoatMat = tracker.mat(
    new THREE.MeshStandardMaterial({ color: 0x121620, roughness: 0.85 })
  );
  const umbrellaSpecs: Array<{
    color: number;
    axis: 'x' | 'z';
    fixedCoord: number;
    min: number;
    max: number;
    speed: number;
    start: number;
    dir: 1 | -1;
  }> = [
    {
      color: 0xfacc15, // bright yellow umbrella
      axis: 'x',
      fixedCoord: 0.85,
      min: -10.5,
      max: 1.2,
      speed: 0.85,
      start: -5.5,
      dir: 1,
    },
    {
      color: 0xf43f5e, // coral red umbrella
      axis: 'z',
      fixedCoord: 1.25,
      min: -10.2,
      max: 0.9,
      speed: 0.72,
      start: -2.0,
      dir: -1,
    },
    {
      color: 0x22d3ee, // electric cyan umbrella
      axis: 'x',
      fixedCoord: 10.45,
      min: -10.0,
      max: 10.0,
      speed: 0.95,
      start: 4.5,
      dir: -1,
    },
  ];

  const pedestrians: PedestrianAgent[] = [];
  const umbrellaGeo = tracker.geo(
    new THREE.ConeGeometry(0.32, 0.16, 10, 1, false)
  );
  const bodyGeo = tracker.geo(new THREE.CylinderGeometry(0.07, 0.1, 0.48, 8));
  const headGeo = tracker.geo(new THREE.SphereGeometry(0.075, 8, 8));

  for (let i = 0; i < umbrellaSpecs.length; i++) {
    const u = umbrellaSpecs[i];
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, pedCoatMat);
    body.position.y = 0.24;
    body.castShadow = true;
    const head = new THREE.Mesh(headGeo, pedCoatMat);
    head.position.y = 0.54;

    const uMat = tracker.mat(
      new THREE.MeshStandardMaterial({
        color: u.color,
        emissive: new THREE.Color(u.color),
        emissiveIntensity: 0.25,
        roughness: 0.35,
      })
    );
    const umbrella = new THREE.Mesh(umbrellaGeo, uMat);
    umbrella.position.y = 0.72;
    umbrella.castShadow = true;

    g.add(body, head, umbrella);
    if (u.axis === 'x') {
      g.position.set(u.start, 0.3, u.fixedCoord);
    } else {
      g.position.set(u.fixedCoord, 0.3, u.start);
    }
    scene.add(g);

    pedestrians.push({
      group: g,
      axis: u.axis,
      min: u.min,
      max: u.max,
      speed: u.speed,
      dir: u.dir,
      pos: u.start,
      phase: i * 2.1,
    });
  }

  // --- Falling Diagonal Rain Streaks Pool ---
  const RAIN_COUNT = 760;
  const rainPositions = new Float32Array(RAIN_COUNT * 6);
  const rainSeeds = new Float32Array(RAIN_COUNT);
  for (let i = 0; i < RAIN_COUNT; i++) {
    const rx = (Math.random() - 0.5) * 24;
    const ry = Math.random() * 17;
    const rz = (Math.random() - 0.5) * 24;
    rainPositions[i * 6 + 0] = rx;
    rainPositions[i * 6 + 1] = ry;
    rainPositions[i * 6 + 2] = rz;
    rainPositions[i * 6 + 3] = rx - 0.14;
    rainPositions[i * 6 + 4] = ry + 0.65;
    rainPositions[i * 6 + 5] = rz - 0.06;
    rainSeeds[i] = 0.8 + Math.random() * 0.6;
  }

  const rainGeo = tracker.geo(new THREE.BufferGeometry());
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = tracker.mat(
    new THREE.LineBasicMaterial({
      color: 0xaad4ff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
  );
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.frustumCulled = false;
  scene.add(rainLines);

  // ---------------------------------------------------------------------------
  // 7. Animation State, Presets & Cleanup
  // ---------------------------------------------------------------------------
  let activeCameraPreset: CameraPresetId = 'isometric';
  let activeLookPreset: LookPresetId = 'cinema';
  let rainEnabled = true;
  let rainIntensity = LOOK_PRESETS.cinema.rainIntensity;
  let isTransitioningCamera = false;
  let userDragging = false;
  let orbitAngle = Math.atan2(
    CAMERA_PRESETS.cinematic.position.z,
    CAMERA_PRESETS.cinematic.position.x
  );

  const desiredCamPos = CAMERA_PRESETS.isometric.position.clone();
  const desiredTarget = CAMERA_PRESETS.isometric.target.clone();

  const onControlStart = (): void => {
    userDragging = true;
    isTransitioningCamera = false;
  };
  const onControlEnd = (): void => {
    userDragging = false;
    if (activeCameraPreset === 'cinematic') {
      orbitAngle = Math.atan2(
        camera.position.z - controls.target.z,
        camera.position.x - controls.target.x
      );
    }
  };
  controls.addEventListener('start', onControlStart);
  controls.addEventListener('end', onControlEnd);

  const handleResize = (): void => {
    const { w, h } = getViewportSize();
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h);
    postFx.resize(w, h, pr);
  };

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  }
  window.addEventListener('resize', handleResize);
  window.requestAnimationFrame(() => {
    if (!disposed) {
      handleResize();
    }
  });

  const clock = new THREE.Clock();
  let rafId = 0;
  let disposed = false;

  const animate = (): void => {
    if (disposed) return;
    rafId = window.requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    // Smooth camera preset interpolation
    if (isTransitioningCamera) {
      const alpha = 1 - Math.exp(-5.0 * dt);
      camera.position.lerp(desiredCamPos, alpha);
      controls.target.lerp(desiredTarget, alpha);
      if (
        camera.position.distanceTo(desiredCamPos) < 0.06 &&
        controls.target.distanceTo(desiredTarget) < 0.04
      ) {
        isTransitioningCamera = false;
      }
    } else if (activeCameraPreset === 'cinematic' && !userDragging) {
      orbitAngle += dt * 0.11;
      const radius = 21.5;
      const targetPos = new THREE.Vector3(
        controls.target.x + Math.cos(orbitAngle) * radius,
        11.5,
        controls.target.z + Math.sin(orbitAngle) * radius
      );
      camera.position.lerp(targetPos, 1 - Math.exp(-2.5 * dt));
    }

    controls.update();

    // Update Red Taxi (eastbound z = 7.3)
    taxiGroup.position.x += dt * 3.8;
    if (taxiGroup.position.x > 12.6) {
      taxiGroup.position.x = -12.6;
    }
    const taxiEdgeScale = Math.min(
      1,
      Math.max(0.01, (12.4 - Math.abs(taxiGroup.position.x)) / 1.2)
    );
    taxiGroup.scale.setScalar(taxiEdgeScale);

    // Update Green Double-Decker Tram (westbound z = 3.6)
    tramGroup.position.x -= dt * 2.5;
    if (tramGroup.position.x < -12.8) {
      tramGroup.position.x = 12.8;
    }
    const tramEdgeScale = Math.min(
      1,
      Math.max(0.01, (12.5 - Math.abs(tramGroup.position.x)) / 1.4)
    );
    tramGroup.scale.setScalar(tramEdgeScale);

    // Update pedestrians
    for (const ped of pedestrians) {
      ped.pos += ped.dir * ped.speed * dt;
      if (ped.pos > ped.max) {
        ped.pos = ped.max;
        ped.dir = -1;
      } else if (ped.pos < ped.min) {
        ped.pos = ped.min;
        ped.dir = 1;
      }
      const bob = Math.abs(Math.sin(elapsed * 6.5 + ped.phase)) * 0.04;
      if (ped.axis === 'x') {
        ped.group.position.x = ped.pos;
      } else {
        ped.group.position.z = ped.pos;
      }
      ped.group.position.y = 0.3 + bob;
    }

    // Update neon flicker (subtle electrical buzz)
    for (const f of flickerSigns) {
      const wave =
        Math.sin(elapsed * 19.0 + f.seed) *
        Math.sin(elapsed * 7.3 + f.seed * 0.7);
      const buzz = wave > 0.86 ? 0.38 : wave > 0.74 ? 0.72 : 1.0;
      f.material.emissiveIntensity = f.baseEmissive * buzz;
      if (f.light) {
        f.light.intensity = f.baseLight * buzz;
      }
    }

    // Update puddle ripples & falling rain streaks
    rainLines.visible = rainEnabled;
    if (rainEnabled) {
      const fallSpeed = 17.5 * rainIntensity;
      const slant = -0.22 * rainIntensity;
      const streakLen = 0.62 * (0.85 + 0.3 * rainIntensity);
      const activeCount = Math.min(
        RAIN_COUNT,
        Math.floor(RAIN_COUNT * (rainIntensity > 1.2 ? 1.0 : 0.62))
      );
      rainGeo.setDrawRange(0, activeCount * 2);
      rainMat.opacity = Math.min(0.55, 0.34 * rainIntensity);

      const posAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < activeCount; i++) {
        const s = rainSeeds[i];
        let x0 = rainPositions[i * 6 + 0] + slant * dt * fallSpeed * 0.16;
        let y0 = rainPositions[i * 6 + 1] - dt * fallSpeed * s;
        let z0 = rainPositions[i * 6 + 2] + slant * dt * fallSpeed * 0.06;

        if (y0 < 0.05) {
          y0 = 16.5 + Math.random() * 1.5;
          x0 = (Math.random() - 0.5) * 24;
          z0 = (Math.random() - 0.5) * 24;
        }
        rainPositions[i * 6 + 0] = x0;
        rainPositions[i * 6 + 1] = y0;
        rainPositions[i * 6 + 2] = z0;
        rainPositions[i * 6 + 3] = x0 - slant * streakLen * 1.6;
        rainPositions[i * 6 + 4] = y0 + streakLen;
        rainPositions[i * 6 + 5] = z0 - slant * streakLen * 0.6;
      }
      posAttr.needsUpdate = true;
    }

    for (const r of ripples) {
      r.mesh.visible = rainEnabled;
      if (!rainEnabled) continue;
      r.phase = (r.phase + dt * r.speed * Math.min(1.5, rainIntensity)) % 1;
      const s = 0.5 + r.phase * r.maxScale;
      r.mesh.scale.setScalar(s);
      r.material.opacity = (1 - r.phase) * 0.42;
    }

    postFx.render(renderer, scene, camera, elapsed);
  };

  animate();

  return {
    setCameraPreset(preset: CameraPresetId): void {
      activeCameraPreset = preset;
      const cfg = CAMERA_PRESETS[preset];
      desiredCamPos.copy(cfg.position);
      desiredTarget.copy(cfg.target);
      isTransitioningCamera = true;
      if (preset === 'cinematic') {
        orbitAngle = Math.atan2(
          cfg.position.z - cfg.target.z,
          cfg.position.x - cfg.target.x
        );
      }
    },

    setLookPreset(preset: LookPresetId): void {
      activeLookPreset = preset;
      const cfg = postFx.setLookPreset(preset);
      fog.density = cfg.fogDensity;
      rainIntensity = cfg.rainIntensity;
    },

    setRainEnabled(enabled: boolean): void {
      rainEnabled = enabled;
      const cfg = LOOK_PRESETS[activeLookPreset];
      rainIntensity = cfg.rainIntensity;
    },

    dispose(): void {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      resizeObserver?.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.dispose();
      postFx.dispose();
      tracker.disposeAll();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
