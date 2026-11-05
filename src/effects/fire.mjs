/**
 * 炎・太陽熱波エフェクト（熱ゆらぎブリージング＋S字軌道で立ち昇る火の粉パーティクル）モジュール
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 炎の熱揺らぎとS字曲線で上昇する火の粉（Ember）パーティクルレイヤーを生成する
 * @param {object} layer
 * @param {{ start?: number, end?: number, flameColor?: string, coreColor?: string, emberCount?: number }} options
 * @param {{ width?: number, height?: number, center?: [number, number] }} ctx
 */
export function applyFire(layer, options = {}, ctx = {}) {
  const {
    start = 30,
    end = 170,
    flameColor = '#ff5400',
    coreColor = '#fde047',
    emberCount = 8,
  } = options;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [300, 300];
  const w = ctx.width || 600;
  const h = ctx.height || 600;
  const spreadX = Math.max(24, w * 0.14);
  const riseDist = Math.max(36, h * 0.16);
  const dotSize = round4(Math.max(4, Math.min(w, h) * 0.014));

  const flameRgba = hexToLottieColor(flameColor);
  const coreRgba = hexToLottieColor(coreColor);

  const extraLayers = [];
  for (let i = 0; i < emberCount; i++) {
    const norm = (i / Math.max(1, emberCount - 1)) - 0.5;
    const offsetX = round4(norm * spreadX);
    const swayX = round4((i % 2 === 0 ? 1 : -1) * spreadX * 0.28);
    const riseY = round4(riseDist * (0.75 + (i % 3) * 0.2));
    const emberStart = start + i * 5;
    const emberMid = Math.round(emberStart + 24);
    const emberEnd = Math.min(end, emberStart + 52);

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
            { t: emberStart + 10, s: [92], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
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
            { t: emberStart, s: [40, 40, 100], i: { x: [0.22, 0.22, 0.22], y: [1, 1, 1] }, o: { x: [0.36, 0.36, 0.36], y: [1, 1, 1] } },
            { t: emberMid, s: [120, 120, 100], i: { x: [0.22, 0.22, 0.22], y: [1, 1, 1] }, o: { x: [0.36, 0.36, 0.36], y: [1, 1, 1] } },
            { t: emberEnd, s: [20, 20, 100] },
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
