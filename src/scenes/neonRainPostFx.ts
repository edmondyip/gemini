import * as THREE from 'three';

export type LookPresetId = 'cinema' | 'bayer' | 'crt' | 'typhoon';

export interface LookPresetConfig {
  id: LookPresetId;
  label: string;
  tiltShiftStrength: number;
  focusCenter: number;
  focusBand: number;
  ditherStrength: number;
  pixelScale: number;
  colorLevels: number;
  scanlines: number;
  chromaticAberration: number;
  vignette: number;
  contrast: number;
  saturation: number;
  tint: [number, number, number];
  bloomBoost: number;
  rainIntensity: number;
  fogDensity: number;
}

export const LOOK_PRESETS: Record<LookPresetId, LookPresetConfig> = {
  cinema: {
    id: 'cinema',
    label: 'Cinema Neon',
    tiltShiftStrength: 0.85,
    focusCenter: 0.48,
    focusBand: 0.14,
    ditherStrength: 0.0,
    pixelScale: 1.0,
    colorLevels: 32.0,
    scanlines: 0.0,
    chromaticAberration: 0.14,
    vignette: 0.36,
    contrast: 1.1,
    saturation: 1.18,
    tint: [1.0, 1.0, 1.03],
    bloomBoost: 0.36,
    rainIntensity: 1.0,
    fogDensity: 0.016,
  },
  bayer: {
    id: 'bayer',
    label: 'Bayer Dither',
    tiltShiftStrength: 0.42,
    focusCenter: 0.48,
    focusBand: 0.16,
    ditherStrength: 1.0,
    pixelScale: 2.5,
    colorLevels: 6.0,
    scanlines: 0.1,
    chromaticAberration: 0.08,
    vignette: 0.26,
    contrast: 1.18,
    saturation: 1.14,
    tint: [1.0, 1.02, 1.04],
    bloomBoost: 0.26,
    rainIntensity: 0.9,
    fogDensity: 0.016,
  },
  crt: {
    id: 'crt',
    label: 'CRT Retro',
    tiltShiftStrength: 0.28,
    focusCenter: 0.48,
    focusBand: 0.18,
    ditherStrength: 0.22,
    pixelScale: 1.0,
    colorLevels: 12.0,
    scanlines: 0.78,
    chromaticAberration: 0.85,
    vignette: 0.5,
    contrast: 1.16,
    saturation: 1.24,
    tint: [1.06, 0.98, 0.92],
    bloomBoost: 0.44,
    rainIntensity: 1.0,
    fogDensity: 0.016,
  },
  typhoon: {
    id: 'typhoon',
    label: 'Typhoon Noir',
    tiltShiftStrength: 0.65,
    focusCenter: 0.48,
    focusBand: 0.15,
    ditherStrength: 0.0,
    pixelScale: 1.0,
    colorLevels: 32.0,
    scanlines: 0.14,
    chromaticAberration: 0.34,
    vignette: 0.58,
    contrast: 1.28,
    saturation: 0.94,
    tint: [0.84, 1.02, 1.14],
    bloomBoost: 0.5,
    rainIntensity: 1.9,
    fogDensity: 0.024,
  },
};

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uTiltShiftStrength;
  uniform float uFocusCenter;
  uniform float uFocusBand;
  uniform float uDitherStrength;
  uniform float uPixelScale;
  uniform float uColorLevels;
  uniform float uScanlines;
  uniform float uChromaticAberration;
  uniform float uVignette;
  uniform float uContrast;
  uniform float uSaturation;
  uniform vec3 uTint;
  uniform float uBloomBoost;

  varying vec2 vUv;

  float bayer4x4(vec2 cell) {
    int x = int(mod(cell.x, 4.0));
    int y = int(mod(cell.y, 4.0));
    int index = y * 4 + x;

    if (index == 0) return 0.0 / 16.0;
    if (index == 1) return 8.0 / 16.0;
    if (index == 2) return 2.0 / 16.0;
    if (index == 3) return 10.0 / 16.0;
    if (index == 4) return 12.0 / 16.0;
    if (index == 5) return 4.0 / 16.0;
    if (index == 6) return 14.0 / 16.0;
    if (index == 7) return 6.0 / 16.0;
    if (index == 8) return 3.0 / 16.0;
    if (index == 9) return 11.0 / 16.0;
    if (index == 10) return 1.0 / 16.0;
    if (index == 11) return 9.0 / 16.0;
    if (index == 12) return 15.0 / 16.0;
    if (index == 13) return 7.0 / 16.0;
    if (index == 14) return 13.0 / 16.0;
    return 5.0 / 16.0;
  }

  vec3 acesFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  vec3 sampleScene(vec2 uv, float blurAmount) {
    if (blurAmount <= 0.0001) {
      return texture2D(tDiffuse, uv).rgb;
    }

    vec2 texel = (1.0 / max(uResolution, vec2(1.0))) * blurAmount;
    vec3 acc = texture2D(tDiffuse, uv).rgb;

    // 12-tap golden-angle spiral bokeh for clean miniature tilt-shift blur
    const float goldenAngle = 2.39996323;
    for (int i = 1; i <= 12; i++) {
      float fi = float(i);
      float radius = sqrt(fi / 12.0);
      float angle = fi * goldenAngle;
      vec2 offset = vec2(cos(angle), sin(angle)) * texel * radius;
      acc += texture2D(tDiffuse, clamp(uv + offset, 0.001, 0.999)).rgb;
    }

    return acc / 13.0;
  }

  void main() {
    vec2 res = max(uResolution, vec2(1.0));
    vec2 uv = vUv;

    // 1. Optional pixel-grid snap for crisp retro Bayer look
    if (uPixelScale > 1.01) {
      vec2 grid = floor(uv * res / uPixelScale) * uPixelScale;
      uv = (grid + 0.5 * uPixelScale) / res;
    }

    // 2. Tilt-shift blur radius from distance outside center focus band
    float distFromFocus = max(0.0, abs(uv.y - uFocusCenter) - uFocusBand);
    float blurPixels = distFromFocus * uTiltShiftStrength * 14.0;

    // 3. Radial RGB chromatic aberration
    vec2 fromCenter = uv - vec2(0.5);
    float radial = length(fromCenter);
    vec2 chromaOffset = fromCenter * radial * uChromaticAberration * 0.009;

    vec3 color;
    if (uChromaticAberration > 0.005) {
      float r = sampleScene(clamp(uv + chromaOffset, 0.001, 0.999), blurPixels).r;
      float g = sampleScene(uv, blurPixels).g;
      float b = sampleScene(clamp(uv - chromaOffset, 0.001, 0.999), blurPixels).b;
      color = vec3(r, g, b);
    } else {
      color = sampleScene(uv, blurPixels);
    }

    // 4. Cheap neon highlight bloom glow
    if (uBloomBoost > 0.001) {
      vec2 bloomStep = (1.0 / res) * 5.5;
      vec3 glow = vec3(0.0);
      vec3 s0 = texture2D(tDiffuse, clamp(uv + vec2(bloomStep.x, bloomStep.y), 0.001, 0.999)).rgb;
      vec3 s1 = texture2D(tDiffuse, clamp(uv + vec2(-bloomStep.x, bloomStep.y), 0.001, 0.999)).rgb;
      vec3 s2 = texture2D(tDiffuse, clamp(uv + vec2(bloomStep.x, -bloomStep.y), 0.001, 0.999)).rgb;
      vec3 s3 = texture2D(tDiffuse, clamp(uv + vec2(-bloomStep.x, -bloomStep.y), 0.001, 0.999)).rgb;
      glow += s0 * max(0.0, luminance(s0) - 0.68);
      glow += s1 * max(0.0, luminance(s1) - 0.68);
      glow += s2 * max(0.0, luminance(s2) - 0.68);
      glow += s3 * max(0.0, luminance(s3) - 0.68);
      color += (glow * 0.25) * uBloomBoost;
    }

    // 5. ACES Filmic tone mapping + grade + gamma encoding
    color *= 1.15;
    color = acesFilm(color);
    color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));

    // Saturation & contrast
    float luma = luminance(color);
    color = mix(vec3(luma), color, uSaturation);
    color = clamp((color - 0.5) * uContrast + 0.5, 0.0, 1.0);
    color *= uTint;
    color = clamp(color, 0.0, 1.0);

    // 6. Ordered Bayer 4x4 dithering & color quantization
    if (uDitherStrength > 0.001) {
      vec2 ditherCell = floor(gl_FragCoord.xy / max(1.0, uPixelScale));
      float threshold = bayer4x4(ditherCell) - 0.5;
      float levels = max(2.0, uColorLevels - 1.0);
      vec3 dithered = floor(clamp(color + threshold / levels, 0.0, 1.0) * levels + 0.5) / levels;
      color = mix(color, dithered, uDitherStrength);
    }

    // 7. CRT horizontal scanlines + subtle RGB subpixel grille
    if (uScanlines > 0.001) {
      float scan = 0.5 + 0.5 * sin(gl_FragCoord.y * 1.5707963 + uTime * 0.5);
      float scanFactor = 1.0 - uScanlines * 0.34 * (1.0 - scan);
      float grille = 0.96 + 0.04 * sin(gl_FragCoord.x * 2.094395);
      color *= scanFactor * mix(1.0, grille, uScanlines);
    }

    // Vignette
    float vigDist = length(fromCenter * vec2(1.18, 1.0));
    float vig = smoothstep(0.32, 0.92, vigDist);
    color *= 1.0 - vig * uVignette;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export class NeonRainPostFx {
  private renderTarget: THREE.WebGLRenderTarget;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private quadGeometry: THREE.PlaneGeometry;
  private material: THREE.ShaderMaterial;
  private quadMesh: THREE.Mesh;

  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    pixelRatio: number,
    initialPreset: LookPresetId = 'cinema'
  ) {
    const rtWidth = Math.max(1, Math.floor(width * pixelRatio));
    const rtHeight = Math.max(1, Math.floor(height * pixelRatio));
    const textureType = renderer.capabilities.isWebGL2
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;

    this.renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: textureType,
      depthBuffer: true,
    });

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);

    const preset = LOOK_PRESETS[initialPreset];
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        uResolution: { value: new THREE.Vector2(rtWidth, rtHeight) },
        uTime: { value: 0 },
        uTiltShiftStrength: { value: preset.tiltShiftStrength },
        uFocusCenter: { value: preset.focusCenter },
        uFocusBand: { value: preset.focusBand },
        uDitherStrength: { value: preset.ditherStrength },
        uPixelScale: { value: preset.pixelScale },
        uColorLevels: { value: preset.colorLevels },
        uScanlines: { value: preset.scanlines },
        uChromaticAberration: { value: preset.chromaticAberration },
        uVignette: { value: preset.vignette },
        uContrast: { value: preset.contrast },
        uSaturation: { value: preset.saturation },
        uTint: { value: new THREE.Vector3(...preset.tint) },
        uBloomBoost: { value: preset.bloomBoost },
      },
    });

    this.quadMesh = new THREE.Mesh(this.quadGeometry, this.material);
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);
  }

  setLookPreset(presetId: LookPresetId): LookPresetConfig {
    const preset = LOOK_PRESETS[presetId];
    const u = this.material.uniforms;
    u.uTiltShiftStrength.value = preset.tiltShiftStrength;
    u.uFocusCenter.value = preset.focusCenter;
    u.uFocusBand.value = preset.focusBand;
    u.uDitherStrength.value = preset.ditherStrength;
    u.uPixelScale.value = preset.pixelScale;
    u.uColorLevels.value = preset.colorLevels;
    u.uScanlines.value = preset.scanlines;
    u.uChromaticAberration.value = preset.chromaticAberration;
    u.uVignette.value = preset.vignette;
    u.uContrast.value = preset.contrast;
    u.uSaturation.value = preset.saturation;
    (u.uTint.value as THREE.Vector3).set(...preset.tint);
    u.uBloomBoost.value = preset.bloomBoost;
    return preset;
  }

  resize(width: number, height: number, pixelRatio: number): void {
    const rtWidth = Math.max(1, Math.floor(width * pixelRatio));
    const rtHeight = Math.max(1, Math.floor(height * pixelRatio));
    this.renderTarget.setSize(rtWidth, rtHeight);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(
      rtWidth,
      rtHeight
    );
  }

  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    elapsedSeconds: number
  ): void {
    this.material.uniforms.uTime.value = elapsedSeconds;
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(this.quadScene, this.quadCamera);
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.quadGeometry.dispose();
    this.material.dispose();
  }
}
