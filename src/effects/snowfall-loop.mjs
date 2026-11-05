/**
 * SVG雪片レイヤーを縦にタイル複製し、継ぎ目なく循環させる降雪エフェクト。
 */

const LINEAR_IN = { x: [0.833], y: [0.833] };
const LINEAR_OUT = { x: [0.167], y: [0.167] };

function positionKeyframes(cx, cy, offsetY, distance, drift, start, end, phase) {
  const mid = start + (end - start) / 2;
  const startX = cx + drift * phase;
  const middleX = cx - drift * phase;
  return {
    a: 1,
    k: [
      { t: start, s: [startX, cy + offsetY, 0], i: LINEAR_IN, o: LINEAR_OUT },
      { t: mid, s: [middleX, cy + offsetY + distance / 2, 0], i: LINEAR_IN, o: LINEAR_OUT },
      { t: end, s: [startX, cy + offsetY + distance, 0] },
    ],
  };
}

/**
 * @param {object} layer
 * @param {{start?: number, end?: number, distance?: number, drift?: number, copies?: number, opacity?: number}} options
 * @param {{height?: number, center?: [number, number]}} ctx
 */
export function applySnowfallLoop(layer, options = {}, ctx = {}) {
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [0, 0];
  const start = options.start ?? 0;
  const end = options.end ?? layer.op ?? 180;
  const distance = options.distance ?? ctx.height ?? 180;
  const drift = options.drift ?? 24;
  const copies = Math.max(2, Math.floor(options.copies ?? 2));
  const opacity = options.opacity ?? 85;

  layer.ks.p = positionKeyframes(cx, cy, 0, distance, drift, start, end, -1);
  layer.ks.o = { a: 0, k: opacity };

  const extraLayers = [];
  for (let i = 1; i < copies; i++) {
    const clone = structuredClone(layer);
    clone.nm = `${layer.nm}-tile-${i + 1}`;
    clone.ks.p = positionKeyframes(
      cx,
      cy,
      -distance * i,
      distance,
      drift,
      start,
      end,
      -1
    );
    extraLayers.push(clone);
  }

  return { layer, extraLayers };
}
