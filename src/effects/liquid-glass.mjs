/**
 * すりガラス・グラスプレート・Apple風リキッドグラス（有機的液状変形 Liquid Blob ＋ 立体エッジリム ＋ 屈折グロス光沢シマー）モジュール
 */

import { round4 } from '../path-parser.mjs';

/**
 * 液体の表面張力でぷるぷると有機的に流動するベジェブロブ形状キーフレームを生成する
 */
function buildLiquidBlobKeyframes(cx, cy, baseRadius, totalFrames = 120) {
  const numPoints = 8;
  const numKeyframes = 9; // 8区間でシームレスループ
  const step = totalFrames / (numKeyframes - 1);
  const kfs = [];
  const easeInOut = { x: 0.35, y: 0.65 };

  for (let k = 0; k < numKeyframes; k++) {
    const t = Math.round(k * step);
    const timeAngle = (k / (numKeyframes - 1)) * Math.PI * 2;

    const v = [];
    const inHandles = [];
    const outHandles = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      // 液体の流動波動: 2次調波と3次調波の合成でぷるぷると有機的に変形
      const wave = Math.sin(angle * 2 + timeAngle) * 5.2 + Math.cos(angle * 3 - timeAngle) * 3.2;
      const r = baseRadius + wave;

      const px = round4(cx + Math.cos(angle) * r);
      const py = round4(cy + Math.sin(angle) * r);
      v.push([px, py]);

      // 接線ハンドル（3次ベジェの滑らかな液状カーブ）
      const tangentLen = (r * (Math.PI * 2) / numPoints) * 0.36;
      const tangAngle = angle + Math.PI / 2;
      const hx = round4(Math.cos(tangAngle) * tangentLen);
      const hy = round4(Math.sin(tangAngle) * tangentLen);

      inHandles.push([-hx, -hy]);
      outHandles.push([hx, hy]);
    }

    kfs.push({
      t,
      s: [{ c: true, v, i: inHandles, o: outHandles }],
      ...(k < numKeyframes - 1 ? { i: easeInOut, o: easeInOut } : {}),
    });
  }

  return kfs;
}

/**
 * Apple風リキッドグラス（有機的液状変形 Liquid Blob ＋ 立体エッジリム ＋ 屈折グロス光沢シマー）を適用する
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
    tintOpacity = 42,
    start = 10,
    end = 110,
  } = options;

  const totalFrames = layer.op || 120;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [120, 120];
  const w = ctx.width || 240;
  const h = ctx.height || 240;

  // 枠内収容: 半径50px（直径約100px、240pxステージ枠の中央でゆったり収まる）
  const blobRadius = Math.round(Math.min(w, h) * 0.22);
  const blobKeyframes = buildLiquidBlobKeyframes(cx, cy, blobRadius, totalFrames);

  // 1. 本体レイヤー: 有機的液状変形する半透明フロストグラス
  layer.shapes = [
    {
      ty: 'gr',
      nm: 'Liquid Glass Blob Grp',
      it: [
        {
          ty: 'sh',
          nm: 'Liquid Blob Path',
          ks: {
            a: 1,
            k: blobKeyframes,
          },
        },
        {
          ty: 'fl',
          nm: 'Glass Frost Fill',
          // Lightモードの白背景でも美しく映えるトランスルーセント・エメラルドブルー
          c: { a: 0, k: [0.22, 0.65, 0.92, 1] },
          o: { a: 0, k: tintOpacity },
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
  ];

  layer.ks.p = { a: 0, k: [cx, cy, 0] };
  layer.ks.o = { a: 0, k: 100 };
  layer.ks.s = { a: 0, k: [100, 100, 100] };

  const extraLayers = [];

  // 2. 立体ガラスエッジ（本体と完全に同期してぷるぷる流動する純白エッジリム）
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
        nm: 'Liquid Specular Rim',
        it: [
          {
            ty: 'sh',
            nm: 'Rim Blob Path',
            ks: {
              a: 1,
              k: blobKeyframes,
            },
          },
          {
            ty: 'st',
            nm: 'Specular Edge Stroke',
            c: { a: 0, k: [0.95, 0.98, 1, 1] },
            o: { a: 0, k: 95 },
            w: { a: 0, k: 2.8 },
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

  // 3. ガラス内部の屈折コースティクスリング（内側で淡く揺らめく）
  const innerBlobKeyframes = blobKeyframes.map((kf) => ({
    ...kf,
    s: kf.s.map((shape) => ({
      c: true,
      v: shape.v.map(([vx, vy]) => [
        round4(cx + (vx - cx) * 0.72),
        round4(cy + (vy - cy) * 0.72),
      ]),
      i: shape.i.map(([ix, iy]) => [round4(ix * 0.72), round4(iy * 0.72)]),
      o: shape.o.map(([ox, oy]) => [round4(ox * 0.72), round4(oy * 0.72)]),
    })),
  }));

  extraLayers.push({
    ddd: 0,
    ind: (layer.ind || 1) + 115,
    ty: 4,
    nm: `${layer.nm}-glass-caustic-inner`,
    sr: 1,
    ks: {
      o: { a: 0, k: 55 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [cx, cy, 0] },
      a: { a: 0, k: [cx, cy, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        nm: 'Caustic Inner',
        it: [
          {
            ty: 'sh',
            nm: 'Inner Caustic Blob',
            ks: {
              a: 1,
              k: innerBlobKeyframes,
            },
          },
          {
            ty: 'st',
            nm: 'Caustic Stroke',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: { a: 0, k: 60 },
            w: { a: 0, k: 1.5 },
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

  // 4. ガラス表面を斜め45度にツヤ〜ンと横切るグロス光沢シマー
  const sweepDur = Math.max(24, Math.round((end - start) * 0.38));
  const sweepStart = start + 12;
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
          { t: 0, s: [cx - blobRadius * 1.5, cy - blobRadius * 1.5, 0] },
          {
            t: sweepStart,
            s: [cx - blobRadius * 1.5, cy - blobRadius * 1.5, 0],
            i: { x: [0.16, 0.16, 0.16], y: [1, 1, 1] },
            o: { x: [0.32, 0.32, 0.32], y: [1, 1, 1] },
          },
          { t: sweepEnd, s: [cx + blobRadius * 1.5, cy + blobRadius * 1.5, 0] },
          { t: totalFrames, s: [cx + blobRadius * 1.5, cy + blobRadius * 1.5, 0] },
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
            nm: 'Sharp Highlight',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [16, Math.round(blobRadius * 2.4)] },
            r: { a: 0, k: 3 },
          },
          {
            ty: 'fl',
            nm: 'Gloss Fill',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: { a: 0, k: 88 },
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
    op: sweepEnd + 2,
    st: 0,
    bm: 0,
  });

  return { layer, extraLayers };
}
