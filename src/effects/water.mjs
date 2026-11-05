/**
 * 水エフェクト（表面張力プルプル弾性振動・波紋リップルリング拡散・流体ウェーブ揺らぎ）モジュール
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 水滴の表面張力プルプル変形（スケールX/Y非対称振動）および波紋リングを生成する
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
    start = 0,
    end = 180,
    rings = 3,
    amplitude = 14,
    color = '#38bdf8',
  } = options;

  const [cx, cy] = ctx.center || layer.ks?.a?.k || [100, 100];
  const w = ctx.width || 200;
  const rgba = hexToLottieColor(color);

  // 1. 本体の表面張力プルプル弾性スケール（X軸・Y軸が逆位相でバウンドする流体物理）
  const dur = Math.max(24, end - start);
  const jellyKfs = [];
  const easeJelly = { x: [0.25, 0.25, 0.25], y: [1, 1, 1] };

  // 減衰するスプリング物理（4段階バウンス）
  const t0 = start;
  const t1 = Math.round(start + dur * 0.18);
  const t2 = Math.round(start + dur * 0.38);
  const t3 = Math.round(start + dur * 0.58);
  const t4 = Math.round(start + dur * 0.78);
  const t5 = Math.min(end, start + dur);

  jellyKfs.push(
    { t: t0, s: [100, 100, 100], i: easeJelly, o: easeJelly },
    // 1バウンス目: 横にボヨヨンと潰れる (X大, Y小)
    { t: t1, s: [round4(100 + amplitude), round4(100 - amplitude * 0.9), 100], i: easeJelly, o: easeJelly },
    // 2バウンス目: 縦に伸びる (X小, Y大)
    { t: t2, s: [round4(100 - amplitude * 0.7), round4(100 + amplitude * 0.75), 100], i: easeJelly, o: easeJelly },
    // 3バウンス目: 戻り反発 (X中大, Y中小)
    { t: t3, s: [round4(100 + amplitude * 0.4), round4(100 - amplitude * 0.35), 100], i: easeJelly, o: easeJelly },
    // 4バウンス目: 微小振動
    { t: t4, s: [round4(100 - amplitude * 0.15), round4(100 + amplitude * 0.15), 100], i: easeJelly, o: easeJelly },
    // 収束
    { t: t5, s: [100, 100, 100] }
  );

  layer.ks.s = { a: 1, k: jellyKfs };

  // 2. 本体の水面スキュー揺らぎ
  const waveCycles = 3;
  const step = Math.max(10, Math.round(dur / (waveCycles * 2)));
  const skewKfs = [];
  for (let i = 0; i <= waveCycles * 2; i++) {
    const t = Math.min(end, start + i * step);
    const val = i === waveCycles * 2 ? 0 : (i % 2 === 0 ? 1 : -1) * (amplitude * 0.25);
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

  // 3. 水滴・波紋リップルリング（キャンバスサイズ連動）
  const ringBaseW = Math.round(w * 0.28);
  const ringBaseH = Math.round(ringBaseW * 0.36);

  const extraLayers = [];
  for (let i = 0; i < rings; i++) {
    const rStart = start + i * 18;
    const rEnd = Math.min(end + 20, rStart + 56);

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
            { t: rStart + 8, s: [75], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
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
              s: [30, 30, 100],
              i: { x: [0.16, 0.16, 0.16], y: [1, 1, 1] },
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
                  { t: rEnd, s: [0.4] },
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
