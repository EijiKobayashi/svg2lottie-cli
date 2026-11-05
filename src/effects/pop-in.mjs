/**
 * ポップイン（カートゥーン調 Squash & Stretch / 予備動作 ➔ 飛び出し ➔ 着地バウンス）エフェクトモジュール
 */

import { round4 } from '../path-parser.mjs';

const EASE_IN = { x: [0.55, 0.55, 0.55], y: [0, 0, 0] };
const EASE_OUT = { x: [0.16, 0.16, 0.16], y: [1, 1, 1] };
const EASE_IN_OUT = { x: [0.34, 0.34, 0.34], y: [1, 1, 1] };

/**
 * カートゥーン調のタメと伸び（Squash & Stretch）を伴う躍動的なポップ出現を適用する
 * @param {object} layer
 * @param {{
 *   cartoon?: boolean,
 *   start?: number,
 *   end?: number,
 *   jumpHeight?: number,
 *   fromScale?: number,
 *   overshootScale?: number
 * }} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applyPopIn(layer, options = {}, ctx = {}) {
  const {
    cartoon = true,
    start = 10,
    end = 54,
    jumpHeight = 22,
    fromScale = 0,
    overshootScale = 118,
  } = options;

  const totalFrames = layer.op || 120;
  const dur = Math.max(16, end - start);
  const origPos = layer.ks?.p?.k || ctx.center || [120, 120, 0];
  const px = Array.isArray(origPos) ? origPos[0] : 120;
  const py = Array.isArray(origPos) ? origPos[1] : 120;

  if (cartoon) {
    const t0 = start;
    const tAnticipate = Math.round(start + dur * 0.22); // タメ
    const tStretch = Math.round(start + dur * 0.44);    // 飛び出し
    const tLand = Math.round(start + dur * 0.68);       // 着地・ボヨン
    const tRebound = Math.round(start + dur * 0.85);    // 反発
    const tSettle = Math.min(end, start + dur);         // 収束

    layer.ks.s = {
      a: 1,
      k: [
        { t: 0, s: [0, 0, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: t0, s: [0, 0, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        // 1. タメ (Anticipation): 横にペチャッと潰れて力を溜める
        { t: tAnticipate, s: [124, 68, 100], i: EASE_OUT, o: EASE_IN },
        // 2. 飛び出し (Stretch): ビヨーンと縦長に伸びる
        { t: tStretch, s: [74, 142, 100], i: EASE_IN_OUT, o: EASE_OUT },
        // 3. 着地 (Overshoot Squash): ドスンと着地して横にボヨンと広がる
        { t: tLand, s: [126, 78, 100], i: EASE_OUT, o: EASE_IN_OUT },
        // 4. 反発 (Rebound)
        { t: tRebound, s: [92, 110, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        // 5. 収束（定位置維持）
        { t: tSettle, s: [100, 100, 100] },
        { t: totalFrames, s: [100, 100, 100] },
      ],
    };

    // 飛び出し時に少し上にジャンプする位置アニメーション
    layer.ks.p = {
      a: 1,
      k: [
        { t: 0, s: [px, py, 0] },
        { t: t0, s: [px, py, 0] },
        { t: tAnticipate, s: [px, py + 5, 0], i: EASE_OUT, o: EASE_IN },
        { t: tStretch, s: [px, py - jumpHeight, 0], i: EASE_IN_OUT, o: EASE_OUT },
        { t: tLand, s: [px, py, 0], i: EASE_OUT, o: EASE_IN_OUT },
        { t: tSettle, s: [px, py, 0] },
        { t: totalFrames, s: [px, py, 0] },
      ],
    };

    // 不透明度: 出現前は0%、タメ開始で100%になり、最後まで100%を維持
    layer.ks.o = {
      a: 1,
      k: [
        { t: 0, s: [0] },
        { t: t0, s: [0] },
        { t: t0 + 2, s: [100] },
        { t: totalFrames, s: [100] },
      ],
    };

    return { layer, extraLayers: [] };
  }

  // 通常の物理スプリング
  const tOver = Math.round(start + dur * 0.55);
  const tUnder = Math.round(start + dur * 0.8);
  layer.ks.s = {
    a: 1,
    k: [
      { t: 0, s: [fromScale, fromScale, 100], i: EASE_OUT, o: EASE_IN_OUT },
      { t: start, s: [fromScale, fromScale, 100], i: EASE_OUT, o: EASE_IN_OUT },
      { t: tOver, s: [overshootScale, overshootScale, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
      { t: tUnder, s: [95, 95, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
      { t: end, s: [100, 100, 100] },
      { t: totalFrames, s: [100, 100, 100] },
    ],
  };

  layer.ks.o = {
    a: 1,
    k: [
      { t: 0, s: [0] },
      { t: start, s: [0] },
      { t: start + 2, s: [100] },
      { t: totalFrames, s: [100] },
    ],
  };

  return { layer, extraLayers: [] };
}
