import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type PoolToolMode = 'ripple' | 'blossom' | 'boat' | 'ring';

export interface SunlitPoolHandle {
  setToolMode(mode: PoolToolMode): void;
  setBreezeEnabled(enabled: boolean): void;
  clearObjects(): void;
  dispose(): void;
}

export interface SunlitPoolCallbacks {
  onSplash?: (intensity: number) => void;
  onWake?: () => void;
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

function createLimestoneDeckTexture(tracker: ResourceTracker): THREE.CanvasTexture {
  const size = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = '#ede2cf';
  ctx.fillRect(0, 0, size, size);

  const tiles = 8;
  const step = size / tiles;
  const tones = ['#f4ecde', '#f1e7d6', '#efe4d0', '#f6efe2'];

  for (let row = 0; row < tiles; row++) {
    for (let col = 0; col < tiles; col++) {
      const idx = (row * 5 + col * 3) % tones.length;
      const x0 = col * step;
      const y0 = row * step;
      ctx.fillStyle = tones[idx];
      ctx.fillRect(x0 + 3, y0 + 3, step - 6, step - 6);

      // Subtle bevel highlight
      ctx.fillStyle = 'rgba(255, 252, 245, 0.55)';
      ctx.fillRect(x0 + 3, y0 + 3, step - 6, 3);
      ctx.fillRect(x0 + 3, y0 + 3, 3, step - 6);

      // Subtle travertine mineral specks
      for (let s = 0; s < 55; s++) {
        const sx = x0 + 6 + Math.random() * (step - 12);
        const sy = y0 + 6 + Math.random() * (step - 12);
        const w = 1 + Math.random() * 4;
        ctx.fillStyle =
          s % 2 === 0 ? 'rgba(182, 165, 138, 0.16)' : 'rgba(255, 255, 255, 0.22)';
        ctx.fillRect(sx, sy, w, 1.5);
      }

      // Warm sand grout lines
      ctx.strokeStyle = '#d8cbb5';
      ctx.lineWidth = 4;
      ctx.strokeRect(x0 + 1, y0 + 1, step - 2, step - 2);
    }
  }

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2.2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCheckeredCopingTexture(
  tracker: ResourceTracker,
  repeatX: number,
  repeatY: number
): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const cells = 4;
  const step = size / cells;

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const dark = (x + y) % 2 === 0;
      ctx.fillStyle = dark ? '#1f242b' : '#faf8f4';
      ctx.fillRect(x * step, y * step, step, step);
      ctx.strokeStyle = 'rgba(170, 164, 154, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * step + 1, y * step + 1, step - 2, step - 2);
    }
  }

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPoolMosaicTexture(tracker: ResourceTracker): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = '#d6f4fa';
  ctx.fillRect(0, 0, size, size);

  const cells = 16;
  const step = size / cells;
  const palette = ['#6acae6', '#58bcdb', '#7ad2ec', '#64c4e2', '#82d6ee'];

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const shade = palette[(x * 7 + y * 13) % palette.length];
      ctx.fillStyle = shade;
      ctx.fillRect(x * step + 1.5, y * step + 1.5, step - 3, step - 3);
      // Subtle glossy highlight corner
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(x * step + 2, y * step + 2, step - 6, 3);
    }
  }

  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createTowelTexture(tracker: ResourceTracker): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#faf5eb';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#ea6b5b';
  for (let y = 0; y < 256; y += 36) {
    ctx.fillRect(0, y, 256, 18);
  }
  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRingTexture(
  tracker: ResourceTracker,
  stripeHex: string
): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 128);
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = stripeHex;
  for (let x = 0; x < 256; x += 32) {
    ctx.fillRect(x, 0, 16, 128);
  }
  const tex = tracker.tex(new THREE.CanvasTexture(canvas));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const CAUSTIC_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CAUSTIC_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTileMap;
  uniform sampler2D uWaveMap;
  uniform vec2 uPoolSize;
  uniform float uPoolDepth;
  uniform float uTime;
  uniform vec3 uSunDir;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  vec2 spHash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  float spCausticCell(vec2 uv, float t) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float minDist = 1.0;
    float secondDist = 1.0;

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 pt = spHash2(i + neighbor);
        pt = 0.5 + 0.42 * sin(t + 6.2831 * pt);
        vec2 diff = neighbor + pt - f;
        float d = length(diff);
        if (d < minDist) {
          secondDist = minDist;
          minDist = d;
        } else if (d < secondDist) {
          secondDist = d;
        }
      }
    }
    return 1.0 - smoothstep(0.0, 0.18, secondDist - minDist);
  }

  float spCaustics(vec2 worldXZ, vec2 waveGrad, float t) {
    vec2 warped = worldXZ * 0.88 + waveGrad * 0.72;
    float c1 = spCausticCell(warped + vec2(t * 0.07, -t * 0.05), t * 1.15);
    float c2 = spCausticCell(warped * 1.38 - vec2(t * 0.06, t * 0.08), -t * 0.95);
    return pow(clamp(c1 * 0.65 + c2 * 0.65, 0.0, 1.0), 1.45);
  }

  // Soft swaying palm frond shadow projection matching the sunlit courtyard angle
  float spPalmShadow(vec2 xz, float t) {
    vec2 local = xz - vec2(3.4, 2.0);
    float sway = sin(t * 0.85) * 0.12;
    float c = cos(2.45 + sway);
    float s = sin(2.45 + sway);
    vec2 p = vec2(c * local.x - s * local.y, s * local.x + c * local.y);

    float inSpan = smoothstep(-0.3, 0.5, p.x) * (1.0 - smoothstep(3.2, 4.6, p.x));
    float stem = (1.0 - smoothstep(0.05, 0.24, abs(p.y))) * inSpan;
    float ribFreq = sin(p.x * 5.6 - abs(p.y) * 1.8);
    float frond = (1.0 - smoothstep(0.25, 1.95, abs(p.y))) *
                  smoothstep(-0.2, 0.35, ribFreq) *
                  inSpan;
    return clamp(max(stem * 0.36, frond * 0.42), 0.0, 0.4);
  }

  void main() {
    // World-space mosaic tile mapping across floor and walls
    vec2 tileUv;
    if (abs(vWorldNormal.y) > 0.7) {
      tileUv = vWorldPos.xz * 0.42;
    } else if (abs(vWorldNormal.x) > 0.7) {
      tileUv = vec2(vWorldPos.z, vWorldPos.y) * 0.42;
    } else {
      tileUv = vec2(vWorldPos.x, vWorldPos.y) * 0.42;
    }
    vec3 tileCol = texture2D(uTileMap, tileUv).rgb;

    // Project along sun ray back up to water surface y = 0 to sample wave heightfield
    float depthBelow = max(0.0, -vWorldPos.y);
    vec2 surfaceXZ = vWorldPos.xz + (uSunDir.xz / max(0.25, uSunDir.y)) * depthBelow;
    vec2 waveUv = clamp(surfaceXZ / uPoolSize + 0.5, 0.01, 0.99);
    vec4 wave = texture2D(uWaveMap, waveUv);
    vec2 waveGrad = (wave.gb - 0.5) * 2.2;
    float waveFocus = wave.a;

    float caustic = spCaustics(surfaceXZ, waveGrad, uTime);
    float rippleBoost = clamp(waveFocus * 1.45, 0.0, 1.35);
    float sunFacing = max(0.28, dot(normalize(vWorldNormal), normalize(uSunDir)));

    // Palm canopy shadow softly modulates direct sun & caustics
    float palmMask = 1.0 - spPalmShadow(surfaceXZ, uTime);

    // Beer-Lambert shallow turquoise tint + subtle corner AO
    float depthFrac = clamp(depthBelow / max(0.1, uPoolDepth), 0.0, 1.0);
    vec3 waterAbsorb = mix(vec3(0.95, 0.99, 1.0), vec3(0.56, 0.86, 0.94), depthFrac);
    float wallEdgeAO = 0.84 + 0.16 * smoothstep(0.0, 0.55, min(
      min(uPoolSize.x * 0.5 - abs(vWorldPos.x), uPoolSize.y * 0.5 - abs(vWorldPos.z)),
      depthBelow + 0.25
    ));

    vec3 baseLit = tileCol * waterAbsorb * (0.64 + 0.44 * sunFacing * palmMask) * wallEdgeAO;
    vec3 causticGlow = vec3(0.88, 0.98, 1.0) * (caustic * 0.52 + rippleBoost * 0.34) * sunFacing * palmMask;

    gl_FragColor = vec4(baseLit + causticGlow, 1.0);
  }
