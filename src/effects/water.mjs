/**
 * 水エフェクト（波紋リップルリング拡散・連続流体ウェーブ揺らぎ・水滴スプラッシュ）モジュール
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 水面の連続ウェーブ揺らぎ（wave）および楕円波紋リング（ripple）を生成する
 * @param {object} layer
 * @param {{
 *   mode?: 'ripple' | 'wave' | 'splash',
 *   start?: number,
 *   end?: number,
 *   rings?: number,
 *   amplitude?: number,
 *   color?: string
 * }} options
 * @param {{ width?: number, height?: number, center?: [number, number] }} ctx
 */
export function applyWater(layer, options = {}, ctx = {}) {
  const {
    mode = 'ripple',
    start = 30,
    end = 180,
    rings = 3,
    amplitude = 6,
    color = '#38bdf8',
  } = options;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [260, 70];
  const w = ctx.width || 600;
  const rgba = hexToLottieColor(color);

  // レイヤー自体にも心地よい水面の揺らぎ（スキュー角度の周期振動）を付与
  const waveCycles = 3;
  const step = Math.max(12, Math.round((end - start) / (waveCycles * 2)));
  const skewKfs = [];
  if (start > 0) {
    skewKfs.push({ t: 0, s: [0], i: { x: [0.42], y: [0] }, o: { x: [0.58], y: [1] } });
  }
  for (let i = 0; i <= waveCycles * 2; i++) {
    const t = Math.min(end, start + i * step);
    const val = i === waveCycles * 2 ? 0 : i % 2 === 0 ? amplitude * 0.45 : -amplitude * 0.45;
    skewKfs.push({
      t,
      s: [round4(val)],
      i: { x: [0.42], y: [0] },
      o: { x: [0.58], y: [1] },
    });
  }
  delete skewKfs[skewKfs.length - 1].i;
  delete skewKfs[skewKfs.length - 1].o;
  layer.ks.sk = { a: 1, k: skewKfs };
  layer.ks.sa = { a: 0, k: 0 };

  if (mode === 'wave') {
    return { layer, extraLayers: [] };
  }

  // キャンバスサイズに比例した自然な水面楕円リップルリングを生成
  const ringBaseW = Math.round(w * 0.22);
  const ringBaseH = Math.round(ringBaseW * 0.32);

  const extraLayers = [];
  for (let i = 0; i < rings; i++) {
    const rStart = start + i * 16;
    const rEnd = Math.min(end + 20, rStart + 64);

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
            { t: rStart + 10, s: [70], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
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
              s: [35, 35, 100],
              i: { x: [0.16, 0.16, 0.16], y: [1, 1, 1] },
              o: { x: [0.36, 0.36, 0.36], y: [1, 1, 1] },
            },
            { t: rEnd, s: [165, 165, 100] },
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
              o: { a: 0, k: 85 },
              w: {
                a: 1,
                k: [
                  { t: rStart, s: [3.5], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                  { t: rEnd, s: [0.5] },
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
