/**
 * 水エフェクト（波紋リップルリング拡散・流体ウェーブ・水滴）モジュール
 */

import { hexToLottieColor } from '../path-parser.mjs';

/**
 * 水面の波紋（リップル）または水滴エフェクトレイヤーを生成する
 * @param {object} layer
 * @param {{ mode?: 'ripple' | 'wave' | 'splash', start?: number, end?: number, rings?: number, color?: string }} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applyWater(layer, options = {}, ctx = {}) {
  const {
    start = 0,
    end = 90,
    rings = 3,
    color = '#38bdf8',
  } = options;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [100, 100];
  const rgba = hexToLottieColor(color);

  const extraLayers = [];
  for (let i = 0; i < rings; i++) {
    const rStart = start + i * 10;
    const rEnd = Math.min(end, rStart + 50);

    extraLayers.push({
      ddd: 0,
      ind: (layer.ind || 1) + 400 + i,
      ty: 4,
      nm: `${layer.nm}-water-ripple-${i + 1}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: rStart, s: [85], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: rEnd, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [cx, cy, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            {
              t: rStart,
              s: [20, 20, 100],
              i: { x: [0.22, 0.22, 0.22], y: [1, 1, 1] },
              o: { x: [0.36, 0.36, 0.36], y: [1, 1, 1] },
            },
            { t: rEnd, s: [180, 180, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Ripple Ring',
          it: [
            {
              ty: 'el',
              nm: 'Ripple Ellipse',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [60, 60] },
            },
            {
              ty: 'st',
              nm: 'Water Stroke',
              c: { a: 0, k: rgba },
              o: { a: 0, k: 90 },
              w: { a: 0, k: 2 },
              lc: 2,
              lj: 2,
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
      ip: rStart,
      op: rEnd,
      st: 0,
      bm: 0,
    });
  }

  return { layer, extraLayers };
}
