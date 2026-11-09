import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrimPathsItem,
  buildOffsetPathsItem,
  buildMergePathsItem,
  buildRepeaterItem,
  buildRoundCornersItem,
  buildGradientFillItem,
  buildGradientStrokeItem,
  applyShapeModifiers,
} from '../src/shape-modifiers.mjs';

test('Trim Paths (tm): 線の開始・終了・オフセットアニメーションを生成する', () => {
  const trimItem = buildTrimPathsItem({
    start: 0,
    end: 100,
    startFrame: 0,
    endFrame: 60,
  });

  assert.equal(trimItem.ty, 'tm');
  assert.equal(trimItem.m, 1);
  assert.ok(trimItem.e);
  // キーフレームが生成されていること
  assert.equal(trimItem.e.a, 1);
  assert.equal(trimItem.e.k[0].t, 0);
  assert.deepEqual(trimItem.e.k[0].s, [0]);
  assert.equal(trimItem.e.k[1].t, 60);
  assert.deepEqual(trimItem.e.k[1].s, [100]);

  // ローディング用複数キーフレーム
  const loadingTrim = buildTrimPathsItem({
    startKeyframes: [
      { frame: 0, value: 0 },
      { frame: 45, value: 0 },
      { frame: 90, value: 75 },
    ],
    endKeyframes: [
      { frame: 0, value: 15 },
      { frame: 45, value: 85 },
      { frame: 90, value: 90 },
    ],
    offsetKeyframes: [
      { frame: 0, value: 0 },
      { frame: 90, value: 360 },
    ],
  });
  assert.equal(loadingTrim.s.a, 1);
  assert.equal(loadingTrim.s.k.length, 3);
  assert.equal(loadingTrim.e.a, 1);
  assert.equal(loadingTrim.e.k.length, 3);
  assert.equal(loadingTrim.o.a, 1);
  assert.equal(loadingTrim.o.k.length, 2);
});

test('Offset Paths (op): パスの拡大・縮小・肉付けを生成する', () => {
  const opItem = buildOffsetPathsItem({
    amount: 12,
    lineJoin: 'round',
    miterLimit: 4,
  });

  assert.equal(opItem.ty, 'op');
  assert.equal(opItem.lj, 2); // 2: round
  assert.deepEqual(opItem.ml, { a: 0, k: 4 });
  assert.deepEqual(opItem.a, { a: 0, k: 12 });

  // キーフレームアニメーション
  const animOp = buildOffsetPathsItem({
    amount: 15,
    fromAmount: 0,
    startFrame: 10,
    endFrame: 40,
  });
  assert.equal(animOp.a.a, 1);
  assert.equal(animOp.a.k[0].t, 10);
  assert.deepEqual(animOp.a.k[0].s, [0.01]);
  assert.equal(animOp.a.k[1].t, 40);
  assert.deepEqual(animOp.a.k[1].s, [15]);
});

test('Merge Paths (mm): Add/Subtract/Intersect/Exclude モードを正しくマッピングする', () => {
  assert.equal(buildMergePathsItem({ mode: 'merge' }).mm, 1);
  assert.equal(buildMergePathsItem({ mode: 'add' }).mm, 2);
  assert.equal(buildMergePathsItem({ mode: 'subtract' }).mm, 3);
  assert.equal(buildMergePathsItem({ mode: 'intersect' }).mm, 4);
  assert.equal(buildMergePathsItem({ mode: 'exclude' }).mm, 5);
  // デフォルトは add (2)
  assert.equal(buildMergePathsItem({}).mm, 2);
  assert.equal(buildMergePathsItem({}).ty, 'mm');
});

test('Repeater (rp): シェイプの配列複製・回転・スケールを生成する', () => {
  const rp = buildRepeaterItem({
    copies: 6,
    offset: 0,
    rotation: 60,
    scale: [100, 100],
    position: [0, 0],
    startOpacity: 100,
    endOpacity: 80,
  });

  assert.equal(rp.ty, 'rp');
  assert.deepEqual(rp.c, { a: 0, k: 6 });
  assert.deepEqual(rp.o, { a: 0, k: 0 });
  assert.ok(rp.tr);
  assert.deepEqual(rp.tr.r, { a: 0, k: 60 });
  assert.deepEqual(rp.tr.so, { a: 0, k: 100 });
  assert.deepEqual(rp.tr.eo, { a: 0, k: 80 });

  // 動的回転＆増殖キーフレームアニメーション
  const animRp = buildRepeaterItem({
    copies: 8,
    fromCopies: 1,
    rotation: 60,
    fromRotation: 0,
    startFrame: 0,
    endFrame: 45,
  });
  assert.equal(animRp.c.a, 1);
  assert.equal(animRp.tr.r.a, 1);
});

test('Round Corners (rd): 動的角丸半径を生成する', () => {
  const rd = buildRoundCornersItem({ radius: 16 });
  assert.equal(rd.ty, 'rd');
  assert.deepEqual(rd.r, { a: 0, k: 16 });

  const animRd = buildRoundCornersItem({
    radius: 20,
    fromRadius: 0,
    startFrame: 0,
    endFrame: 30,
  });
  assert.equal(animRd.r.a, 1);
  assert.equal(animRd.r.k[0].t, 0);
  assert.deepEqual(animRd.r.k[0].s, [0]);
  assert.equal(animRd.r.k[1].t, 30);
  assert.deepEqual(animRd.r.k[1].s, [20]);
});

