export type SceneId = 'sphere' | 'skyline' | 'grid';

export interface SceneOption {
  id: SceneId;
  label: string;
}

export const PROCEDURAL_SCENES: readonly SceneOption[] = [
  { id: 'sphere', label: '01 Lit Sphere' },
  { id: 'skyline', label: '02 Neon Skyline' },
  { id: 'grid', label: '03 Editorial Grid' },
];

/**
 * Generates a high-contrast procedural source scene onto an HTMLCanvasElement
 * so the dither engine produces crisp halftone shading immediately on page load.
 */
export function renderProceduralScene(
  sceneId: SceneId,
  width = 640,
  height = 420
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (sceneId === 'sphere') {
    renderLitSphereScene(ctx, width, height);
  } else if (sceneId === 'skyline') {
    renderNeonSkylineScene(ctx, width, height);
  } else {
    renderEditorialGridScene(ctx, width, height);
  }

  return canvas;
}

function renderLitSphereScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const horizonY = Math.floor(height * 0.56);
  const sphereCx = width * 0.5;
  const sphereCy = height * 0.44;
  const radius = Math.min(width, height) * 0.27;
  const r2 = radius * radius;

  // Light direction (top-left-front)
  const lx = -0.58;
  const ly = -0.62;
  const lz = 0.53;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let val = 0;

      // Check sphere intersection
      const dx = x - sphereCx;
      const dy = y - sphereCy;
      const dist2 = dx * dx + dy * dy;

      if (dist2 <= r2) {
        const dz = Math.sqrt(Math.max(0, r2 - dist2));
        const nx = dx / radius;
        const ny = dy / radius;
        const nz = dz / radius;

        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        // Blinn-Phong specular highlight
        const hx = lx;
        const hy = ly;
        const hz = lz + 1;
        const hLen = Math.hypot(hx, hy, hz);
        const specDot = Math.max(
          0,
          (nx * hx + ny * hy + nz * hz) / hLen
        );
        const spec = Math.pow(specDot, 26) * 0.85;
        // Subtle rim light on bottom-right edge
        const rim = Math.pow(1 - nz, 2.2) * 0.28;
        const ambient = 0.08;

        val = Math.min(1, ambient + diff * 0.82 + spec + rim) * 255;
      } else if (y < horizonY) {
        // Smooth studio sky ramp
        const t = y / horizonY;
        val = (0.14 + t * 0.72) * 255;
      } else {
        // Perspective checkerboard & wireframe grid floor
        const py = (y - horizonY + 1) / (height - horizonY);
        const depth = 1 / (py + 0.06);
        const worldX = ((x - width * 0.5) / width) * depth * 3.8;
        const worldZ = depth * 1.4;

        const cellX = Math.floor(worldX);
        const cellZ = Math.floor(worldZ);
        const isChecker = ((cellX + cellZ) & 1) === 0;

        // Grid line detection
        const fx = Math.abs(worldX - Math.round(worldX));
        const fz = Math.abs(worldZ - Math.round(worldZ));
        const isLine = fx < 0.045 || fz < 0.045;

        let floorVal = isChecker ? 0.74 : 0.42;
        if (isLine) floorVal = 0.92;

        // Distance fog near horizon
        const fog = Math.max(0, 1 - py * 1.15);
        floorVal = floorVal * (1 - fog * 0.5) + 0.78 * (fog * 0.5);

        // Soft cast shadow under sphere
        const sdx = (x - (sphereCx + radius * 0.42)) / (radius * 1.25);
        const sdy = (y - (horizonY + (height - horizonY) * 0.24)) / (radius * 0.34);
        const sDist = sdx * sdx + sdy * sdy;
        if (sDist < 1) {
          const shadow = 1 - (1 - sDist) * 0.72;
          floorVal *= shadow;
        }

        val = floorVal * 255;
      }

      const b = Math.max(0, Math.min(255, Math.round(val)));
      data[idx] = b;
      data[idx + 1] = Math.round(b * 0.98);
      data[idx + 2] = Math.round(b * 0.94);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function renderNeonSkylineScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  // Dusk sky gradient (inside procedural source canvas only)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.72);
  skyGrad.addColorStop(0, '#0D1117');
  skyGrad.addColorStop(0.55, '#4A1D4D');
  skyGrad.addColorStop(1, '#E07A38');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Retro segmented sun disc
  const sunX = width * 0.5;
  const sunY = height * 0.44;
  const sunR = Math.min(width, height) * 0.22;
  const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunGrad.addColorStop(0, '#FFF5CC');
  sunGrad.addColorStop(0.55, '#FF9E3D');
  sunGrad.addColorStop(1, '#C82B5A');

  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sunGrad;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

  // Horizontal scan cuts on lower sun
  ctx.fillStyle = '#4A1D4D';
  for (let i = 0; i < 6; i++) {
    const sy = sunY + sunR * 0.1 + i * (sunR * 0.14);
    const sh = 2 + i * 1.8;
    ctx.fillRect(sunX - sunR, sy, sunR * 2, sh);
  }
  ctx.restore();

  // Stars
  ctx.fillStyle = '#F7F5F0';
  for (let i = 0; i < 42; i++) {
    const sx = ((i * 97 + 31) % 100) * 0.01 * width;
    const sy = ((i * 53 + 17) % 38) * 0.01 * height;
    const sz = i % 5 === 0 ? 2 : 1;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), sz, sz);
  }

  // City buildings silhouette + lit windows
  const horizonY = Math.floor(height * 0.72);
  const towers = [
    { x: 0.02, w: 0.09, h: 0.34 },
    { x: 0.1, w: 0.08, h: 0.48 },
    { x: 0.17, w: 0.11, h: 0.28 },
    { x: 0.27, w: 0.07, h: 0.56 },
    { x: 0.34, w: 0.09, h: 0.39 },
    { x: 0.57, w: 0.08, h: 0.44 },
    { x: 0.65, w: 0.1, h: 0.54 },
    { x: 0.75, w: 0.08, h: 0.32 },
    { x: 0.83, w: 0.09, h: 0.49 },
    { x: 0.91, w: 0.08, h: 0.35 },
  ];

  towers.forEach((t, ti) => {
    const bx = Math.floor(t.x * width);
    const bw = Math.floor(t.w * width);
    const bh = Math.floor(t.h * height);
    const by = horizonY - bh;

    ctx.fillStyle = '#141218';
    ctx.fillRect(bx, by, bw, bh);

    // Lit windows grid
    const cols = Math.max(2, Math.floor(bw / 11));
    const rows = Math.max(4, Math.floor(bh / 13));
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r * 7 + c * 13 + ti * 5) % 4 !== 0) {
          ctx.fillStyle = (r + c) % 3 === 0 ? '#FFE28A' : '#FFAA5E';
          ctx.fillRect(bx + 5 + c * 10, by + 6 + r * 12, 5, 6);
        }
      }
    }
  });

  // Water & rippled reflection below horizon
  const waterGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  waterGrad.addColorStop(0, '#24142E');
  waterGrad.addColorStop(1, '#09090D');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  for (let y = horizonY + 4; y < height; y += 5) {
    const t = (y - horizonY) / (height - horizonY);
    const span = sunR * (1.1 - t * 0.45);
    const jitter = Math.sin(y * 0.6) * 8;
    ctx.fillStyle = t < 0.45 ? '#F59E42' : '#A83264';
    ctx.fillRect(sunX - span * 0.5 + jitter, y, span, 2);
  }
}

function renderEditorialGridScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = '#F2EFE9';
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural grid
  ctx.strokeStyle = '#CFC9BC';
  ctx.lineWidth = 1;
  for (let x = 20; x < width; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 20; y < height; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Outer editorial frame
  ctx.strokeStyle = '#1C1917';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // Left: Smooth gradient calibration bar + 10-step wedge
  const barX = 44;
  const barY = 48;
  const barW = width - 88;
  const smoothGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  smoothGrad.addColorStop(0, '#0E0D0C');
  smoothGrad.addColorStop(1, '#FAF8F5');
  ctx.fillStyle = smoothGrad;
  ctx.fillRect(barX, barY, barW, 46);
  ctx.strokeRect(barX, barY, barW, 46);

  const steps = 10;
  const stepW = barW / steps;
  for (let i = 0; i < steps; i++) {
    const shade = Math.round((i / (steps - 1)) * 255);
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    ctx.fillRect(barX + i * stepW, barY + 54, stepW, 24);
  }

  // Center-left: Radial shaded sphere specimen
  const cx = width * 0.31;
  const cy = height * 0.64;
  const r = Math.min(width, height) * 0.19;
  const sphereGrad = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.35,
    r * 0.08,
    cx,
    cy,
    r
  );
  sphereGrad.addColorStop(0, '#FFFFFF');
  sphereGrad.addColorStop(0.45, '#8A847C');
  sphereGrad.addColorStop(1, '#12100E');
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Right: Shaded cylinder + diagonal halftone test bars
  const cylX = width * 0.56;
  const cylY = height * 0.45;
  const cylW = width * 0.31;
  const cylH = height * 0.37;
  const cylGrad = ctx.createLinearGradient(cylX, 0, cylX + cylW, 0);
  cylGrad.addColorStop(0, '#181614');
  cylGrad.addColorStop(0.28, '#F5F2EB');
  cylGrad.addColorStop(0.62, '#6E6962');
  cylGrad.addColorStop(1, '#12100E');
  ctx.fillStyle = cylGrad;
  ctx.fillRect(cylX, cylY, cylW, cylH);
  ctx.strokeStyle = '#1C1917';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cylX, cylY, cylW, cylH);

  // Crisp specimen caption bars
  ctx.fillStyle = '#1C1917';
  ctx.font = '600 13px monospace';
  ctx.fillText('CALIBRATION SHEET // 03', 44, height - 38);
  ctx.fillText('TONAL RAMP + BAYER TEST', width - 244, height - 38);
}
