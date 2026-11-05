/**
 * すりガラス・グラスプレート・Apple風リキッドグラス（立体エッジリム＋斜め光沢シマースイープ）モジュール
 */

import { round4 } from '../path-parser.mjs';

function collectLayerShapes(layer) {
  const found = [];
  function walk(items) {
    for (const it of items || []) {
      if (it.ty === 'sh' && it.ks?.k) {
        found.push(it.ks.k);
      } else if (it.ty === 'gr' && Array.isArray(it.it)) {
        walk(it.it);
      }
    }
  }
  walk(layer.shapes);
  return found;
}

/**
 * Apple風リキッドグラス（立体エッジリム＋斜め走るグロス光沢シマー＋浮遊フロート）を適用する
 * @param {object} layer
 * @param {{
 *   variant?: 'liquid' | 'frosted' | 'plate',
 *   blur?: number,
 *   tintOpacity?: number,
 *   start?: number,
 *   end?: number
 * }} options
 * @param {{ width?: number, height?: number, center?: [number, number] }} ctx
 */
export function applyLiquidGlass(layer, options = {}, ctx = {}) {
  const {
    variant = 'liquid',
    blur = 16,
    tintOpacity = 22,
    start = 10,
    end = 110,
  } = options;

  const [cx, cy] = ctx.center || layer.ks?.a?.k || [100, 100];
  const w = ctx.width || 200;
  const h = ctx.height || 200;

  // 1. 本体レイヤーを半透明のすりガラスフロスト調に設定
  for (const grp of layer.shapes || []) {
    for (const it of grp.it || []) {
      if (it.ty === 'fl') {
        it.o = { a: 0, k: tintOpacity };
      }
    }
  }

  // 2. 空中浮遊（Float Animation）
  const dur = Math.max(20, end - start);
  const origPos = layer.ks?.p?.k || [cx, cy, 0];
  const px = Array.isArray(origPos) ? origPos[0] : cx;
  const py = Array.isArray(origPos) ? origPos[1] : cy;

  const easeFloat = { x: [0.37, 0.37, 0.37], y: [1, 1, 1] };
  layer.ks.p = {
    a: 1,
    k: [
      { t: start, s: [px, py, 0], i: easeFloat, o: easeFloat },
      { t: Math.round(start + dur * 0.45), s: [px, py - 4, 0], i: easeFloat, o: easeFloat },
      { t: end, s: [px, py, 0] },
    ],
  };

  const extraLayers = [];

  // 3. 立体ガラスエッジ（純白の繊細なスペキュラ枠線ストローク）
  const contourShapes = collectLayerShapes(layer);
  if (contourShapes.length > 0) {
    const rimShapes = contourShapes.slice(0, 4).map((sh, idx) => ({
      ty: 'sh',
      nm: `Rim Contour ${idx + 1}`,
      ks: { a: 0, k: sh },
    }));

    extraLayers.push({
      ddd: 0,
      ind: (layer.ind || 1) + 110,
      ty: 4,
      nm: `${layer.nm}-glass-specular-rim`,
      sr: 1,
      ks: structuredClone(layer.ks),
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Glass Specular Rim',
          it: [
            ...rimShapes,
            {
              ty: 'st',
              nm: 'Specular Edge Stroke',
              c: { a: 0, k: [1, 1, 1, 1] },
              o: {
                a: 1,
                k: [
                  { t: start, s: [45] },
                  { t: Math.round(start + dur * 0.5), s: [85] },
                  { t: end, s: [45] },
                ],
              },
              w: { a: 0, k: 1.8 },
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
      ip: layer.ip || 0,
      op: layer.op || 180,
      st: 0,
      bm: 0,
    });
  }

  // 4. ガラス表面を斜めにサッと横切る美しいグロス光沢シマー帯（Diagonal Gloss Sweep）
  const sweepDur = Math.round(dur * 0.45);
  const sweepStart = Math.round(start + dur * 0.2);
  const sweepEnd = sweepStart + sweepDur;

  extraLayers.push({
    ddd: 0,
    ind: (layer.ind || 1) + 120,
    ty: 4,
    nm: `${layer.nm}-liquid-gloss-shimmer`,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: sweepStart - 2, s: [0] },
          { t: sweepStart + 5, s: [65] },
          { t: sweepEnd - 5, s: [65] },
          { t: sweepEnd, s: [0] },
        ],
      },
      r: { a: 0, k: -35 }, // 斜め35度のハイライト帯
      p: {
        a: 1,
        k: [
          { t: sweepStart, s: [cx - w * 0.6, cy - h * 0.5, 0], i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
          { t: sweepEnd, s: [cx + w * 0.6, cy + h * 0.5, 0] },
        ],
      },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    ef: [
      {
        ty: 29,
        nm: 'Gloss Blur',
        np: 3,
        mn: 'ADBE Gaussian Blur 2',
        ix: 1,
        en: 1,
        ef: [
          { ty: 0, nm: 'Blurriness', mn: 'ADBE Gaussian Blur 2-0001', ix: 1, v: { a: 0, k: blur * 0.6 } },
          { ty: 7, nm: 'Blur Dimensions', mn: 'ADBE Gaussian Blur 2-0002', ix: 2, v: { a: 0, k: 1 } },
          { ty: 7, nm: 'Repeat Edge Pixels', mn: 'ADBE Gaussian Blur 2-0003', ix: 3, v: { a: 0, k: 0 } },
        ],
      },
    ],
    shapes: [
      {
        ty: 'gr',
        nm: 'Gloss Band',
        it: [
          {
            ty: 'rc',
            nm: 'Gloss Rect',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [Math.round(w * 0.25), Math.round(h * 1.4)] },
            r: { a: 0, k: 4 },
          },
          {
            ty: 'fl',
            nm: 'Gloss Fill',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: { a: 0, k: 80 },
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
    ip: sweepStart - 2,
    op: sweepEnd,
    st: 0,
    bm: 0,
  });

  return { layer, extraLayers };
}
