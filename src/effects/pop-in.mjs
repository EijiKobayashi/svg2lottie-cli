/**
 * ポップイン（バウンス・弾性オーバーシュート出現）エフェクトモジュール
 */

const EASE_3D_IN = { x: [0.22, 0.22, 0.22], y: [1, 1, 1] };
const EASE_3D_OUT = { x: [0.36, 0.36, 0.36], y: [1, 1, 1] };

/**
 * レイヤーに弾性ポップイン出現スケールを適用する
 * @param {object} layer
 * @param {{ start?: number, end?: number, fromScale?: number, overshootScale?: number }} options
 */
export function applyPopIn(layer, options = {}) {
  const {
    start = 0,
    end = 36,
    fromScale = 0,
    overshootScale = 115,
  } = options;

  const peakFrame = Math.round(start + (end - start) * 0.68);
  const kfs = [];
  if (start > 0) {
    kfs.push({
      t: 0,
      s: [fromScale, fromScale, 100],
      i: EASE_3D_IN,
      o: EASE_3D_OUT,
    });
  }
  kfs.push(
    {
      t: start,
      s: [fromScale, fromScale, 100],
      i: EASE_3D_IN,
      o: EASE_3D_OUT,
    },
    {
      t: peakFrame,
      s: [overshootScale, overshootScale, 100],
      i: EASE_3D_IN,
      o: EASE_3D_OUT,
    },
    {
      t: end,
      s: [100, 100, 100],
    }
  );

  layer.ks.s = { a: 1, k: kfs };
  return { layer, extraLayers: [] };
}
