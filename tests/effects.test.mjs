import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EFFECT_REGISTRY,
  listEffects,
  applyLayerEffects,
} from '../src/effects/index.mjs';
import { buildLottieFromStoryboard, appendPowderEnding } from '../src/lottie-builder.mjs';

const SAMPLE_SVG = `
  <svg viewBox="0 0 200 200">
    <g id="card">
      <path id="bg-green" fill="#00ff00" d="M 0 0 L 200 0 L 200 200 L 0 200 Z" />
      <path id="border-clip" fill="#264f74" d="M 20 20 L 180 20 L 180 180 L 20 180 Z" />
      <path id="inner-mark" fill="#264f74" d="M 60 60 L 140 60 L 100 140 Z" />
    </g>
  </svg>
`;

test('EFFECT_REGISTRY: 全17種＋powder-scatterのエフェクトが登録されている', () => {
  const names = listEffects();
  const expected = [
    'cross-dissolve',
    'bleed-fade',
    'wipe',
    'slide-push-pull',
    'pop-in',
    'trim-stroke',
    'zoom-slide-spin',
    'transform',
    'speed-control',
    'color-grade',
    'mask',
    'ultra-key',
    'echo-glow-neon',
    'liquid-glass',
    'glass-crack',
    'fire',
    'water',
    'powder-scatter',
  ];
  for (const effectName of expected) {
    assert.ok(names.includes(effectName), `Missing effect: ${effectName}`);
    assert.equal(typeof EFFECT_REGISTRY[effectName], 'function');
  }
});

test('全モジュラーエフェクトを宣言的effects配列で適用・合成できる', () => {
  const config = {
    name: 'all-effects-showcase',
    width: 200,
    height: 200,
    fps: 60,
    durationFrames: 180,
    color: '#264f74',
    layers: [
      {
        id: 'hero-card',
        svg: 'svg/sample.svg',
        targetId: 'card',
        clipMask: true,
        effects: [
          { type: 'ultra-key', keyColor: '#00ff00', tolerance: 0.2 },
          { type: 'cross-dissolve', direction: 'in', start: 0, end: 30 },
          { type: 'bleed-fade', fadeIn: { start: 0, end: 30, blur: 20, scaleFrom: 0 } },
          { type: 'wipe', direction: 'right', start: 10, end: 50 },
          { type: 'slide-push-pull', mode: 'push', dx: -80, dy: 0, start: 0, end: 40, overshoot: 8 },
          { type: 'pop-in', start: 0, end: 36, overshootScale: 112 },
          { type: 'zoom-slide-spin', start: 40, end: 90, zoomFrom: 90, zoomTo: 100, rotations: 1 },
          { type: 'transform', skew: 6, skewAxis: 15 },
          { type: 'speed-control', rate: 1.5 },
          { type: 'color-grade', tintColor: '#38bdf8', saturation: 1.2, brightness: 1.1 },
          { type: 'mask', mode: 'a', feather: 8, expansion: 2 },
          { type: 'echo-glow-neon', mode: 'echo', echoCount: 2, echoDelayFrames: 3, color: '#38bdf8' },
          { type: 'liquid-glass', variant: 'liquid', blur: 18, tintOpacity: 24, specularWidth: 2 },
          { type: 'glass-crack', start: 90, end: 130, impactPoint: [100, 100], rays: 6 },
          { type: 'fire', start: 60, end: 140, emberCount: 8 },
          { type: 'water', mode: 'ripple', start: 70, end: 150, rings: 3 },
        ],
      },
      {
        id: 'outline',
        type: 'stroke',
        trimStroke: {
          vertices: [
            [180, 20],
            [20, 20],
            [20, 180],
            [180, 180],
          ],
          closed: true,
          strokeWidth: 4,
          start: 0,
          end: 60,
        },
      },
    ],
    powderEnding: {
      enabled: true,
      targetLayerIds: ['hero-card', 'outline'],
      appearFrame: 128,
      fadeStartFrame: 130,
      fadeEndFrame: 170,
      totalFrames: 180,
      particleCount: 120,
    },
  };

  const baseLottie = buildLottieFromStoryboard(config, () => SAMPLE_SVG);
  assert.equal(baseLottie.v, '5.12.2');
  assert.equal(baseLottie.w, 200);
  assert.equal(baseLottie.h, 200);
  // 元レイヤー + echo残像 + liquid-glassプレート + glass-crack + fire + water + outline
  assert.ok(baseLottie.layers.length >= 7);

  const heroLayer = baseLottie.layers.find((l) => l.nm === 'hero-card');
  assert.ok(heroLayer);
  // マスク・ガウスエフェクト・スキューが付与されていること
  assert.ok(heroLayer.masksProperties.length >= 2);
  assert.ok(heroLayer.ef.length >= 1);
  assert.equal(heroLayer.ks.sk.k, 6);

  // Powder飛散エンディング派生版の検証
  const powderLottie = appendPowderEnding(baseLottie, config, () => SAMPLE_SVG);
  assert.equal(powderLottie.op, 180);
  const particleLayers = powderLottie.layers.filter((l) => l.nm.startsWith('powder-'));
  assert.ok(particleLayers.length > 0);
});
