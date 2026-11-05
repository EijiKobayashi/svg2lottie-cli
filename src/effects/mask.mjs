/**
 * 汎用マスク（加算・減算・交差・反転・フェザーぼかし・拡張）モジュール
 */

/**
 * レイヤーにマスクを追加する
 * @param {object} layer
 * @param {{
 *   mode?: 'a' | 's' | 'i',
 *   inverted?: boolean,
 *   feather?: number,
 *   expansion?: number,
 *   opacity?: number,
 *   vertices?: [number, number][]
 * }} options
 * @param {{ width?: number, height?: number }} ctx
 */
export function applyMask(layer, options = {}, ctx = {}) {
  const {
    mode = 'a',
    inverted = false,
    feather = 0,
    expansion = 0,
    opacity = 100,
    vertices,
  } = options;

  const w = ctx.width || 520;
  const h = ctx.height || 140;
  const pts = vertices || [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];

  const maskObj = {
    inv: Boolean(inverted),
    mode,
    pt: {
      a: 0,
      k: {
        c: true,
        v: pts,
        i: pts.map(() => [0, 0]),
        o: pts.map(() => [0, 0]),
      },
    },
    o: { a: 0, k: opacity },
    f: { a: 0, k: [feather, feather] },
    x: { a: 0, k: expansion },
    nm: 'Custom Mask',
  };

  layer.masksProperties = [...(layer.masksProperties || []), maskObj];
  return { layer, extraLayers: [] };
}

