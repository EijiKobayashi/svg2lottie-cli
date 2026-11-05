/**
 * 水エフェクト（水滴の重力落下 ➔ 着水瞬間の消失 ➔ 美しい波紋リング拡散）モジュール
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 水滴の着水ストーリー（落下・着水・波紋拡散）を生成する
 * @param {object} layer
 * @param {{
 *   mode?: 'drop-ripple' | 'ripple' | 'wave',
 *   start?: number,
 *   end?: number,
 *   rings?: number,
 *   fallDistance?: number,
 *   color?: string
 * }} options
 * @param {{ width?: number, height?: number, center?: [number, number] }} ctx
 */
export function applyWater(layer, options = {}, ctx = {}) {
  const {
    mode = 'drop-ripple',
    start = 0,
    end = 120,
    rings = 3,
    fallDistance = 80,
    color = '#38bdf8',
  } = options;

  const [cx, cy] = ctx.center || layer.ks?.a?.k || [100, 100];
  const w = ctx.width || 200;
  const rgba = hexToLottieColor(color);

  const dur = Math.max(30, end - start);
  const impactTime = Math.round(start + dur * 0.28); // 全体の28%の時点で着水

  // 1. 水滴本体の落下と着水消失アニメーション
  if (mode === 'drop-ripple') {
    // 重力加速落下 (ease-in)
    const easeInQuad = { x: [0.55, 0.55, 0.55], y: [0, 0, 0] };
    const easeOutQuad = { x: [0.25, 0.25, 0.25], y: [1, 1, 1] };

    layer.ks.p = {
      a: 1,
      k: [
        { t: 0, s: [cx, cy - fallDistance, 0], i: easeInQuad, o: easeInQuad },
        { t: start, s: [cx, cy - fallDistance, 0], i: easeInQuad, o: easeInQuad },
        { t: impactTime, s: [cx, cy, 0] },
      ],
    };

    // 落下中は縦長にし、着水瞬間に横に潰れて消滅
    layer.ks.s = {
      a: 1,
      k: [
        { t: start, s: [85, 115, 100], i: easeInQuad, o: easeInQuad },
        { t: impactTime - 2, s: [80, 125, 100], i: easeOutQuad, o: easeOutQuad },
        { t: impactTime, s: [140, 40, 100] },
      ],
    };

    layer.ks.o = {
      a: 1,
      k: [
        { t: start, s: [100] },
        { t: impactTime, s: [100] },
        { t: impactTime + 3, s: [0] },
      ],
    };
  }

  // 2. 着水点からの多重波紋（Ripple）リング
  const ringBaseW = Math.round(w * 0.42);
  const ringBaseH = Math.round(ringBaseW * 0.45);

  const extraLayers = [];
  const rippleStart = mode === 'drop-ripple' ? impactTime : start;

  for (let i = 0; i < rings; i++) {
    const rStart = rippleStart + i * 14;
    const rEnd = Math.min(end, rStart + 56);

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
            { t: rStart, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: rStart + 6, s: [85], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: rEnd, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [cx, cy + 10, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            {
              t: rStart,
              s: [15, 15, 100],
              i: { x: [0.16, 0.16, 0.16], y: [1, 1, 1] },
              o: { x: [0.36, 0.36, 0.36], y: [1, 1, 1] },
            },
            { t: rEnd, s: [160, 160, 100] },
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
              s: { a: 0, k: [ringBaseW, ringBaseH] },
            },
            {
              ty: 'st',
              nm: 'Water Stroke',
              c: { a: 0, k: rgba },
              o: { a: 0, k: 90 },
              w: {
                a: 1,
                k: [
                  { t: rStart, s: [3.2], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                  { t: rEnd, s: [0.3] },
                ],
              },
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
