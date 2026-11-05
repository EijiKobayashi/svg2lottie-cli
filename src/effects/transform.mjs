/**
 * 汎用トランスフォーム（位置・拡縮・回転・スキュー・不透明度）モジュール
 */

/**
 * レイヤーの ks トランスフォームおよびスキューを直接制御する
 * @param {object} layer
 * @param {{
 *   position?: [number, number],
 *   scale?: [number, number],
 *   rotation?: number,
 *   skew?: number,
 *   skewAxis?: number,
 *   opacity?: number
 * }} options
 */
export function applyTransform(layer, options = {}) {
  if (Array.isArray(options.position)) {
    layer.ks.p = { a: 0, k: [options.position[0], options.position[1], 0] };
  }
  if (Array.isArray(options.scale)) {
    layer.ks.s = { a: 0, k: [options.scale[0], options.scale[1], 100] };
  }
  if (typeof options.rotation === 'number') {
    layer.ks.r = { a: 0, k: options.rotation };
  }
  if (typeof options.skew === 'number') {
    layer.ks.sk = { a: 0, k: options.skew };
  }
  if (typeof options.skewAxis === 'number') {
    layer.ks.sa = { a: 0, k: options.skewAxis };
  }
  if (typeof options.opacity === 'number') {
    layer.ks.o = { a: 0, k: options.opacity };
  }
  return { layer, extraLayers: [] };
}

