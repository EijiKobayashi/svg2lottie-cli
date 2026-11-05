/**
 * ズーム・スライド・スピン複合モーションモジュール
 */

const EASE_1D_IN = { x: [0.22], y: [1] };
const EASE_1D_OUT = { x: [0.36], y: [1] };
const EASE_3D_IN = { x: [0.22, 0.22, 0.22], y: [1, 1, 1] };
const EASE_3D_OUT = { x: [0.36, 0.36, 0.36], y: [1, 1, 1] };

/**
 * レイヤーにズーム（拡縮）・スライド（移動）・スピン（回転）を適用する
 * @param {object} layer
 * @param {{ start?: number, end?: number, zoomFrom?: number, zoomTo?: number, dx?: number, dy?: number, rotations?: number, degrees?: number }} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applyZoomSlideSpin(layer, options = {}, ctx = {}) {
  const {
    start = 0,
    end = 60,
    zoomFrom,
    zoomTo = 100,
    dx = 0,
    dy = 0,
    rotations = 0,
    degrees,
  } = options;

  if (typeof zoomFrom === 'number' && zoomFrom !== zoomTo) {
    layer.ks.s = {
      a: 1,
      k: [
        { t: start, s: [zoomFrom, zoomFrom, 100], i: EASE_3D_IN, o: EASE_3D_OUT },
        { t: end, s: [zoomTo, zoomTo, 100] },
      ],
    };
  }

  if (dx !== 0 || dy !== 0) {
    const [cx, cy] = ctx.center || layer.ks?.a?.k || [260, 70];
    layer.ks.p = {
      a: 1,
      k: [
        { t: start, s: [cx + dx, cy + dy, 0], i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
        { t: end, s: [cx, cy, 0] },
      ],
    };
  }

  const totalDeg = typeof degrees === 'number' ? degrees : rotations * 360;
  if (totalDeg !== 0) {
    layer.ks.r = {
      a: 1,
      k: [
        { t: start, s: [0], i: EASE_1D_IN, o: EASE_1D_OUT },
        { t: end, s: [totalDeg] },
      ],
    };
  }

  return { layer, extraLayers: [] };
}

