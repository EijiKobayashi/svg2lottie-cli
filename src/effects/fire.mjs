/**
 * 炎・熱波エフェクト（本体の熱波スケール・スキュー有機振動＋上昇する火の粉パーティクル）モジュール
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 炎の熱揺らぎ（スケール＆スキュー）と立ち昇る火の粉（Ember）パーティクルを適用する
 * @param {object} layer
 * @param {{
 *   start?: number,
 *   end?: number,
 *   flameColor?: string,
 *   coreColor?: string,
 *   emberCount?: number,
 *   intensity?: number
 * }} options
 * @param {{ width?: number, height?: number, center?: [number, number] }} ctx
 */
export function applyFire(layer, options = {}, ctx = {}) {
  const {
    start = 0,
    end = 180,
    flameColor = '#ea580c',
    coreColor = '#fef08a',
    emberCount = 8,
    intensity = 1.0,
  } = options;

  const [cx, cy] = ctx.center || layer.ks?.a?.k || [100, 100];
  const w = ctx.width || 200;
  const h = ctx.height || 200;

  // 1. 本体レイヤーへの熱波スケール揺らぎ（縦に伸び、横に縮む有機的ブリージング）
  const dur = Math.max(20, end - start);
  const breathCycles = Math.max(3, Math.round(dur / 24));
  const step = Math.round(dur / (breathCycles * 2));

  const scaleKfs = [];
  const skewKfs = [];
  const easeInOut = { x: [0.33, 0.33, 0.33], y: [1, 1, 1] };

  for (let i = 0; i <= breathCycles * 2; i++) {
    const t = Math.min(end, start + i * step);
    const progress = i / (breathCycles * 2);
    // 炎の伸び縮み：Xは 94%〜104%、Yは 106%〜96%
    const isPeak = i % 2 === 1;
    const sx = isPeak ? 94 - 3 * intensity : 103 + 2 * intensity;
    const sy = isPeak ? 107 + 4 * intensity : 97 - 2 * intensity;
    const skewAngle = (i % 4 === 1 ? 3.5 : i % 4 === 3 ? -3.5 : 0) * intensity;

    scaleKfs.push({
      t,
      s: [round4(sx), round4(sy), 100],
      i: easeInOut,
      o: easeInOut,
    });

    skewKfs.push({
      t,
      s: [round4(skewAngle)],
      i: { x: [0.33], y: [1] },
      o: { x: [0.33], y: [1] },
    });
  }

  delete scaleKfs[scaleKfs.length - 1].i;
  delete scaleKfs[scaleKfs.length - 1].o;
  delete skewKfs[skewKfs.length - 1].i;
  delete skewKfs[skewKfs.length - 1].o;

  layer.ks.s = { a: 1, k: scaleKfs };
  layer.ks.sk = { a: 1, k: skewKfs };
  layer.ks.sa = { a: 0, k: 0 };

  // 2. 立ち昇る火の粉（Ember）パーティクルレイヤー群
  const spreadX = Math.max(16, w * 0.18);
  const riseDist = Math.max(28, h * 0.28);
  const dotSize = round4(Math.max(3.5, Math.min(w, h) * 0.025));

  const flameRgba = hexToLottieColor(flameColor);
  const coreRgba = hexToLottieColor(coreColor);

  const extraLayers = [];
  for (let i = 0; i < emberCount; i++) {
    const norm = (i / Math.max(1, emberCount - 1)) - 0.5;
    const offsetX = round4(norm * spreadX);
    const swayX = round4((i % 2 === 0 ? 1 : -1) * spreadX * 0.35);
    const riseY = round4(riseDist * (0.8 + (i % 3) * 0.25));
    const emberStart = start + i * 8;
    const emberMid = Math.round(emberStart + 20);
    const emberEnd = Math.min(end, emberStart + 48);

    extraLayers.push({
      ddd: 0,
      ind: (layer.ind || 1) + 300 + i,
      ty: 4,
      nm: `${layer.nm}-fire-ember-${i + 1}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: emberStart, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: emberStart + 8, s: [95], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: emberEnd, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: emberStart, s: [cx + offsetX, cy, 0], i: { x: 0.42, y: 0 }, o: { x: 0.58, y: 1 } },
            { t: emberMid, s: [cx + offsetX + swayX, round4(cy - riseY * 0.5), 0], i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
            { t: emberEnd, s: [cx + offsetX - swayX * 0.5, round4(cy - riseY), 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: emberStart, s: [40, 40, 100], i: easeInOut, o: easeInOut },
            { t: emberMid, s: [120, 120, 100], i: easeInOut, o: easeInOut },
            { t: emberEnd, s: [15, 15, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Ember Glow Dot',
          it: [
            {
              ty: 'el',
              nm: 'Ember Circle',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [dotSize, dotSize] },
            },
            {
              ty: 'fl',
              nm: 'Flame Color Transition',
              c: {
                a: 1,
                k: [
                  { t: emberStart, s: coreRgba, i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                  { t: emberEnd, s: flameRgba },
                ],
              },
              o: { a: 0, k: 100 },
              r: 1,
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
              sk: { a: 0, k: 0 },
              sa: { a: 0, k: 0 },
            },
          ],
        },
      ],
      ip: emberStart,
      op: emberEnd,
      st: 0,
      bm: 0,
    });
  }

  return { layer, extraLayers };
}
