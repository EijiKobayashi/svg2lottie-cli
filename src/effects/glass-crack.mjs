/**
 * ガラスひび割れ（衝撃点からの放射状クラック伝播＋衝撃振動ジッター）エフェクトモジュール
 */

import { round4 } from '../path-parser.mjs';

/**
 * 衝撃点から放射状に広がるガラスのひび割れと衝撃振動ジッターを生成する
 * @param {object} layer
 * @param {{
 *   start?: number,
 *   end?: number,
 *   impactPoint?: [number, number],
 *   rays?: number,
 *   radius?: number,
 *   shake?: boolean
 * }} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applyGlassCrack(layer, options = {}, ctx = {}) {
  const {
    start = 0,
    end = 30,
    impactPoint,
    rays = 8,
    radius = 65,
    shake = true,
  } = options;
  const [ix, iy] = impactPoint || ctx.center || layer.ks?.a?.k || [100, 100];

  // 1. 割れた瞬間の衝撃振動（シェイク・ジッター）を本体に付与
  if (shake) {
    const origPos = layer.ks?.p?.k || [ix, iy, 0];
    const px = Array.isArray(origPos) ? origPos[0] : ix;
    const py = Array.isArray(origPos) ? origPos[1] : iy;

    layer.ks.p = {
      a: 1,
      k: [
        { t: Math.max(0, start - 1), s: [px, py, 0] },
        { t: start + 2, s: [px + 4, py - 3, 0] },
        { t: start + 5, s: [px - 3, py + 3, 0] },
        { t: start + 8, s: [px + 2, py - 1, 0] },
        { t: start + 12, s: [px, py, 0] },
      ],
    };
  }

  // 2. 放射状＆枝分かれする幾何クラックライン
  const rayPaths = [];
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + (i % 2 === 0 ? 0.16 : -0.12);
    const midR = radius * 0.45;
    const mx = round4(ix + Math.cos(angle + 0.14) * midR);
    const my = round4(iy + Math.sin(angle + 0.14) * midR);
    const ex = round4(ix + Math.cos(angle) * radius);
    const ey = round4(iy + Math.sin(angle) * radius);

    rayPaths.push({
      ty: 'sh',
      nm: `Crack Ray ${i + 1}`,
      ks: {
        a: 0,
        k: {
          c: false,
          v: [
            [ix, iy],
            [mx, my],
            [ex, ey],
          ],
          i: [
            [0, 0],
            [0, 0],
            [0, 0],
          ],
          o: [
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        },
      },
    });
  }

  const crackLayer = {
    ddd: 0,
    ind: (layer.ind || 1) + 200,
    ty: 4,
    nm: `${layer.nm}-glass-crack`,
    sr: 1,
    ks: {
      o: { a: 0, k: 95 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [ix, iy, 0] },
      a: { a: 0, k: [ix, iy, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        nm: 'Crack Lines',
        it: [
          ...rayPaths,
          {
            ty: 'tm',
            nm: 'Crack Propagation',
            s: { a: 0, k: 0 },
            e: {
              a: 1,
              k: [
                { t: start, s: [0], i: { x: [0.12], y: [1] }, o: { x: [0.22], y: [1] } },
                { t: end, s: [100] },
              ],
            },
            o: { a: 0, k: 0 },
            m: 1,
          },
          {
            ty: 'st',
            nm: 'Crack Stroke',
            c: { a: 0, k: [0.95, 0.98, 1, 1] },
            o: { a: 0, k: 100 },
            w: { a: 0, k: 1.8 },
            lc: 2,
            lj: 2,
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
    ip: start,
    op: layer.op || 560,
    st: 0,
    bm: 0,
  };

  return { layer, extraLayers: [crackLayer] };
}
