import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToLottieColor,
  parseSvgPathToLottieShapes,
  computeShapesCenter,
} from '../src/path-parser.mjs';

test('hexToLottieColor: #RGB と #RRGGBB を正規化RGBA配列に変換する', () => {
  assert.deepEqual(hexToLottieColor('#000000'), [0, 0, 0, 1]);
  assert.deepEqual(hexToLottieColor('#fff'), [1, 1, 1, 1]);
  assert.deepEqual(hexToLottieColor('#264f74'), [0.149, 0.3098, 0.4549, 1]);
  assert.throws(() => hexToLottieColor('invalid'), /Invalid hex color/);
});

test('parseSvgPathToLottieShapes: 直線・矩形・相対コマンド・円弧(A)をベジェ形状へ変換する', () => {
  const rectShapes = parseSvgPathToLottieShapes('M 10 20 H 110 V 70 H 10 Z');
  assert.equal(rectShapes.length, 1);
  assert.equal(rectShapes[0].c, true);
  assert.equal(rectShapes[0].v.length, 4);
  assert.deepEqual(rectShapes[0].v[0], [10, 20]);
  assert.deepEqual(rectShapes[0].v[2], [110, 70]);

  const curveAndArc = parseSvgPathToLottieShapes(
    'M 0 0 C 10 0 20 10 20 20 S 30 40 40 40 Q 50 40 60 20 T 80 0 A 15 15 0 0 1 100 0 Z'
  );
  assert.equal(curveAndArc.length, 1);
  assert.equal(curveAndArc[0].c, true);
  assert.ok(curveAndArc[0].v.length >= 6);
});

test('computeShapesCenter: 頂点群のバウンディングボックス中心を算出する', () => {
  const shapes = parseSvgPathToLottieShapes('M 20 40 L 120 40 L 120 100 L 20 100 Z');
  assert.deepEqual(computeShapesCenter(shapes), [70, 70]);
  assert.deepEqual(computeShapesCenter([], 260, 70), [260, 70]);
});
