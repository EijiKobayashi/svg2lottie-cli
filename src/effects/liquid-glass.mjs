/**
 * すりガラス・グラスプレート・Apple風リキッドグラス（Liquid Glass）エフェクトモジュール
 * ※固定矩形ではなく対象レイヤーの実シェイプ輪郭を抽出し、走るスペキュラハイライト光沢（Trim Paths シマー）を生成
 */

function collectLayerShapes(layer) {
  const found = [];
  function walk(items) {
    for (const it of items || []) {
      if (it.ty === 'sh' && it.ks?.k) {
        found.push(it.ks.k);
      } else if (it.ty === 'gr' && Array.isArray(it.it)) {
        walk(it.it);
      }
    }
  }
  walk(layer.shapes);
  return found;
}

/**
 * Apple風リキッドグラス（実シェイプ輪郭に沿うスペキュラ光沢シマー＋柔らかい屈折グロー）を適用する
 * @param {object} layer
 * @param {{
 *   variant?: 'frosted' | 'plate' | 'liquid',
 *   blur?: number,
 *   tintOpacity?: number,
 *   specularWidth?: number,
 *   start?: number,
 *   end?: number
 * }} options
 */
export function applyLiquidGlass(layer, options = {}) {
  const {
    variant = 'liquid',
    blur = 10,
    tintOpacity = 18,
    specularWidth = 2,
    start = 20,
    end = 160,
  } = options;

  const contourShapes = collectLayerShapes(layer);
  if (contourShapes.length === 0) {
    return { layer, extraLayers: [] };
  }

  // 最大の輪郭から上位6個までに絞って軽快かつ美しいリムハイライトを生成
  const selectedShapes = contourShapes.slice(0, 6).map((sh, i) => ({
    ty: 'sh',
    nm: `Glass Contour ${i + 1}`,
    ks: { a: 0, k: sh },
  }));

  const glassLayer = {
    ddd: 0,
    ind: (layer.ind || 1) + 100,
    ty: 4,
    nm: `${layer.nm}-liquid-glass (${variant})`,
    sr: 1,
    ks: structuredClone(layer.ks),
    ao: 0,
    ef: [
      {
        ty: 29,
        nm: 'Liquid Glass Frost Blur',
        np: 3,
        mn: 'ADBE Gaussian Blur 2',
        ix: 1,
        en: 1,
        ef: [
          {
            ty: 0,
            nm: 'Blurriness',
            mn: 'ADBE Gaussian Blur 2-0001',
            ix: 1,
            v: {
              a: 1,
              k: [
                { t: start, s: [blur], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                { t: Math.round((start + end) / 2), s: [blur * 0.35], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                { t: end, s: [0] },
              ],
            },
          },
          { ty: 7, nm: 'Blur Dimensions', mn: 'ADBE Gaussian Blur 2-0002', ix: 2, v: { a: 0, k: 1 } },
          { ty: 7, nm: 'Repeat Edge Pixels', mn: 'ADBE Gaussian Blur 2-0003', ix: 3, v: { a: 0, k: 0 } },
        ],
      },
    ],
    shapes: [
      {
        ty: 'gr',
        nm: 'Specular Rim Shimmer',
        it: [
          ...selectedShapes,
          {
            ty: 'tm',
            nm: 'Specular Shimmer Sweep',
            s: {
              a: 1,
              k: [
                { t: start, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                { t: end, s: [75] },
              ],
            },
            e: {
              a: 1,
              k: [
                { t: start, s: [25], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                { t: end, s: [100] },
              ],
            },
            o: { a: 0, k: 0 },
            m: 1,
          },
          {
            ty: 'st',
            nm: 'Specular Highlight Rim',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: {
              a: 1,
              k: [
                { t: start, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                { t: Math.round(start + (end - start) * 0.35), s: [variant === 'liquid' ? 75 : 50], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                { t: end, s: [0] },
              ],
            },
            w: { a: 0, k: specularWidth },
            lc: 2,
            lj: 2,
          },
          {
            ty: 'fl',
            nm: 'Frosted Tint Fill',
            c: { a: 0, k: [0.92, 0.98, 1, 1] },
            o: {
              a: 1,
              k: [
                { t: start, s: [tintOpacity], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                { t: end, s: [0] },
              ],
            },
            r: 1,
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
            sk: { a: 0, k: 0 },
            sa: { a: 0, k: 0 },
          },
        ],
      },
    ],
    ip: layer.ip || 0,
    op: layer.op || 560,
    st: 0,
    bm: 0,
  };

  return { layer, extraLayers: [glassLayer] };
}
