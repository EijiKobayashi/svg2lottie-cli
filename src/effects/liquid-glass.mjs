/**
 * すりガラス・グラスプレート・Apple風リキッドグラス（境界クリップマスク＋立体エッジリム＋屈折シマー光沢）モジュール
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
 * Apple風リキッドグラス（ガラス枠内クリップ＋立体エッジリム＋屈折グロス光沢シマー）を適用する
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
    tintOpacity = 32,
    start = 15,
    end = 105,
  } = options;

  const totalFrames = layer.op || 120;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [120, 120];
  const w = ctx.width || 240;
  const h = ctx.height || 240;

  // 1. 本体レイヤー: 高級感ある半透明アメジスト・フロストガラスプレート
  for (const grp of layer.shapes || []) {
    for (const it of grp.it || []) {
      if (it.ty === 'fl') {
        it.c = { a: 0, k: [0.58, 0.42, 0.92, 1] }; // 上品なトランスルーセント・パープル
        it.o = { a: 0, k: tintOpacity };
      }
    }
  }

  // 位置は中央で静止、不透明度100%
  layer.ks.p = { a: 0, k: [cx, cy, 0] };
  layer.ks.o = { a: 0, k: 100 };
  layer.ks.s = { a: 0, k: [100, 100, 100] };

  const extraLayers = [];
  const contourShapes = collectLayerShapes(layer);
  const primaryShape = contourShapes[0] || null;

  // 2. 立体ガラスエッジ（純白の光るエッジリム境界線ストローク）
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
              o: { a: 0, k: 88 },
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

  // 3. ガラス内部を斜めに走る屈折光沢シマー帯（ガラス形状に加算マスクで完全クリップ！）
  const sweepDur = Math.max(26, Math.round((end - start) * 0.42));
  const sweepStart = start + 8;
  const sweepEnd = sweepStart + sweepDur;

  const glossLayer = {
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
          { t: sweepStart + 4, s: [90] },
          { t: sweepEnd - 4, s: [90] },
          { t: sweepEnd, s: [0] },
          { t: totalFrames, s: [0] },
        ],
      },
      r: { a: 0, k: -38 }, // 斜め38度のシャープな光沢
      p: {
        a: 1,
        k: [
          { t: 0, s: [cx - w * 0.55, cy - h * 0.55, 0] },
          { t: sweepStart, s: [cx - w * 0.55, cy - h * 0.55, 0], i: { x: 0.16, y: 1 }, o: { x: 0.32, y: 1 } },
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
          // メインのシャープな純白ハイライト帯
          {
            ty: 'rc',
            nm: 'Sharp Highlight',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [22, Math.round(h * 1.6)] },
            r: { a: 0, k: 3 },
          },
          {
            ty: 'fl',
            nm: 'Sharp Fill',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: { a: 0, k: 95 },
            r: 1,
          },
          // 追従する柔らかい屈折シマー帯
          {
            ty: 'rc',
            nm: 'Soft Shimmer',
            p: { a: 0, k: [20, 0] },
            s: { a: 0, k: [10, Math.round(h * 1.6)] },
            r: { a: 0, k: 2 },
          },
          {
            ty: 'fl',
            nm: 'Soft Fill',
            c: { a: 0, k: [0.88, 0.95, 1, 1] },
            o: { a: 0, k: 55 },
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
  };

  // ガラス枠外へ光が漏れないよう、本体形状の加算マスクを付与
  if (primaryShape) {
    glossLayer.hasMask = true;
    glossLayer.masksProperties = [
      {
        inv: false,
        mode: 'a',
        pt: { a: 0, k: primaryShape },
        o: { a: 0, k: 100 },
        x: { a: 0, k: 0 },
        nm: 'Glass Clip Mask',
      },
    ];
  }

  extraLayers.push(glossLayer);

  return { layer, extraLayers };
}
