/**
 * 炎エフェクト（揺らめく火炎＆上昇する火の粉エンバーパーティクル）モジュール
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 炎の揺らぎと上昇する火の粉（Ember）パーティクルレイヤーを生成する
 * @param {object} layer
 * @param {{ start?: number, end?: number, flameColor?: string, emberCount?: number }} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applyFire(layer, options = {}, ctx = {}) {
  const {
    start = 0,
    end = 90,
    flameColor = '#ff5400',
    emberCount = 8,
  } = options;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [100, 100];
  const rgba = hexToLottieColor(flameColor);

  const extraLayers = [];
  for (let i = 0; i < emberCount; i++) {
    const offsetX = round4(((i % 5) - 2) * 12);
    const riseY = round4(35 + (i % 4) * 18);
    const emberStart = start + i * 3;
    const emberEnd = Math.min(end, emberStart + 42);

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
            { t: Math.round((emberStart + emberEnd) / 2), s: [90], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: emberEnd, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: emberStart, s: [cx + offsetX, cy, 0], i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
            { t: emberEnd, s: [cx + offsetX * 1.4, cy - riseY, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Ember Dot',
          it: [
            {
              ty: 'el',
              nm: 'Ember Circle',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [4, 4] },
            },
            {
              ty: 'fl',
              nm: 'Flame Fill',
              c: { a: 0, k: rgba },
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
