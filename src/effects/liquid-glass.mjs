/**
 * すりガラス・グラスプレート・Apple風リキッドグラス（Liquid Glass）エフェクトモジュール
 */

/**
 * Apple風リキッドグラス（半透明フロストブラー＋スペキュラハイライト枠＋流体屈折シマー）を生成する
 * @param {object} layer
 * @param {{
 *   variant?: 'frosted' | 'plate' | 'liquid',
 *   blur?: number,
 *   tintOpacity?: number,
 *   specularWidth?: number
 * }} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applyLiquidGlass(layer, options = {}, ctx = {}) {
  const {
    variant = 'liquid',
    blur = 20,
    tintOpacity = 24,
    specularWidth = 1.8,
  } = options;

  const [cx, cy] = ctx.center || layer.ks?.a?.k || [100, 100];
  const baseShape = layer.shapes?.[0]?.it?.find((it) => it.ty === 'sh')?.ks?.k || {
    c: true,
    v: [
      [cx - 60, cy - 30],
      [cx + 60, cy - 30],
      [cx + 60, cy + 30],
      [cx - 60, cy + 30],
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
          { ty: 0, nm: 'Blurriness', mn: 'ADBE Gaussian Blur 2-0001', ix: 1, v: { a: 0, k: blur } },
          { ty: 7, nm: 'Blur Dimensions', mn: 'ADBE Gaussian Blur 2-0002', ix: 2, v: { a: 0, k: 1 } },
          { ty: 7, nm: 'Repeat Edge Pixels', mn: 'ADBE Gaussian Blur 2-0003', ix: 3, v: { a: 0, k: 0 } },
        ],
      },
    ],
    shapes: [
      {
        ty: 'gr',
        nm: 'Glass Plate & Specular Rim',
        it: [
          { ty: 'sh', nm: 'Glass Contour', ks: { a: 0, k: baseShape } },
          {
            ty: 'st',
            nm: 'Specular Highlight Rim',
            c: { a: 0, k: [0.92, 0.97, 1, 1] },
            o: { a: 0, k: variant === 'liquid' ? 85 : 60 },
            w: { a: 0, k: specularWidth },
            lc: 2,
            lj: 2,
          },
          {
            ty: 'fl',
            nm: 'Frosted Tint Fill',
            c: { a: 0, k: [0.88, 0.95, 1, 1] },
            o: { a: 0, k: tintOpacity },
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
