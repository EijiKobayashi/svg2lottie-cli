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

test('EFFECT_REGISTRY: snowfall-loopを含むエフェクトが登録されている', () => {
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
    'snowfall-loop',
    'powder-scatter',
  ];
  for (const effectName of expected) {
    assert.ok(names.includes(effectName), `Missing effect: ${effectName}`);
    assert.equal(typeof EFFECT_REGISTRY[effectName], 'function');
  }
});

test('snowfall-loop: 雪片を縦に複製し開始・終了位置が循環する', () => {
  const layer = {
    nm: 'snow',
    ip: 0,
    op: 240,
    ks: {
      p: { a: 0, k: [200, 112.5, 0] },
      o: { a: 0, k: 100 },
    },
  };
  const result = applyLayerEffects(
    layer,
    [{ type: 'snowfall-loop', start: 0, end: 240, distance: 225, drift: 18, copies: 2, opacity: 82 }],
    { width: 400, height: 225, center: [200, 112.5] }
  );

  assert.equal(result.layer.ks.p.a, 1);
  assert.deepEqual(result.layer.ks.p.k[0].s, [182, 112.5, 0]);
  assert.deepEqual(result.layer.ks.p.k.at(-1).s, [182, 337.5, 0]);
  assert.equal(result.layer.ks.o.k, 82);
  assert.equal(result.extraLayers.length, 1);
  assert.equal(result.extraLayers[0].nm, 'snow-tile-2');
  assert.deepEqual(result.extraLayers[0].ks.p.k[0].s, [182, -112.5, 0]);
  assert.deepEqual(result.extraLayers[0].ks.p.k.at(-1).s, [182, 112.5, 0]);
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
  assert.ok(heroLayer.ks.sk);

  // Powder飛散エンディング派生版の検証
  const powderLottie = appendPowderEnding(baseLottie, config, () => SAMPLE_SVG);
  assert.equal(powderLottie.op, 180);
  const particleLayers = powderLottie.layers.filter((l) => l.nm.startsWith('powder-'));
  assert.ok(particleLayers.length > 0);
});

test('fire: 本体の熱波スケール・スキュー揺らぎと火の粉レイヤーを生成する', () => {
  const layer = {
    nm: 'flame',
    ip: 0,
    op: 180,
    ks: {
      p: { a: 0, k: [100, 100, 0] },
      s: { a: 0, k: [100, 100, 100] },
      o: { a: 0, k: 100 },
    },
  };
  const result = EFFECT_REGISTRY.fire(layer, { start: 10, end: 120, emberCount: 6 }, { center: [100, 100], width: 200, height: 200 });
  assert.equal(result.layer.ks.s.a, 1, '本体に熱波スケール揺らぎアニメーションが付与される');
  assert.ok(result.layer.ks.s.k.length >= 4, '複数の熱波キーフレームが存在する');
  assert.equal(result.extraLayers.length, 6, '指定数の火の粉レイヤーが生成される');
});

test('water: 本体の表面張力プルプル弾性スケールと波紋リングを生成する', () => {
  const layer = {
    nm: 'drop',
    ip: 0,
    op: 180,
    ks: {
      p: { a: 0, k: [100, 100, 0] },
      s: { a: 0, k: [100, 100, 100] },
      o: { a: 0, k: 100 },
    },
  };
  const result = EFFECT_REGISTRY.water(layer, { mode: 'ripple', start: 10, end: 120, rings: 3 }, { center: [100, 100], width: 200, height: 200 });
  assert.equal(result.layer.ks.s.a, 1, '本体に表面張力プルプルスケールが付与される');
  // XとYが逆位相でバウンドしていること（液体感）
  const kf = result.layer.ks.s.k.find((k) => k.s && k.s[0] !== k.s[1]);
  assert.ok(kf, 'X軸とY軸が非対称に変形して流体感を表現している');
  assert.equal(result.extraLayers.length, 3, '波紋リングレイヤーが3つ生成される');
});

test('echo-glow-neon: ネオン管フリッカー点滅とブルーム光彩を生成する', () => {
  const layer = {
    nm: 'sign',
    ip: 0,
    op: 180,
    ks: {
      p: { a: 0, k: [100, 100, 0] },
      o: { a: 0, k: 100 },
    },
    shapes: [
      { ty: 'sh', nm: 'contour', ks: { a: 0, k: { c: true, v: [[0, 0]], i: [[0, 0]], o: [[0, 0]] } } },
    ],
  };
  const result = EFFECT_REGISTRY['echo-glow-neon'](layer, { mode: 'neon', flicker: true, start: 0, end: 40 });
  assert.equal(result.layer.ks.o.a, 1, 'ネオン点灯フリッカー不透明度が付与される');
  assert.ok(result.extraLayers.length >= 1, 'グローブルームレイヤーが生成される');
});

