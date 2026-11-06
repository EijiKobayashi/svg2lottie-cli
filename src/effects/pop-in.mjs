/**
 * ポップイン（カートゥーン調 Squash & Stretch / 予備動作 ➔ 飛び出し ➔ 着地バウンス ➔ 呼吸アイドリング）エフェクトモジュール
 */

import { round4 } from '../path-parser.mjs';

const EASE_IN = { x: [0.55, 0.55, 0.55], y: [0, 0, 0] };
const EASE_OUT = { x: [0.16, 0.16, 0.16], y: [1, 1, 1] };
const EASE_IN_OUT = { x: [0.34, 0.34, 0.34], y: [1, 1, 1] };
const BOUNCE_OUT = { x: [0.22, 0.22, 0.22], y: [1.2, 1.2, 1.2] };

/**
 * ピクサー／カートゥーン調の生命感あふれる Squash & Stretch ポップインを適用する
 * （初期フレームから100%可視化し、非表示・画面外飛び出しを防止）
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
    start = 0,
    end = 56,
    jumpHeight = 28,
  } = options;

  const totalFrames = layer.op || 120;
  const origPos = layer.ks?.p?.k || ctx.center || [120, 120, 0];
  const px = Array.isArray(origPos) ? origPos[0] : 120;
  const py = Array.isArray(origPos) ? origPos[1] : 120;

  // アンカーポイントを中心 [px, py, 0] に保証
  layer.ks.a = { a: 0, k: [px, py, 0] };

  if (cartoon) {
    const t0 = start;
    const tAnticipate = t0 + 8; // 8f: ギュッと横に潰れて力を溜める
    const tJump = t0 + 16;      // 16f: 上空へビヨーンと伸びて跳び上がる
    const tPeak = t0 + 22;      // 22f: 頂点でふわり
    const tLand = t0 + 29;      // 29f: 着地してボヨンと潰れる
    const tRebound = t0 + 36;   // 36f: 反動で上にビヨン
    const tJiggle1 = t0 + 43;   // 43f: ぷるぷる振動1
    const tJiggle2 = t0 + 50;   // 50f: ぷるぷる振動2
    const tSettle = Math.min(totalFrames - 1, t0 + 58); // 58f: 収束

    // 58f〜120f: 呼吸アイドリング（Idle Breathing）
    const tBreath1 = tSettle + 14;
    const tBreath2 = tSettle + 28;
    const tBreath3 = tSettle + 42;

    layer.ks.s = {
      a: 1,
      k: [
        // 0fでも最初から姿が見えている（100%）
        { t: 0, s: [100, 100, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: t0, s: [100, 100, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        // 1. タメ (Anticipation): 地面にギュ〜ッと横に潰れて力を溜める
        { t: tAnticipate, s: [142, 60, 100], i: EASE_OUT, o: EASE_IN },
        // 2. 飛び出し (Stretch): ロケットのように縦長にビヨ〜ンと伸びる
        { t: tJump, s: [62, 152, 100], i: EASE_IN_OUT, o: EASE_OUT },
        // 3. 頂点 (Apex): 空中で一瞬ふわりと真円に戻る
        { t: tPeak, s: [98, 102, 100], i: EASE_IN, o: EASE_OUT },
        // 4. 着地 (Squash): ドスン！と着地してボヨンと横に広がる
        { t: tLand, s: [140, 68, 100], i: BOUNCE_OUT, o: EASE_IN_OUT },
        // 5. 反動 (Rebound): 跳ね返りで縦長にボヨン
        { t: tRebound, s: [88, 118, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        // 6. ぷるぷるゼリー振動 (Jiggle)
        { t: tJiggle1, s: [108, 93, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: tJiggle2, s: [96, 104, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: tSettle, s: [100, 100, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        // 7. 呼吸アイドリング (Idle Breathing): 愛らしく息づく
        { t: tBreath1, s: [104, 96, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: tBreath2, s: [98, 102, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: tBreath3, s: [103, 97, 100], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: totalFrames, s: [100, 100, 100] },
      ],
    };

    // 位置: タメ（沈み込み） ➔ 跳躍 ➔ 頂点 ➔ 着地 ➔ 定位置
    layer.ks.p = {
      a: 1,
      k: [
        { t: 0, s: [px, py, 0], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: t0, s: [px, py, 0], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: tAnticipate, s: [px, py + 8, 0], i: EASE_OUT, o: EASE_IN },
        { t: tJump, s: [px, py - jumpHeight, 0], i: EASE_IN_OUT, o: EASE_OUT },
        { t: tPeak, s: [px, py - jumpHeight - 4, 0], i: EASE_IN, o: EASE_OUT },
        { t: tLand, s: [px, py + 3, 0], i: BOUNCE_OUT, o: EASE_IN_OUT },
        { t: tRebound, s: [px, py - 4, 0], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: tSettle, s: [px, py, 0], i: EASE_IN_OUT, o: EASE_IN_OUT },
        { t: totalFrames, s: [px, py, 0] },
      ],
    };

    // 不透明度: 最初から最後まで常時100%可視化！
    layer.ks.o = { a: 0, k: 100 };

    return { layer, extraLayers: [] };
  }

  return { layer, extraLayers: [] };
}
