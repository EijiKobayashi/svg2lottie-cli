/**
 * スピード調整（倍速・スローモーション・フリーズ）エフェクトモジュール
 */

function scaleKeyframes(prop, rate) {
  if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) return;
  for (const kf of prop.k) {
    if (typeof kf.t === 'number') {
      kf.t = Math.round((kf.t / rate) * 100) / 100;
    }
  }
}

/**
 * レイヤーの再生速度（倍速 / スローモーション）およびキーフレーム時間を調整する
 * @param {object} layer
 * @param {{ rate?: number, freezeFrame?: number }} options
 */
export function applySpeedControl(layer, options = {}) {
  const rate = typeof options.rate === 'number' && options.rate > 0 ? options.rate : 1;
  layer.sr = Math.round((1 / rate) * 10000) / 10000;

  if (layer.ks) {
    scaleKeyframes(layer.ks.o, rate);
    scaleKeyframes(layer.ks.p, rate);
    scaleKeyframes(layer.ks.s, rate);
    scaleKeyframes(layer.ks.r, rate);
  }
  if (typeof options.freezeFrame === 'number') {
    layer.tm = { a: 0, k: options.freezeFrame };
  }
  return { layer, extraLayers: [] };
}
