/**
 * すりガラス・グラスプレート・Apple風リキッドグラス（立体エッジリム＋走るグロス光沢シマー）モジュール
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
 * Apple風リキッドグラス（立体エッジリム＋斜め走るグロス光沢シマー）を適用する
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
    tintOpacity = 28,
    start = 15,
    end = 105,
  } = options;

  const totalFrames = layer.op || 120;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [120, 120];
  const w = ctx.width || 240;
  const h = ctx.height || 240;

  // 1. 本体レイヤーを半透明のすりガラスフロスト調に設定（上下揺れは削除し、ガラスの厚みと透明感を表現）
  for (const grp of layer.shapes || []) {
    for (const it of grp.it || []) {
      if (it.ty === 'fl') {
        it.c = { a: 0, k: [0.65, 0.45, 0.95, 1] }; // 綺麗なアメジスト・グラス
        it.o = { a: 0, k: tintOpacity };
      }
    }
  }

  // 位置は中央で静止、不透明度は100%維持
  layer.ks.p = { a: 0, k: [cx, cy, 0] };
  layer.ks.o = { a: 0, k: 100 };
  layer.ks.s = { a: 0, k: [100, 100, 100] };

  const extraLayers = [];

  // 2. 立体ガラスエッジ（純白の光るエッジリム境界線ストローク）
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
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [cx, cy, 0] },
        a: { a: 0, k: [cx, cy, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
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
              o: { a: 0, k: 85 },
              w: { a: 0, k: 2.2 },
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
      ip: 0,
      op: totalFrames,
      st: 0,
      bm: 0,
    });
  }

  // 3. ガラス表面を斜めにサッと横切る美しいグロス光沢シマー帯（Gloss Specular Sweep）
  const sweepDur = Math.round((end - start) * 0.5);
  const sweepStart = start;
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
          { t: 0, s: [0] },
          { t: sweepStart - 2, s: [0] },
          { t: sweepStart + 4, s: [80] },
          { t: sweepEnd - 4, s: [80] },
          { t: sweepEnd, s: [0] },
          { t: totalFrames, s: [0] },
        ],
      },
      r: { a: 0, k: -35 }, // 斜め35度の光沢
      p: {
        a: 1,
        k: [
          { t: 0, s: [cx - w * 0.55, cy - h * 0.55, 0] },
          { t: sweepStart, s: [cx - w * 0.55, cy - h * 0.55, 0], i: { x: 0.18, y: 1 }, o: { x: 0.32, y: 1 } },
          { t: sweepEnd, s: [cx + w * 0.55, cy + h * 0.55, 0] },
          { t: totalFrames, s: [cx + w * 0.55, cy + h * 0.55, 0] },
        ],
      },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        nm: 'Gloss Band',
        it: [
          {
            ty: 'rc',
            nm: 'Gloss Rect',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [32, Math.round(h * 1.5)] }, // シャープな光沢帯
            r: { a: 0, k: 3 },
          },
          {
            ty: 'fl',
            nm: 'Gloss Fill',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: { a: 0, k: 85 },
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
    ip: 0,
    op: totalFrames,
    st: 0,
    bm: 0,
  });

  return { layer, extraLayers };
}
