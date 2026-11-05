/**
 * スライドイン（Push / Pull・移動展開）エフェクトモジュール
 */

import { round4 } from '../path-parser.mjs';

/**
 * 初期オフセット [cx + dx, cy + dy] から定位置 [cx, cy] へのイージング移動キーフレームを構築する
 * @param {{ cx: number, cy: number, dx?: number, dy?: number, start?: number, end?: number, overshoot?: number }} options
 */
export function buildMoveKeyframes(options = {}) {
  const {
    cx = 0,
    cy = 0,
    dx = 0,
    dy = 0,
    start = 0,
    end = 60,
    overshoot = 0,
  } = options;

  const startPos = [round4(cx + dx), round4(cy + dy), 0];
  const endPos = [round4(cx), round4(cy), 0];

  const kfs = [];
  if (start > 0) {
    kfs.push({
      t: 0,
      s: startPos,
      i: { x: 0.5, y: 0.5 },
      o: { x: 0.5, y: 0.5 },
    });
  }

  if (overshoot !== 0) {
    const midFrame = Math.round(start + (end - start) * 0.78);
    const len = Math.hypot(dx, dy) || 1;
    const overPos = [
      round4(cx - (dx / len) * overshoot),
      round4(cy - (dy / len) * overshoot),
      0,
    ];
    kfs.push(
      { t: start, s: startPos, i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
      { t: midFrame, s: overPos, i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
      { t: end, s: endPos }
    );
  } else {
    kfs.push(
      { t: start, s: startPos, i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
      { t: end, s: endPos }
    );
  }

  return { a: 1, k: kfs };
}

/**
 * レイヤーにスライドイン（Push / Pull）移動を適用する
 * @param {object} layer
 * @param {object} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applySlidePushPull(layer, options = {}, ctx = {}) {
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [260, 70];
  const mode = options.mode || 'slide';
  const overshoot =
    typeof options.overshoot === 'number'
      ? options.overshoot
      : mode === 'pull'
        ? 10
        : 0;

  layer.ks.p = buildMoveKeyframes({
    cx,
    cy,
    dx: options.dx ?? -120,
    dy: options.dy ?? 0,
    start: options.start ?? 0,
    end: options.end ?? 50,
    overshoot,
  });
  return { layer, extraLayers: [] };
}
