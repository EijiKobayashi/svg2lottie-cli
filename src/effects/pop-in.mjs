/**
 * ポップイン（4段階スプリング弾性：0% ➔ オーバーシュート ➔ アンダーシュート ➔ 100%定位置）エフェクトモジュール
 */

const EASE_OUT = { x: [0.16, 0.16, 0.16], y: [1, 1, 1] };
const EASE_IN_OUT = { x: [0.34, 0.34, 0.34], y: [1, 1, 1] };

/**
 * レイヤーに自然な弾性スプリング・ポップインを適用する（既存のfadeOutスケールとも合成可能）
 * @param {object} layer
 * @param {{ start?: number, end?: number, fromScale?: number, overshootScale?: number, undershootScale?: number }} options
 */
export function applyPopIn(layer, options = {}) {
  const {
    start = 0,
    end = 42,
    fromScale = 0,
    overshootScale = 114,
    undershootScale = 97,
  } = options;

  const dur = Math.max(6, end - start);
  const tOver = Math.round(start + dur * 0.55);
  const tUnder = Math.round(start + dur * 0.8);

  const kfs = [];
  if (start > 0) {
    kfs.push({
      t: 0,
      s: [fromScale, fromScale, 100],
      i: EASE_OUT,
      o: EASE_IN_OUT,
    });
  }
  kfs.push(
    {
      t: start,
      s: [fromScale, fromScale, 100],
      i: EASE_OUT,
      o: EASE_IN_OUT,
    },
    {
      t: tOver,
      s: [overshootScale, overshootScale, 100],
      i: EASE_IN_OUT,
      o: EASE_IN_OUT,
    },
    {
      t: tUnder,
      s: [undershootScale, undershootScale, 100],
      i: EASE_IN_OUT,
      o: EASE_IN_OUT,
    },
    {
      t: end,
      s: [100, 100, 100],
    }
  );

  // もし既存のスケールキーフレームに fadeOut（end 以降の縮小）があれば維持して結合する
  const existingKfs =
    layer.ks?.s?.a === 1 && Array.isArray(layer.ks.s.k)
      ? layer.ks.s.k.filter((k) => k.t > end)
      : [];
  if (existingKfs.length > 0) {
    kfs[kfs.length - 1].i = EASE_IN_OUT;
    kfs[kfs.length - 1].o = EASE_IN_OUT;
    kfs.push(...existingKfs);
  }

  layer.ks.s = { a: 1, k: kfs };
  return { layer, extraLayers: [] };
}
