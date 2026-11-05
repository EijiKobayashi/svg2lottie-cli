/**
 * 水エフェクト（水滴の重力落下 ➔ 着水瞬間の消失 ➔ 美しい波紋リング拡散、および蛇口・天井からの水滴滴下）モジュール
 */

import { hexToLottieColor } from '../path-parser.mjs';

/**
 * 水滴の着水ストーリー（落下・着水・波紋拡散）または水滴滴下（膨らみ・くびれ・滴下）を生成する
 * @param {object} layer
 * @param {{
 *   mode?: 'drop-ripple' | 'ripple' | 'wave' | 'dripping',
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
  const h = ctx.height || 200;
  const rgba = hexToLottieColor(color);
  const totalFrames = layer.op || 120;

  const dur = Math.max(30, end - start);
  const extraLayers = [];

  // ==========================================
  // A. 水滴滴下モード (Dripping Drop)
  // 天井や蛇口から表面張力で徐々に水滴が膨らみ、縦長にくびれてポタッと滴下・着水する
  // ==========================================
  if (mode === 'dripping') {
    const startY = cy - Math.round(fallDistance * 0.7);
    const groundY = cy + Math.round(fallDistance * 0.6);

    const t0 = start;
    const tSwell = Math.round(start + dur * 0.22);
    const tNeck = Math.round(start + dur * 0.44);
    const tRelease = Math.round(start + dur * 0.48);
    const tImpact = Math.round(start + dur * 0.68);

    const easeInQuad = { x: [0.55, 0.55, 0.55], y: [0, 0, 0] };
    const easeOutQuad = { x: [0.25, 0.25, 0.25], y: [1, 1, 1] };

    // スケール: 膨らみ ➔ くびれ ➔ 落下時縦長 ➔ 着水時横潰れ ➔ 消失
    layer.ks.s = {
      a: 1,
      k: [
        { t: 0, s: [0, 0, 100] },
        { t: t0, s: [0, 0, 100], i: easeOutQuad, o: easeOutQuad },
        { t: tSwell, s: [100, 92, 100], i: easeInQuad, o: easeInQuad },
        { t: tNeck, s: [68, 145, 100], i: easeInQuad, o: easeInQuad }, // 表面張力でくびれて縦に伸びる
        { t: tRelease, s: [85, 120, 100], i: easeInQuad, o: easeInQuad },
        { t: tImpact - 2, s: [80, 125, 100], i: easeOutQuad, o: easeOutQuad },
        { t: tImpact, s: [145, 35, 100] }, // 着水でペチャッと潰れる
        { t: totalFrames, s: [0, 0, 100] },
      ],
    };

    // 位置: 垂れ下がり ➔ 重力加速落下
    layer.ks.p = {
      a: 1,
      k: [
        { t: 0, s: [cx, startY, 0] },
        { t: t0, s: [cx, startY, 0] },
        { t: tSwell, s: [cx, startY + 4, 0] },
        { t: tNeck, s: [cx, startY + 12, 0], i: easeInQuad, o: easeInQuad },
        { t: tRelease, s: [cx, startY + 20, 0], i: easeInQuad, o: easeInQuad },
        { t: tImpact, s: [cx, groundY, 0] },
        { t: totalFrames, s: [cx, groundY, 0] },
      ],
    };

    // 不透明度
    layer.ks.o = {
      a: 1,
      k: [
        { t: 0, s: [0] },
        { t: t0, s: [0] },
        { t: t0 + 2, s: [100] },
        { t: tImpact, s: [100] },
        { t: tImpact + 2, s: [0] },
        { t: totalFrames, s: [0] },
      ],
    };

    // 着水点での跳ね返り波紋リング
    const dripRingW = Math.round(w * 0.32);
    const dripRingH = Math.round(dripRingW * 0.42);
    const rStart = tImpact;
    const rEnd = Math.min(totalFrames, rStart + 36);

    extraLayers.push({
      ddd: 0,
      ind: (layer.ind || 1) + 401,
      ty: 4,
      nm: `${layer.nm}-drip-ripple`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: rStart, s: [0] },
            { t: rStart + 4, s: [85] },
            { t: rEnd, s: [0] },
            { t: totalFrames, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [cx, groundY + 4, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: rStart, s: [10, 10, 100], i: { x: [0.2], y: [1] }, o: { x: [0.3], y: [1] } },
            { t: rEnd, s: [130, 130, 100] },
            { t: totalFrames, s: [130, 130, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Drip Ripple Grp',
          it: [
            {
              ty: 'el',
              nm: 'Ellipse',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [dripRingW, dripRingH] },
            },
            {
              ty: 'st',
              nm: 'Stroke',
              c: { a: 0, k: rgba },
              o: { a: 0, k: 90 },
              w: {
                a: 1,
                k: [
                  { t: rStart, s: [2.5] },
                  { t: rEnd, s: [0.2] },
                  { t: totalFrames, s: [0.2] },
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
      op: totalFrames,
      st: 0,
      bm: 0,
    });

    // 跳ね返り水しぶき微粒子（Splash Drops）左右2つ
    for (const dir of [-1, 1]) {
      const spStart = tImpact + 1;
      const spEnd = Math.min(totalFrames, spStart + 22);
      const spDx = dir * Math.round(w * 0.12);
      const spDy = -Math.round(h * 0.08);

      extraLayers.push({
        ddd: 0,
        ind: (layer.ind || 1) + 402 + (dir > 0 ? 1 : 2),
        ty: 4,
        nm: `${layer.nm}-splash-${dir > 0 ? 'r' : 'l'}`,
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: spStart, s: [90] },
              { t: spEnd, s: [0] },
              { t: totalFrames, s: [0] },
            ],
          },
          r: { a: 0, k: 0 },
          p: {
            a: 1,
            k: [
              { t: spStart, s: [cx, groundY, 0], i: easeOutQuad, o: easeInQuad },
              { t: Math.round(spStart + (spEnd - spStart) * 0.45), s: [cx + Math.round(spDx * 0.6), groundY + spDy, 0] },
              { t: spEnd, s: [cx + spDx, groundY + 2, 0] },
              { t: totalFrames, s: [cx + spDx, groundY + 2, 0] },
            ],
          },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: spStart, s: [60, 60, 100] },
              { t: spEnd, s: [20, 20, 100] },
              { t: totalFrames, s: [20, 20, 100] },
            ],
          },
        },
        ao: 0,
        shapes: [
          {
            ty: 'gr',
            nm: 'Splash Drop Grp',
            it: [
              {
                ty: 'el',
                nm: 'Drop Dot',
                p: { a: 0, k: [0, 0] },
                s: { a: 0, k: [8, 8] },
              },
              {
                ty: 'fl',
                nm: 'Fill',
                c: { a: 0, k: rgba },
                o: { a: 0, k: 90 },
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
        ip: spStart,
        op: totalFrames,
        st: 0,
        bm: 0,
      });
    }

    return { layer, extraLayers };
  }

  // ==========================================
  // B. 着水・波紋ストーリーモード (Drop Ripple)
  // ==========================================
  const impactTime = Math.round(start + dur * 0.28); // 全体の28%の時点で着水

  // 1. 水滴本体の落下と着水消失アニメーション
  if (mode === 'drop-ripple') {
    const easeInQuad = { x: [0.55, 0.55, 0.55], y: [0, 0, 0] };
    const easeOutQuad = { x: [0.25, 0.25, 0.25], y: [1, 1, 1] };

    layer.ks.p = {
      a: 1,
      k: [
        { t: 0, s: [cx, cy - fallDistance, 0], i: easeInQuad, o: easeInQuad },
        { t: start, s: [cx, cy - fallDistance, 0], i: easeInQuad, o: easeInQuad },
        { t: impactTime, s: [cx, cy, 0] },
        { t: totalFrames, s: [cx, cy, 0] },
      ],
    };

    // 落下中は縦長にし、着水瞬間に横に潰れて消滅
    layer.ks.s = {
      a: 1,
      k: [
        { t: start, s: [85, 115, 100], i: easeInQuad, o: easeInQuad },
        { t: impactTime - 2, s: [80, 125, 100], i: easeOutQuad, o: easeOutQuad },
        { t: impactTime, s: [140, 40, 100] },
        { t: totalFrames, s: [100, 100, 100] },
      ],
    };

    layer.ks.o = {
      a: 1,
      k: [
        { t: start, s: [100] },
        { t: impactTime, s: [100] },
        { t: impactTime + 3, s: [0] },
        { t: totalFrames, s: [0] },
      ],
    };
  }

  // 2. 着水点からの多重波紋（Ripple）リング
  const ringBaseW = Math.round(w * 0.42);
  const ringBaseH = Math.round(ringBaseW * 0.45);

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
            { t: totalFrames, s: [0] },
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
            { t: totalFrames, s: [160, 160, 100] },
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
                  { t: totalFrames, s: [0.3] },
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
      op: totalFrames,
      st: 0,
      bm: 0,
    });
  }

  return { layer, extraLayers };
}
