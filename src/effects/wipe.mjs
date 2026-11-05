/**
 * ワイプ（上下左右・アイリス動的マスク）エフェクトモジュール
 */

function rectShape(x0, y0, x1, y1) {
  return {
    c: true,
    v: [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    i: [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    o: [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  };
}

/**
 * レイヤーに動的マスクによるワイプ遷移を適用する
 * @param {object} layer
 * @param {{ direction?: 'right'|'left'|'down'|'up'|'iris', start?: number, end?: number, feather?: number }} options
 * @param {{ width?: number, height?: number }} ctx
 */
export function applyWipe(layer, options = {}, ctx = {}) {
  const { direction = 'right', start = 0, end = 40, feather = 0 } = options;
  const w = ctx.width || 520;
  const h = ctx.height || 140;

  let startShape;
  if (direction === 'left') {
    startShape = rectShape(w, 0, w, h);
  } else if (direction === 'down') {
    startShape = rectShape(0, 0, w, 0);
  } else if (direction === 'up') {
    startShape = rectShape(0, h, w, h);
  } else if (direction === 'iris') {
    const cx = w / 2;
    const cy = h / 2;
    startShape = rectShape(cx, cy, cx, cy);
  } else {
    startShape = rectShape(0, 0, 0, h);
  }
  const fullShape = rectShape(0, 0, w, h);

  const mask = {
    inv: false,
    mode: 'a',
    pt: {
      a: 1,
      k: [
        {
          t: start,
          s: [startShape],
          i: { x: [0.22], y: [1] },
          o: { x: [0.36], y: [1] },
        },
        {
          t: end,
          s: [fullShape],
        },
      ],
    },
    o: { a: 0, k: 100 },
    f: { a: 0, k: [feather, feather] },
    x: { a: 0, k: 0 },
    nm: `Wipe (${direction})`,
  };

  layer.masksProperties = [...(layer.masksProperties || []), mask];
  return { layer, extraLayers: [] };
}

