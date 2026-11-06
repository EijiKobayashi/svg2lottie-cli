/**
 * 一筆書き枠線アニメーション（プロフェッショナル Trim Paths ＋ 先端グロースパーク ＋ 塗りポヨン充填 Fill Bounce）モジュール
 */

import { computeShapesCenter, round4 } from '../path-parser.mjs';
import { buildBleedFadeProps } from './bleed-fade.mjs';

export function buildTrimStrokeLayer(options) {
  const {
    ind = 1,
    id = 'stroke-layer',
    vertices = [
      [470, 20],
      [50, 20],
      [50, 120],
      [470, 120],
    ],
    closed = true,
    strokeWidth = 4,
    start = 0,
    end = 60,
    colorRgba = [0.149, 0.3098, 0.4549, 1],
    inFrame = 0,
    outFrame = 560,
    fadeOut,
  } = options;

  const shape = {
    c: closed,
    v: vertices,
    i: vertices.map(() => [0, 0]),
    o: vertices.map(() => [0, 0]),
  };
  const [cx, cy] = computeShapesCenter([shape]);
  const fadeProps = buildBleedFadeProps({
    initialOpacity: 100,
    fadeOut,
  });

  const trimKfs = [];
  if (start > 0) {
    trimKfs.push({
      t: 0,
      s: [0],
      i: { x: [0.5], y: [0.5] },
      o: { x: [0.5], y: [0.5] },
    });
  }
  trimKfs.push(
    { t: start, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
    { t: end, s: [100] }
  );

  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: id,
    sr: 1,
    ks: {
      o: fadeProps.opacity,
      r: { a: 0, k: 0 },
      p: { a: 0, k: [cx, cy, 0] },
      a: { a: 0, k: [cx, cy, 0] },
      s: fadeProps.scale,
    },
    ao: 0,
    ef: fadeProps.effects,
    shapes: [
      {
        ty: 'gr',
        nm: id,
        it: [
          {
            ty: 'sh',
            nm: 'Path 1',
            ks: { a: 0, k: shape },
          },
          {
            ty: 'tm',
            nm: 'Trim Paths 1',
            s: { a: 0, k: 0 },
            e: { a: 1, k: trimKfs },
            o: { a: 0, k: 0 },
            m: 1,
          },
          {
            ty: 'st',
            nm: 'Stroke 1',
            c: { a: 0, k: colorRgba },
            o: { a: 0, k: 100 },
            w: { a: 0, k: strokeWidth },
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
    ip: inFrame,
    op: outFrame,
    st: 0,
    bm: 0,
  };
}

/**
 * 既存シェイプレイヤーに一目瞭然な一筆書きアニメーションを適用する
 * 1. 0f〜48f: 本体の塗りは完全透明（0%）。枠線だけがスルスルッと0%〜100%まで走る！
 * 2. 48f〜65f: 枠線が閉じると同時に、内側の鮮やかな塗りがポヨンッと弾むようにスケールアップして満ちる！
 * 3. 65f〜105f: 完成したオブジェクトが優雅に呼吸（脈動）してループへ繋ぐ。
 */
export function applyTrimStroke(layer, options = {}, ctx = {}) {
  const {
    start = 8,
    end = 52,
    strokeWidth = 4.5,
    strokeColor = [0.65, 0.33, 0.97, 1], // 鮮やかなパープル
  } = options;

  const totalFrames = layer.op || 120;
  const drawDur = end - start;
  const fillStart = end;
  const fillPop = fillStart + 8;
  const fillRest = fillStart + 16;

  // 1. 本体の塗り（Fill）: 一筆書きが終わるまで絶対に表示しない（0%透過）
  // 描き終えた瞬間に 0% ➔ 100% へ弾けるように充填！
  const origScale = layer.ks?.s?.k || [100, 100, 100];
  const sx = Array.isArray(origScale) ? origScale[0] : 100;
  const sy = Array.isArray(origScale) ? origScale[1] : 100;

  layer.ks.o = {
    a: 1,
    k: [
      { t: 0, s: [0] },
      { t: fillStart - 1, s: [0] },
      { t: fillStart, s: [100] },
      { t: totalFrames - 12, s: [100] },
      { t: totalFrames, s: [0] }, // ループフェード
    ],
  };

  layer.ks.s = {
    a: 1,
    k: [
      { t: 0, s: [sx * 0.9, sy * 0.9, 100] },
      { t: fillStart, s: [sx * 0.9, sy * 0.9, 100] },
      {
        t: fillPop,
        s: [sx * 1.08, sy * 1.08, 100],
        i: { x: [0.18, 0.18, 0.18], y: [1, 1, 1] },
        o: { x: [0.32, 0.32, 0.32], y: [1, 1, 1] },
      },
      { t: fillRest, s: [sx, sy, 100] },
      { t: totalFrames, s: [sx, sy, 100] },
    ],
  };

  // 2. 元レイヤーのベジェパスを複製して、一筆書きストローク専用レイヤーを作成
  const extraLayers = [];

  const strokeShapes = [];
  if (Array.isArray(layer.shapes)) {
    for (const shapeGroup of layer.shapes) {
      if (Array.isArray(shapeGroup.it)) {
        for (const item of shapeGroup.it) {
          if (item.ty === 'sh') {
            strokeShapes.push(structuredClone(item));
          }
        }
      }
    }
  }

  if (strokeShapes.length > 0) {
    // 枠線がスルスルッと一周描かれるレイヤー（最前面）
    extraLayers.push({
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: `${layer.nm}-trim-stroke-line`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: start - 1, s: [0] },
            { t: start, s: [100] },
            { t: fillRest + 10, s: [100] },
            { t: fillRest + 22, s: [0] }, // 塗りが安定した後はストロークを優雅にフェードアウト
            { t: totalFrames, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: structuredClone(layer.ks?.p || { a: 0, k: [120, 120, 0] }),
        a: structuredClone(layer.ks?.a || { a: 0, k: [120, 120, 0] }),
        s: { a: 0, k: [sx, sy, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Trim Running Stroke',
          it: [
            ...strokeShapes,
            {
              ty: 'tm',
              nm: 'Trim Paths',
              s: { a: 0, k: 0 },
              e: {
                a: 1,
                k: [
                  { t: 0, s: [0] },
                  {
                    t: start,
                    s: [0],
                    i: { x: [0.2], y: [1] },
                    o: { x: [0.3], y: [1] },
                  },
                  { t: end, s: [100] },
                  { t: totalFrames, s: [100] },
                ],
              },
              o: { a: 0, k: 0 },
              m: 1,
            },
            {
              ty: 'st',
              nm: 'Draw Stroke',
              c: { a: 0, k: strokeColor },
              o: { a: 0, k: 100 },
              w: { a: 0, k: strokeWidth },
              lc: 2, // Round Cap
              lj: 2, // Round Join
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

  return { layer, extraLayers };
}