test('Gradient Fill (gf) & Gradient Stroke (gs): 線形・放射状カラーストップを生成する', () => {
  const gf = buildGradientFillItem({
    type: 'linear',
    start: [0, 0],
    end: [520, 0],
    stops: [
      { offset: 0, color: '#ff0000' },
      { offset: 1, color: '#0000ff' },
    ],
  });

  assert.equal(gf.ty, 'gf');
  assert.equal(gf.t, 1); // linear
  assert.deepEqual(gf.s, { a: 0, k: [0, 0] });
  assert.deepEqual(gf.e, { a: 0, k: [520, 0] });
  assert.equal(gf.g.p, 2);
  // stops: [0, 1, 0, 0, 1, 0, 0, 1]
  assert.equal(gf.g.k.k[0], 0); // offset 0
  assert.equal(gf.g.k.k[1], 1); // R
  assert.equal(gf.g.k.k[4], 1); // offset 1
  assert.equal(gf.g.k.k[7], 1); // B

  // 動的位置移動キーフレーム（無限シマー）
  const animGf = buildGradientFillItem({
    type: 'linear',
    fromStart: [-100, -100],
    start: [400, 400],
    fromEnd: [0, 0],
    end: [500, 500],
    startFrame: 0,
    endFrame: 90,
  });
  assert.equal(animGf.s.a, 1);
  assert.equal(animGf.e.a, 1);

  const gs = buildGradientStrokeItem({
    type: 'radial',
    width: 6,
    start: [100, 100],
    end: [200, 200],
    stops: [
      { offset: 0, color: '#00ff00' },
      { offset: 1, color: '#ffff00' },
    ],
  });
  assert.equal(gs.ty, 'gs');
  assert.equal(gs.t, 2); // radial
  assert.deepEqual(gs.w, { a: 0, k: 6 });
});

test('applyShapeModifiers: シェイプグループにモディファイアを適切な順序で合成する', () => {
  const initialItems = [
    { ty: 'sh', nm: 'Path 1' },
    { ty: 'fl', nm: 'Fill 1' },
    { ty: 'tr', nm: 'Transform' },
  ];

  const layerCfg = {
    roundCorners: { radius: 10 },
    offsetPaths: { amount: 5 },
    trim: { start: 0, end: 100, startFrame: 0, endFrame: 30 },
    repeater: { copies: 3, rotation: 120 },
  };

  const modified = applyShapeModifiers(initialItems, layerCfg);

  // パス -> roundCorners -> offsetPaths -> repeater -> trim -> fill -> transform
  const types = modified.map((it) => it.ty);
  assert.ok(types.includes('sh'));
  assert.ok(types.includes('rd'));
  assert.ok(types.includes('op'));
  assert.ok(types.includes('rp'));
  assert.ok(types.includes('tm'));
  assert.ok(types.includes('fl'));
  assert.ok(types.includes('tr'));

  // トランスフォームが末尾にあること
  assert.equal(types[types.length - 1], 'tr');

  // fill: false の場合は塗りが除外されること
  const noFillItems = applyShapeModifiers(initialItems, { fill: false });
  assert.equal(noFillItems.some((it) => it.ty === 'fl'), false);

  // mergePaths + offsetPaths の場合、mm の直後に op が入ること
  const mergedWithOffset = applyShapeModifiers(initialItems, {
    mergePaths: { mode: 'add' },
    offsetPaths: { amount: -10 },
  });
  const mTypes = mergedWithOffset.map((it) => it.ty);
  const mmIdx = mTypes.indexOf('mm');
  assert.ok(mmIdx !== -1);
  assert.equal(mTypes[mmIdx + 1], 'op');
});

test('buildLottieFromStoryboard: layerCfgのシェイプモディファイアがLottie JSONに正しく統合される', async () => {
  const { buildLottieFromStoryboard } = await import('../src/lottie-builder.mjs');

  const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path id="star" d="M 50 10 L 60 40 L 90 40 L 65 60 L 75 90 L 50 70 L 25 90 L 35 60 L 10 40 L 40 40 Z" fill="#38bdf8" />
  </svg>`;

  const config = {
    name: 'modifier-test',
    width: 200,
    height: 200,
    fps: 60,
    durationFrames: 60,
    layers: [
      {
        id: 'star-layer',
        svg: 'svg/star.svg',
        targetId: 'star',
        trim: { start: 0, end: 100, startFrame: 0, endFrame: 40 },
        offsetPaths: { amount: 8 },
        repeater: { copies: 4, rotation: 90 },
        roundCorners: { radius: 12 },
        gradientFill: {
          type: 'linear',
          start: [0, 0],
          end: [200, 200],
          stops: [
            { offset: 0, color: '#f43f5e' },
            { offset: 1, color: '#fbbf24' },
          ],
        },
      },
    ],
  };

  const svgResolver = () => sampleSvg;
  const lottie = buildLottieFromStoryboard(config, svgResolver);

  assert.equal(lottie.v, '5.12.2');
  assert.equal(lottie.w, 200);
  assert.equal(lottie.h, 200);
  assert.equal(lottie.layers.length, 1);

  const layer = lottie.layers[0];
  assert.equal(layer.nm, 'star-layer');
  const group = layer.shapes[0];
  assert.equal(group.ty, 'gr');

  const itemTypes = group.it.map((it) => it.ty);
  assert.ok(itemTypes.includes('sh'), 'Path shape must exist');
  assert.ok(itemTypes.includes('tm'), 'Trim Paths must exist');
  assert.ok(itemTypes.includes('op'), 'Offset Paths must exist');
  assert.ok(itemTypes.includes('rp'), 'Repeater must exist');
  assert.ok(itemTypes.includes('rd'), 'Round Corners must exist');
  assert.ok(itemTypes.includes('gf'), 'Gradient Fill must exist');
  assert.equal(itemTypes[itemTypes.length - 1], 'tr', 'Transform must be last');
});