`;

const WATER_VERTEX_SHADER = /* glsl */ `
  uniform sampler2D uWaveMap;

  varying vec2 vWaveUv;
  varying vec3 vWorldPos;

  void main() {
    vec2 wUv = uv;
    vWaveUv = wUv;
    float h = (texture2D(uWaveMap, wUv).r - 0.5) * 2.0 * 0.36;
    vec3 displaced = position + vec3(0.0, 0.0, h);
    vec4 wp = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uWaveMap;
  uniform vec3 uSunDir;
  uniform float uTime;

  varying vec2 vWaveUv;
  varying vec3 vWorldPos;

  float spFresnel(vec3 V, vec3 N) {
    float cosTheta = clamp(dot(V, N), 0.0, 1.0);
    return 0.03 + 0.97 * pow(1.0 - cosTheta, 4.2);
  }

  void main() {
    vec4 wave = texture2D(uWaveMap, vWaveUv);
    vec2 grad = (wave.gb - 0.5) * 2.4;

    // Gentle micro-shimmer normal on top of wave-equation slope
    float microX = sin(vWorldPos.x * 4.5 + uTime * 2.1) * cos(vWorldPos.z * 3.8 - uTime * 1.6) * 0.018;
    float microZ = cos(vWorldPos.x * 3.9 - uTime * 1.8) * sin(vWorldPos.z * 4.7 + uTime * 2.0) * 0.018;

    vec3 N = normalize(vec3(-(grad.x + microX), 1.0, -(grad.y + microZ)));
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(L + V);

    float fresnel = spFresnel(V, N);
    float spec = pow(max(dot(N, H), 0.0), 170.0);
    float broadSpec = pow(max(dot(N, H), 0.0), 28.0);

    vec3 shallowTint = vec3(0.24, 0.78, 0.86);
    vec3 skyReflect = vec3(0.92, 0.96, 0.99);
    vec3 sunGlint = vec3(1.0, 0.98, 0.91) * (spec * 1.65 + broadSpec * 0.16);
    float crestFoam = smoothstep(0.55, 0.95, wave.a) * 0.14;

    vec3 col = mix(shallowTint, skyReflect, fresnel * 0.72) + sunGlint + vec3(crestFoam);
    float alpha = clamp(0.22 + fresnel * 0.36 + spec * 0.6 + crestFoam, 0.2, 0.82);

    gl_FragColor = vec4(col, alpha);
  }
`;

interface FloatingBody {
  mesh: THREE.Group;
  x: number;
  z: number;
  vx: number;
  vz: number;
  y: number;
  vy: number;
  radius: number;
  draft: number;
  yaw: number;
  angVel: number;
  pitch: number;
  roll: number;
}

function createBlossomMesh(
  tracker: ResourceTracker,
  variant: number
): THREE.Group {
  const group = new THREE.Group();

  const palettes = [
    { petal: 0xff6b6b, center: 0xffd166 }, // coral hibiscus
    { petal: 0xfff8eb, center: 0xffb703 }, // ivory frangipani
    { petal: 0xff924c, center: 0xffe066 }, // warm tangerine
  ];
  const pal = palettes[variant % palettes.length];

  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(0.11, 0.08, 0.16, 0.25, 0, 0.36);
  petalShape.bezierCurveTo(-0.16, 0.25, -0.11, 0.08, 0, 0);

  const petalGeo = tracker.geo(
    new THREE.ExtrudeGeometry(petalShape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    })
  );
  const petalMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: pal.petal,
      roughness: 0.42,
      metalness: 0.02,
    })
  );

  const petalCount = variant % 2 === 0 ? 5 : 6;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.rotation.y = angle;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.rotation.x = -Math.PI * 0.42;
    petal.position.set(0, 0.02, 0.02);
    petal.castShadow = true;
    petal.receiveShadow = true;
    holder.add(petal);
    group.add(holder);
  }

  const centerMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: pal.center,
      roughness: 0.35,
    })
  );
  const center = new THREE.Mesh(
    tracker.geo(new THREE.CylinderGeometry(0.06, 0.075, 0.045, 10)),
    centerMat
  );
  center.position.y = 0.045;
  center.castShadow = true;
  group.add(center);

  return group;
}

function createPaperBoatMesh(tracker: ResourceTracker): THREE.Group {
  const group = new THREE.Group();

  // Faceted folded origami boat vertices
  const hullGeo = tracker.geo(new THREE.BufferGeometry());
  const vertices = new Float32Array([
    // Left hull side
    -0.52, 0.14, 0.0,   -0.28, -0.04, 0.18,   0.28, -0.04, 0.18,
    -0.52, 0.14, 0.0,    0.28, -0.04, 0.18,   0.52, 0.14, 0.0,
    -0.52, 0.14, 0.0,    0.52, 0.14, 0.0,     0.36, 0.12, 0.22,
    -0.52, 0.14, 0.0,    0.36, 0.12, 0.22,   -0.36, 0.12, 0.22,
    // Right hull side
    -0.52, 0.14, 0.0,    0.28, -0.04, -0.18, -0.28, -0.04, -0.18,
    -0.52, 0.14, 0.0,    0.52, 0.14, 0.0,     0.28, -0.04, -0.18,
    -0.52, 0.14, 0.0,   -0.36, 0.12, -0.22,   0.36, 0.12, -0.22,
    -0.52, 0.14, 0.0,    0.36, 0.12, -0.22,   0.52, 0.14, 0.0,
    // Bottom keel
    -0.28, -0.04, 0.18,  0.28, -0.04, -0.18,  0.28, -0.04, 0.18,
    -0.28, -0.04, 0.18, -0.28, -0.04, -0.18,  0.28, -0.04, -0.18,
    // Central triangular folded peak
    -0.24, 0.05, 0.0,    0.0, 0.34, 0.0,      0.0, 0.05, 0.13,
     0.24, 0.05, 0.0,    0.0, 0.05, 0.13,     0.0, 0.34, 0.0,
    -0.24, 0.05, 0.0,    0.0, 0.05, -0.13,    0.0, 0.34, 0.0,
     0.24, 0.05, 0.0,    0.0, 0.34, 0.0,      0.0, 0.05, -0.13,
  ]);
  hullGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  hullGeo.computeVertexNormals();

  const paperMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0xfbf7ef,
      roughness: 0.72,
      metalness: 0.02,
      flatShading: true,
      side: THREE.DoubleSide,
    })
  );
  const boat = new THREE.Mesh(hullGeo, paperMat);
  boat.castShadow = true;
  boat.receiveShadow = true;
  group.add(boat);

  return group;
}

function createPoolRingMesh(
  tracker: ResourceTracker,
  variant: number
): THREE.Group {
  const group = new THREE.Group();
  const stripeColor = variant % 2 === 0 ? '#f06b5b' : '#4ecdc4';
  const tex = createRingTexture(tracker, stripeColor);
  const mat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.18,
      metalness: 0.04,
    })
  );
  const torus = new THREE.Mesh(
    tracker.geo(new THREE.TorusGeometry(0.46, 0.17, 18, 36)),
    mat
  );
  torus.rotation.x = Math.PI / 2;
  torus.castShadow = true;
  torus.receiveShadow = true;
  group.add(torus);
  return group;
}

export function mountSunlitPoolScene(
  container: HTMLElement,
  callbacks?: SunlitPoolCallbacks
): SunlitPoolHandle {
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
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
  scene.background = new THREE.Color(0xe8e2d5);

  const camera = new THREE.PerspectiveCamera(35, initialW / initialH, 0.2, 120);
  camera.position.set(10.5, 11.8, 13.8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -0.4, 0.2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 10;
  controls.maxDistance = 24;
  controls.minPolarAngle = 0.24;
  controls.maxPolarAngle = Math.PI * 0.39;
  controls.update();

  // ---------------------------------------------------------------------------
  // 1. Warm Daylight Lighting
  // ---------------------------------------------------------------------------
  const hemiLight = new THREE.HemisphereLight(0xdff2ff, 0xd8c8b0, 0.62);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xfff6ea, 0.16);
  scene.add(ambientLight);

  const sunDir = new THREE.Vector3(12, 13.5, 10).normalize();
  const sunLight = new THREE.DirectionalLight(0xfff6e5, 2.85);
  sunLight.position.set(21.6, 24.3, 18.0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 68;
  sunLight.shadow.camera.left = -16;
  sunLight.shadow.camera.right = 16;
  sunLight.shadow.camera.top = 16;
  sunLight.shadow.camera.bottom = -16;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.015;
  sunLight.shadow.radius = 2.6;
  scene.add(sunLight);

  // ---------------------------------------------------------------------------
  // 2. 128 x 128 Real-Time 2D Wave Heightfield Physics
  // ---------------------------------------------------------------------------
  const POOL_W = 12.0; // x in [-6.0, 6.0]
  const POOL_D = 8.4; // z in [-4.2, 4.2]
  const POOL_DEPTH = 2.2;
  const GRID_N = 128;

  let wavePrev = new Float32Array(GRID_N * GRID_N);
  let waveCurr = new Float32Array(GRID_N * GRID_N);
  let waveNext = new Float32Array(GRID_N * GRID_N);
  const waveTexBytes = new Uint8Array(GRID_N * GRID_N * 4);

  const waveDataTex = tracker.tex(
    new THREE.DataTexture(
      waveTexBytes,
      GRID_N,
      GRID_N,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    )
  );
  waveDataTex.minFilter = THREE.LinearFilter;
  waveDataTex.magFilter = THREE.LinearFilter;
  waveDataTex.wrapS = THREE.ClampToEdgeWrapping;
  waveDataTex.wrapT = THREE.ClampToEdgeWrapping;
  waveDataTex.needsUpdate = true;

  function addSplash(
    worldX: number,
    worldZ: number,
    strength: number,
    radiusCells: number
  ): void {
    const gx = ((worldX / POOL_W) + 0.5) * (GRID_N - 1);
    const gz = ((worldZ / POOL_D) + 0.5) * (GRID_N - 1);
    const rCeil = Math.ceil(radiusCells);
    const invTwoSigma2 = 1.0 / Math.max(0.5, 0.45 * radiusCells * radiusCells);

    for (let dz = -rCeil; dz <= rCeil; dz++) {
      const iz = Math.round(gz) + dz;
      if (iz < 1 || iz >= GRID_N - 1) continue;
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const ix = Math.round(gx) + dx;
        if (ix < 1 || ix >= GRID_N - 1) continue;
        const dist2 = dx * dx + dz * dz;
        if (dist2 > radiusCells * radiusCells) continue;
        const impulse = strength * Math.exp(-dist2 * invTwoSigma2);
        const idx = iz * GRID_N + ix;
        waveCurr[idx] = Math.max(-1.2, Math.min(1.2, waveCurr[idx] - impulse));
      }
    }
  }

  function stepWaveSim(): void {
    const c2 = 0.22;
    const damping = 0.986;

    for (let z = 1; z < GRID_N - 1; z++) {
      const row = z * GRID_N;
      for (let x = 1; x < GRID_N - 1; x++) {
        const i = row + x;
        const lap =
          waveCurr[i - 1] +
          waveCurr[i + 1] +
          waveCurr[i - GRID_N] +
          waveCurr[i + GRID_N] -
          4 * waveCurr[i];
        let val = (2 * waveCurr[i] - wavePrev[i] + c2 * lap) * damping;
        if (val > 1.2) val = 1.2;
        else if (val < -1.2) val = -1.2;
        waveNext[i] = val;
      }
    }

    // Neumann reflective boundary conditions along pool walls
    for (let k = 0; k < GRID_N; k++) {
      waveNext[k] = waveNext[GRID_N + k];
      waveNext[(GRID_N - 1) * GRID_N + k] = waveNext[(GRID_N - 2) * GRID_N + k];
      waveNext[k * GRID_N] = waveNext[k * GRID_N + 1];
      waveNext[k * GRID_N + (GRID_N - 1)] = waveNext[k * GRID_N + (GRID_N - 2)];
    }

    const tmp = wavePrev;
    wavePrev = waveCurr;
    waveCurr = waveNext;
    waveNext = tmp;
  }

  function uploadWaveTexture(): void {
    for (let z = 0; z < GRID_N; z++) {
      const zPrev = z > 0 ? z - 1 : 0;
      const zNext = z < GRID_N - 1 ? z + 1 : GRID_N - 1;
      for (let x = 0; x < GRID_N; x++) {
        const xPrev = x > 0 ? x - 1 : 0;
        const xNext = x < GRID_N - 1 ? x + 1 : GRID_N - 1;

        const idx = z * GRID_N + x;
        const h = waveCurr[idx];
        const dhdx =
          (waveCurr[z * GRID_N + xNext] - waveCurr[z * GRID_N + xPrev]) * 0.5;
        const dhdz =
          (waveCurr[zNext * GRID_N + x] - waveCurr[zPrev * GRID_N + x]) * 0.5;
        const lap =
          waveCurr[z * GRID_N + xPrev] +
          waveCurr[z * GRID_N + xNext] +
          waveCurr[zPrev * GRID_N + x] +
          waveCurr[zNext * GRID_N + x] -
          4 * h;

        const r = Math.max(0, Math.min(255, Math.round((h * 0.5 + 0.5) * 255)));
        const g = Math.max(
          0,
          Math.min(255, Math.round((dhdx * 1.4 + 0.5) * 255))
        );
        const b = Math.max(
          0,
          Math.min(255, Math.round((dhdz * 1.4 + 0.5) * 255))
        );
        const a = Math.max(
          0,
          Math.min(255, Math.round(Math.max(0, -lap) * 2.2 * 255))
        );

        const p = idx * 4;
        waveTexBytes[p + 0] = r;
        waveTexBytes[p + 1] = g;
        waveTexBytes[p + 2] = b;
        waveTexBytes[p + 3] = a;
      }
    }
    waveDataTex.needsUpdate = true;
  }

  function sampleWaveAt(
    worldX: number,
    worldZ: number
  ): { h: number; dhdx: number; dhdz: number } {
    const u = Math.max(0.01, Math.min(0.99, worldX / POOL_W + 0.5));
    const v = Math.max(0.01, Math.min(0.99, worldZ / POOL_D + 0.5));
    const fx = u * (GRID_N - 1);
    const fz = v * (GRID_N - 1);
    const x0 = Math.max(1, Math.min(GRID_N - 3, Math.floor(fx)));
    const z0 = Math.max(1, Math.min(GRID_N - 3, Math.floor(fz)));
    const tx = fx - x0;
    const tz = fz - z0;

    const i00 = z0 * GRID_N + x0;
    const i10 = i00 + 1;
    const i01 = i00 + GRID_N;
    const i11 = i01 + 1;

    const h =
      (waveCurr[i00] * (1 - tx) + waveCurr[i10] * tx) * (1 - tz) +
      (waveCurr[i01] * (1 - tx) + waveCurr[i11] * tx) * tz;

    const dhdx =
      (waveCurr[i00 + 1] - waveCurr[i00 - 1]) * (POOL_W / GRID_N) * 4.5;
    const dhdz =
      (waveCurr[i00 + GRID_N] - waveCurr[i00 - GRID_N]) *
      (POOL_D / GRID_N) *
      4.5;

    return { h: h * 0.36, dhdx, dhdz };
  }

  // ---------------------------------------------------------------------------
  // 3. Daylight Pool Architecture, Caustics & Deck Accents
  // ---------------------------------------------------------------------------
  const deckTex = createLimestoneDeckTexture(tracker);
  const deckMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: deckTex,
      roughness: 0.72,
      metalness: 0.03,
    })
  );
  const plinthSideMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0xd9cbb6,
      roughness: 0.85,
      metalness: 0.02,
    })
  );

  // Recessed deck built from 4 slabs set back 0.05u behind the pool walls
  // (eliminates any coplanar Z-fighting; coping rim covers the 0.05u seam)
  // Top y = +0.26, bottom y = -2.45 (height = 2.71, center y = -1.095)
  const deckBlocks: Array<[number, number, number, number]> = [
    [-13.5, 13.5, -10.0, -4.25], // North deck
    [-13.5, 13.5, 4.25, 10.0], // South deck
    [-13.5, -6.05, -4.25, 4.25], // West deck
    [6.05, 13.5, -4.25, 4.25], // East deck
  ];

  for (const [x0, x1, z0, z1] of deckBlocks) {
    const w = x1 - x0;
    const d = z1 - z0;
    const slab = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(w, 2.71, d)),
      [plinthSideMat, plinthSideMat, deckMat, plinthSideMat, plinthSideMat, plinthSideMat]
    );
    slab.position.set((x0 + x1) / 2, -1.095, (z0 + z1) / 2);
    slab.receiveShadow = true;
    slab.castShadow = true;
    scene.add(slab);
  }

  // Solid pool sub-base cleanly 0.06u below poolFloor (y = -2.2) to prevent Z-fighting
  const subBase = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(12.3, 0.2, 8.7)),
    plinthSideMat
  );
  subBase.position.set(0, -2.36, 0);
  scene.add(subBase);

  // Black-and-white checkered ceramic coping rim around the pool perimeter
  const rimWidth = 0.58;
  const rimHeight = 0.07;
  const copingLongMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: createCheckeredCopingTexture(tracker, 11.5, 0.5),
      roughness: 0.22,
      metalness: 0.08,
    })
  );
  const copingShortMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: createCheckeredCopingTexture(tracker, 0.5, 7.25),
      roughness: 0.22,
      metalness: 0.08,
    })
  );

  const rimNorth = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(POOL_W + rimWidth * 2, rimHeight, rimWidth)),
    copingLongMat
  );
  rimNorth.position.set(0, 0.295, -(POOL_D / 2 + rimWidth / 2));
  rimNorth.castShadow = true;
  rimNorth.receiveShadow = true;

  const rimSouth = rimNorth.clone();
  rimSouth.position.z = POOL_D / 2 + rimWidth / 2;

  const rimWest = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(rimWidth, rimHeight, POOL_D)),
    copingShortMat
  );
  rimWest.position.set(-(POOL_W / 2 + rimWidth / 2), 0.295, 0);
  rimWest.castShadow = true;
  rimWest.receiveShadow = true;

  const rimEast = rimWest.clone();
  rimEast.position.x = POOL_W / 2 + rimWidth / 2;
  scene.add(rimNorth, rimSouth, rimWest, rimEast);

  // Gleaming Chrome Pool Ladder on the North wall (x = 3.8, z = -4.2)
  const chromeMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f7fa,
      metalness: 0.92,
      roughness: 0.14,
    })
  );
  const ladderGroup = new THREE.Group();
  ladderGroup.position.set(3.8, 0, -4.12);
  scene.add(ladderGroup);

  for (const rx of [-0.32, 0.32]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rx, 0.28, -0.58),
      new THREE.Vector3(rx, 0.96, -0.52),
      new THREE.Vector3(rx, 1.04, -0.14),
      new THREE.Vector3(rx, 0.65, 0.04),
      new THREE.Vector3(rx, -1.25, 0.04),
    ]);
    const rail = new THREE.Mesh(
      tracker.geo(new THREE.TubeGeometry(curve, 24, 0.036, 10, false)),
      chromeMat
    );
    rail.castShadow = true;
    ladderGroup.add(rail);

    const flange = new THREE.Mesh(
      tracker.geo(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 14)),
      chromeMat
    );
    flange.position.set(rx, 0.34, -0.58);
    ladderGroup.add(flange);
  }

  for (const ty of [-0.15, -0.62, -1.08]) {
    const tread = new THREE.Mesh(
      tracker.geo(new THREE.BoxGeometry(0.64, 0.04, 0.14)),
      chromeMat
    );
    tread.position.set(0, ty, 0.04);
    tread.castShadow = true;
    ladderGroup.add(tread);
  }

  // Sunlit Deck Accents: Folded striped towel & minimalist corner planters
  const towelMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      map: createTowelTexture(tracker),
      roughness: 0.88,
    })
  );
  const towel = new THREE.Mesh(
    tracker.geo(new THREE.BoxGeometry(1.7, 0.05, 2.7)),
    towelMat
  );
  towel.position.set(-8.1, 0.29, -1.6);
  towel.rotation.y = 0.08;
  towel.castShadow = true;
  towel.receiveShadow = true;
  scene.add(towel);

  const potMat = tracker.mat(
    new THREE.MeshStandardMaterial({ color: 0xc97b5d, roughness: 0.78 })
  );
  const soilMat = tracker.mat(
    new THREE.MeshStandardMaterial({ color: 0x4b3a2e, roughness: 0.95 })
  );
  const foliageMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x3b7a4b,
      roughness: 0.55,
      side: THREE.DoubleSide,
    })
  );

  for (const [px, pz, scale] of [
    [-8.6, -4.8, 1.0],
    [-9.9, -3.7, 0.78],
  ]) {
    const planter = new THREE.Group();
    planter.position.set(px, 0.26, pz);
    planter.scale.setScalar(scale);

    const pot = new THREE.Mesh(
      tracker.geo(new THREE.CylinderGeometry(0.55, 0.42, 0.82, 16)),
      potMat
    );
    pot.position.y = 0.41;
    pot.castShadow = true;
    pot.receiveShadow = true;
    planter.add(pot);

    const soil = new THREE.Mesh(
      tracker.geo(new THREE.CylinderGeometry(0.49, 0.49, 0.06, 14)),
      soilMat
    );
    soil.position.y = 0.8;
    planter.add(soil);

    for (let l = 0; l < 6; l++) {
      const leaf = new THREE.Mesh(
        tracker.geo(new THREE.ConeGeometry(0.16, 0.95, 5)),
        foliageMat
      );
      const a = (l / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.22, 1.15, Math.sin(a) * 0.22);
      leaf.rotation.z = -Math.cos(a) * 0.55;
      leaf.rotation.x = Math.sin(a) * 0.55;
      leaf.castShadow = true;
      planter.add(leaf);
    }
    scene.add(planter);
  }

  // Pool Interior Floor & Walls with Real-Time Wave-Modulated Caustics
  const mosaicTex = createPoolMosaicTexture(tracker);
  const causticMat = tracker.mat(
    new THREE.ShaderMaterial({
      vertexShader: CAUSTIC_VERTEX_SHADER,
      fragmentShader: CAUSTIC_FRAGMENT_SHADER,
      uniforms: {
        uTileMap: { value: mosaicTex },
        uWaveMap: { value: waveDataTex },
        uPoolSize: { value: new THREE.Vector2(POOL_W, POOL_D) },
        uPoolDepth: { value: POOL_DEPTH },
        uTime: { value: 0 },
        uSunDir: { value: sunDir },
      },
    })
  );

  const poolFloor = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(POOL_W, POOL_D)),
    causticMat
  );
  poolFloor.rotation.x = -Math.PI / 2;
  poolFloor.position.y = -POOL_DEPTH;
  scene.add(poolFloor);

  const wallHeight = POOL_DEPTH + 0.26;
  const wallCenterY = (0.26 - POOL_DEPTH) / 2;

  const wallNorth = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(POOL_W, wallHeight)),
    causticMat
  );
  wallNorth.position.set(0, wallCenterY, -POOL_D / 2);

  const wallSouth = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(POOL_W, wallHeight)),
    causticMat
  );
  wallSouth.rotation.y = Math.PI;
  wallSouth.position.set(0, wallCenterY, POOL_D / 2);

  const wallWest = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(POOL_D, wallHeight)),
    causticMat
  );
  wallWest.rotation.y = Math.PI / 2;
  wallWest.position.set(-POOL_W / 2, wallCenterY, 0);

  const wallEast = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(POOL_D, wallHeight)),
    causticMat
  );
  wallEast.rotation.y = -Math.PI / 2;
  wallEast.position.set(POOL_W / 2, wallCenterY, 0);

  scene.add(wallNorth, wallSouth, wallWest, wallEast);

  // Crystal-Clear Water Surface Mesh
  const waterMat = tracker.mat(
    new THREE.ShaderMaterial({
      vertexShader: WATER_VERTEX_SHADER,
      fragmentShader: WATER_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uWaveMap: { value: waveDataTex },
        uSunDir: { value: sunDir },
        uTime: { value: 0 },
      },
    })
  );
  const waterMesh = new THREE.Mesh(
    tracker.geo(new THREE.PlaneGeometry(POOL_W, POOL_D, 96, 68)),
    waterMat
  );
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.0;
  scene.add(waterMesh);

  // ---------------------------------------------------------------------------
  // 4. Swaying Off-Camera Palm Frond Canopy (Real Shadow Caster onto Deck)
  // ---------------------------------------------------------------------------
  // Positioned strictly along +sunDir above & behind camera frustum so ZERO
  // green palm geometry enters the viewport while its shadow lands on the deck.
  const palmCanopy = new THREE.Group();
  palmCanopy.position.set(15.6, 14.3, 11.73);
  scene.add(palmCanopy);

  const palmMat = tracker.mat(
    new THREE.MeshStandardMaterial({
      color: 0x3b6e3f,
      roughness: 0.7,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    })
  );
  const frondSpecs = [
    { rotY: 2.28, rotZ: 0.16, len: 7.4 },
    { rotY: 2.64, rotZ: 0.1, len: 8.2 },
    { rotY: 2.98, rotZ: 0.2, len: 7.0 },
  ];
  const palmFronds: Array<{ group: THREE.Group; baseRotZ: number; phase: number }> = [];

  const leafletShape = new THREE.Shape();
  leafletShape.moveTo(0, 0);
  leafletShape.quadraticCurveTo(0.3, 1.15, 0.04, 2.75);
  leafletShape.quadraticCurveTo(-0.3, 1.15, 0, 0);
  const leafletGeo = tracker.geo(new THREE.ShapeGeometry(leafletShape, 6));

  for (let f = 0; f < frondSpecs.length; f++) {
    const spec = frondSpecs[f];
    const frond = new THREE.Group();
    frond.rotation.y = spec.rotY;
    frond.rotation.z = spec.rotZ;

    const spine = new THREE.Mesh(
      tracker.geo(new THREE.CylinderGeometry(0.045, 0.08, spec.len, 6)),
      palmMat
    );
    spine.rotation.z = -Math.PI / 2;
    spine.position.x = spec.len * 0.5;
    spine.castShadow = true;
    frond.add(spine);

    for (let i = 2; i < 20; i++) {
      const t = i / 20;
      const x = t * spec.len;
      const sizeScale = 0.62 + Math.sin(t * Math.PI) * 0.68;

      for (const side of [-1, 1]) {
        const leaflet = new THREE.Mesh(leafletGeo, palmMat);
        leaflet.position.set(x, 0, 0);
        leaflet.scale.set(sizeScale, sizeScale, 1);
        leaflet.rotation.x = side * 1.48;
        leaflet.rotation.y = side * 0.22;
        leaflet.rotation.z = -0.16;
        leaflet.castShadow = true;
        frond.add(leaflet);
      }
    }

    palmCanopy.add(frond);
    palmFronds.push({ group: frond, baseRotZ: spec.rotZ, phase: f * 1.4 });
  }

  // ---------------------------------------------------------------------------
  // 5. Buoyant Floating Objects (Blossoms, Paper Boat, Pool Ring)
  // ---------------------------------------------------------------------------
  const bodies: FloatingBody[] = [];
  let spawnCounter = 0;
  const MAX_BODIES = 28;

  function spawnFloatingObject(
    kind: Exclude<PoolToolMode, 'ripple'>,
    x: number,
    z: number,
    withSplash: boolean
  ): void {
    const clampedX = Math.max(-POOL_W / 2 + 0.85, Math.min(POOL_W / 2 - 0.85, x));
    const clampedZ = Math.max(-POOL_D / 2 + 0.85, Math.min(POOL_D / 2 - 0.85, z));

    // Prevent dropping directly onto the chrome ladder
    const safeX =
      clampedZ < -3.0 && Math.abs(clampedX - 3.8) < 0.9 ? 2.6 : clampedX;

    if (bodies.length >= MAX_BODIES) {
      const oldest = bodies.shift();
      if (oldest) scene.remove(oldest.mesh);
    }

    let mesh: THREE.Group;
    let radius = 0.36;
    let draft = 0.015;

    if (kind === 'blossom') {
      mesh = createBlossomMesh(tracker, spawnCounter);
      radius = 0.35;
      draft = 0.01;
    } else if (kind === 'boat') {
      mesh = createPaperBoatMesh(tracker);
      radius = 0.45;
      draft = 0.025;
    } else {
      mesh = createPoolRingMesh(tracker, spawnCounter);
      radius = 0.64;
      draft = 0.03;
    }

    spawnCounter++;
    const yaw = Math.random() * Math.PI * 2;
    mesh.rotation.y = yaw;
    mesh.position.set(safeX, withSplash ? 0.45 : 0.01, clampedZ);
    scene.add(mesh);

    bodies.push({
      mesh,
      x: safeX,
      z: clampedZ,
      vx: (Math.random() - 0.5) * 0.12,
      vz: (Math.random() - 0.5) * 0.12,
      y: withSplash ? 0.45 : 0.01,
      vy: withSplash ? -1.4 : 0,
      radius,
      draft,
      yaw,
      angVel: (Math.random() - 0.5) * 0.3,
      pitch: 0,
      roll: 0,
    });

    if (withSplash) {
      addSplash(safeX, clampedZ, kind === 'ring' ? 0.62 : 0.42, 6.5);
    }
  }

  function seedInitialScene(): void {
    const seedBlossoms: Array<[number, number]> = [
      [-4.3, -2.3],
      [-3.8, 2.2],
      [-0.8, -0.4],
      [2.8, 2.3],
      [4.1, -1.2],
    ];
    for (const [bx, bz] of seedBlossoms) {
      spawnFloatingObject('blossom', bx, bz, false);
    }
    spawnFloatingObject('boat', 1.4, -2.2, false);
    spawnFloatingObject('ring', -1.6, 1.9, false);

    // Gentle initial water ripples so frame 1 shimmers
    addSplash(-1.4, 1.3, 0.3, 7);
    addSplash(1.6, -0.6, 0.24, 6);
  }

  seedInitialScene();

  // ---------------------------------------------------------------------------
  // 6. Pointer Raycasting (Wake, Click Splash / Spawn, Orbit on Deck)
  // ---------------------------------------------------------------------------
  let toolMode: PoolToolMode = 'ripple';
  let breezeEnabled = true;

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();

  let pointerDownOnWater = false;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let lastWakeX = 0;
  let lastWakeZ = 0;
  let hasLastWake = false;

  function raycastWater(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.ray.intersectPlane(waterPlane, hitPoint);
    if (!hit) return null;
    if (
      Math.abs(hit.x) <= POOL_W * 0.5 - 0.15 &&
      Math.abs(hit.z) <= POOL_D * 0.5 - 0.15
    ) {
      return hit;
    }
    return null;
  }

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const hit = raycastWater(e.clientX, e.clientY);
    if (hit) {
      pointerDownOnWater = true;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      controls.enabled = false;
      addSplash(hit.x, hit.z, 0.22, 4.5);
    } else {
      pointerDownOnWater = false;
      controls.enabled = true;
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    const hit = raycastWater(e.clientX, e.clientY);
    if (!hit) {
      hasLastWake = false;
      return;
    }

    if (!hasLastWake) {
      lastWakeX = hit.x;
      lastWakeZ = hit.z;
      hasLastWake = true;
      return;
    }

    const dist = Math.hypot(hit.x - lastWakeX, hit.z - lastWakeZ);
    if (dist > 0.14) {
      const strength = Math.min(0.28, 0.08 + dist * 0.12);
      addSplash(hit.x, hit.z, strength, 4.0);
      lastWakeX = hit.x;
      lastWakeZ = hit.z;
      callbacks?.onWake?.();
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    controls.enabled = true;
    if (!pointerDownOnWater) return;
    pointerDownOnWater = false;

    const dragDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
    const hit = raycastWater(e.clientX, e.clientY);
    if (hit && dragDist < 14) {
      if (toolMode === 'ripple') {
        addSplash(hit.x, hit.z, 0.65, 7.0);
        callbacks?.onSplash?.(1.0);
      } else {
        spawnFloatingObject(toolMode, hit.x, hit.z, true);
        callbacks?.onSplash?.(toolMode === 'ring' ? 1.2 : 0.85);
      }
    }
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // ---------------------------------------------------------------------------
  // 7. Resize & Main Simulation Loop
  // ---------------------------------------------------------------------------
  let disposed = false;

  const handleResize = (): void => {
    const { w, h } = getViewportSize();
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h);
  };

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  }
  window.addEventListener('resize', handleResize);
  window.requestAnimationFrame(() => {
    if (!disposed) handleResize();
  });

  const clock = new THREE.Clock();
  let simAcc = 0;
  let breezeTimer = 0;
  let rafId = 0;

  const animate = (): void => {
    if (disposed) return;
    rafId = window.requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    controls.update();

    // Gentle breeze ripples
    if (breezeEnabled) {
      breezeTimer += dt;
      if (breezeTimer > 0.65) {
        breezeTimer = 0;
        const bx = (Math.random() - 0.5) * (POOL_W - 2.4);
        const bz = (Math.random() - 0.5) * (POOL_D - 2.0);
        addSplash(bx, bz, 0.14 + Math.random() * 0.08, 6.2);
      }
    }

    // Fixed-timestep 2D wave solver
    simAcc += dt;
    let steps = 0;
    while (simAcc >= 1 / 60 && steps < 3) {
      stepWaveSim();
      simAcc -= 1 / 60;
      steps++;
    }
    if (steps > 0) {
      uploadWaveTexture();
    }

    // Sway off-camera palm fronds
    for (const pf of palmFronds) {
      pf.group.rotation.z =
        pf.baseRotZ + Math.sin(elapsed * 0.85 + pf.phase) * 0.045;
    }

    // Physical buoyancy, wave push & soft collision on floating objects
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const { h, dhdx, dhdz } = sampleWaveAt(b.x, b.z);
      const targetY = h - b.draft;

      // Vertical spring-damper buoyancy
      const ay = (targetY - b.y) * 34.0 - b.vy * 6.5;
      b.vy += ay * dt;
      b.y += b.vy * dt;

      // Wave slope accelerates object horizontally + gentle oscillating breeze
      b.vx +=
        (-dhdx * 2.1 +
          (breezeEnabled ? Math.sin(elapsed * 0.28 + i * 1.3) * 0.035 : 0)) *
        dt;
      b.vz +=
        (-dhdz * 2.1 +
          (breezeEnabled ? Math.cos(elapsed * 0.24 + i * 1.1) * 0.025 : 0)) *
        dt;

      // Water drag
      const drag = Math.exp(-1.7 * dt);
      b.vx *= drag;
      b.vz *= drag;
      b.x += b.vx * dt;
      b.z += b.vz * dt;

      // Soft pool wall bounce
      const boundX = POOL_W * 0.5 - b.radius - 0.12;
      const boundZ = POOL_D * 0.5 - b.radius - 0.12;
      if (b.x > boundX) {
        b.x = boundX;
        b.vx = -Math.abs(b.vx) * 0.55;
      } else if (b.x < -boundX) {
        b.x = -boundX;
        b.vx = Math.abs(b.vx) * 0.55;
      }
      if (b.z > boundZ) {
        b.z = boundZ;
        b.vz = -Math.abs(b.vz) * 0.55;
      } else if (b.z < -boundZ) {
        b.z = -boundZ;
        b.vz = Math.abs(b.vz) * 0.55;
      }

      // Soft bounce off submerged ladder zone (x ≈ 3.8, z < -3.3)
      const lx = b.x - 3.8;
      const lz = b.z - -3.85;
      const lDist = Math.hypot(lx, lz);
      const minLadderDist = b.radius + 0.52;
      if (lDist < minLadderDist && lDist > 0.001) {
        const nx = lx / lDist;
        const nz = lz / lDist;
        b.x += nx * (minLadderDist - lDist);
        b.z += nz * (minLadderDist - lDist);
        b.vx += nx * 0.35;
        b.vz += nz * 0.35;
      }

      // Pitch & roll follow water gradient smoothly
      const targetPitch = Math.max(-0.35, Math.min(0.35, dhdz * 1.35));
      const targetRoll = Math.max(-0.35, Math.min(0.35, -dhdx * 1.35));
      const tiltAlpha = 1 - Math.exp(-8 * dt);
      b.pitch += (targetPitch - b.pitch) * tiltAlpha;
      b.roll += (targetRoll - b.roll) * tiltAlpha;
      b.yaw += b.angVel * dt;
      b.angVel *= Math.exp(-0.4 * dt);

      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.set(b.pitch, b.yaw, b.roll);
    }

    // Soft circle-circle separation between floating bodies
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        const minDist = a.radius + b.radius + 0.04;
        if (dist < minDist && dist > 0.0001) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          a.x -= nx * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;
          a.vx -= nx * 0.14;
          a.vz -= nz * 0.14;
          b.vx += nx * 0.14;
          b.vz += nz * 0.14;
        }
      }
    }

    causticMat.uniforms.uTime.value = elapsed;
    waterMat.uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);
  };

  animate();

  return {
    setToolMode(mode: PoolToolMode): void {
      toolMode = mode;
    },

    setBreezeEnabled(enabled: boolean): void {
      breezeEnabled = enabled;
    },

    clearObjects(): void {
      for (const b of bodies) {
        scene.remove(b.mesh);
      }
      bodies.length = 0;
    },

    dispose(): void {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      resizeObserver?.disconnect();
      controls.dispose();
      tracker.disposeAll();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
