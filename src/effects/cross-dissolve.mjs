/**
 * ディゾルブ（クロスディゾルブ）エフェクトモジュール
 */

const EASE_OUT = { x: [0.22], y: [1] };
const EASE_IN = { x: [0.64], y: [0] };

/**
 * レイヤーにクロスディゾルブ（滑らかなオーバーラップ不透明度遷移）を適用する
 * @param {object} layer
 * @param {{ direction?: 'in' | 'out', start?: number, end?: number }} options
 */
export function applyCrossDissolve(layer, options = {}) {
  const { direction = 'in', start = 0, end = 30 } = options;
  const fromVal = direction === 'out' ? 100 : 0;
  const toVal = direction === 'out' ? 0 : 100;

  const kfs = [];
  if (start > 0) {
    kfs.push({
      t: 0,
      s: [fromVal],
      i: { x: [0.5], y: [0.5] },
      o: { x: [0.5], y: [0.5] },
    });
  }
  kfs.push(
    { t: start, s: [fromVal], i: EASE_OUT, o: EASE_IN },
    { t: end, s: [toVal] }
  );

  layer.ks.o = { a: 1, k: kfs };
  return { layer, extraLayers: [] };
}

