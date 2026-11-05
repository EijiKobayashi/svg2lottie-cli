/**
 * ガラスひび割れ＆粉砕エフェクト（クラック伝播 ➔ 破片シャードの四方砕け散り Shatter）モジュール
 */

import { round4 } from '../path-parser.mjs';

/**
 * 衝撃点クラックおよび破片の四方砕け散り（Shatter & Scatter）を生成する
 * @param {object} layer
 * @param {{
 *   start?: number,
 *   end?: number,
 *   impactPoint?: [number, number],
 *   rays?: number,
 *   radius?: number,
 *   shake?: boolean,
 *   shatter?: boolean,
 *   shardCount?: number
 * }} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applyGlassCrack(layer, options = {}, ctx = {}) {
  const {
    start = 30,
    end = 110,
    impactPoint,
    rays = 8,
    radius = 50,
    shake = true,
    shatter = true,
    shardCount = 8,
  } = options;

  const totalFrames = layer.op || 120;
  const [ix, iy] = impactPoint || ctx.center || layer.ks?.a?.k || [120, 120];
  const origPos = layer.ks?.p?.k || [ix, iy, 0];
  const px = Array.isArray(origPos) ? origPos[0] : ix;
  const py = Array.isArray(origPos) ? origPos[1] : iy;

  const crackDur = Math.round((end - start) * 0.22);
  const crackEnd = start + crackDur;

  // 1. 衝撃の瞬間ジッター振動
  if (shake) {
    layer.ks.p = {
      a: 1,
      k: [
        { t: 0, s: [px, py, 0] },
        { t: Math.max(0, start - 1), s: [px, py, 0] },
        { t: start + 2, s: [px + 6, py - 4, 0] },
        { t: start + 4, s: [px - 5, py + 5, 0] },
        { t: start + 6, s: [px + 4, py - 3, 0] },
        { t: crackEnd, s: [px, py, 0] },
        { t: totalFrames, s: [px, py, 0] },
      ],
    };
  }

  // 2. クラック後に本体が粉砕して消滅
  if (shatter) {
    layer.ks.o = {
      a: 1,
      k: [
        { t: 0, s: [100] },
        { t: crackEnd, s: [100] },
        { t: crackEnd + 2, s: [0] },
        { t: totalFrames, s: [0] },
      ],
    };
  }

  // 3. 鋭角幾何クラックライン
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
          v: [[ix, iy], [mx, my], [ex, ey]],
          i: [[0, 0], [0, 0], [0, 0]],
          o: [[0, 0], [0, 0], [0, 0]],
        },
      },
    });
  }

  const extraLayers = [];

  // クラックラインレイヤー
  extraLayers.push({
    ddd: 0,
    ind: (layer.ind || 1) + 200,
    ty: 4,
    nm: `${layer.nm}-glass-crack`,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: 0, s: [0] },
          { t: start, s: [0] },
          { t: start + 2, s: [100] },
          { t: crackEnd + 2, s: [100] },
          { t: crackEnd + 4, s: [0] },
          { t: totalFrames, s: [0] },
        ],
      },
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
                { t: crackEnd, s: [100] },
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
            w: { a: 0, k: 2.2 },
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
    op: totalFrames,
    st: 0,
    bm: 0,
  });

  // 4. 四方八方に激しく砕け散る多角形破片シャード（Shatter & Fly Shards）
  if (shatter) {
    const shatterStart = crackEnd;
    const shatterEnd = end;
    const shatterDur = Math.max(20, shatterEnd - shatterStart);

    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (i % 2 === 0 ? 0.2 : -0.2);
      const flyDist = radius * (1.3 + (i % 3) * 0.45);
      const targetX = round4(ix + Math.cos(angle) * flyDist);
      const targetY = round4(iy + Math.sin(angle) * flyDist + 35); // 重力落下
      const spinAngle = (i % 2 === 0 ? 1 : -1) * (200 + i * 40);
      const shardSize = round4(radius * (0.26 + (i % 3) * 0.08));

      const p1 = [0, -shardSize];
      const p2 = [round4(shardSize * 0.8), round4(shardSize * 0.7)];
      const p3 = [round4(-shardSize * 0.7), round4(shardSize * 0.5)];

      extraLayers.push({
        ddd: 0,
        ind: (layer.ind || 1) + 210 + i,
        ty: 4,
        nm: `${layer.nm}-glass-shard-${i + 1}`,
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [0] },
              { t: shatterStart, s: [100] },
              { t: shatterStart + Math.round(shatterDur * 0.7), s: [90] },
              { t: shatterEnd, s: [0] },
              { t: totalFrames, s: [0] },
            ],
          },
          r: {
            a: 1,
            k: [
              { t: shatterStart, s: [0], i: { x: [0.2], y: [1] }, o: { x: [0.35], y: [1] } },
              { t: shatterEnd, s: [spinAngle] },
            ],
          },
          p: {
            a: 1,
            k: [
              { t: shatterStart, s: [ix, iy, 0], i: { x: 0.15, y: 1 }, o: { x: 0.3, y: 1 } },
              { t: shatterEnd, s: [targetX, targetY, 0] },
            ],
          },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: shatterStart, s: [100, 100, 100], i: { x: [0.2, 0.2, 0.2], y: [1, 1, 1] }, o: { x: [0.35, 0.35, 0.35], y: [1, 1, 1] } },
              { t: shatterEnd, s: [35, 35, 100] },
            ],
          },
        },
        ao: 0,
        shapes: [
          {
            ty: 'gr',
            nm: 'Glass Shard',
            it: [
              {
                ty: 'sh',
                nm: 'Shard Tri',
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [p1, p2, p3],
                    i: [[0, 0], [0, 0], [0, 0]],
                    o: [[0, 0], [0, 0], [0, 0]],
                  },
                },
              },
              {
                ty: 'fl',
                nm: 'Shard Fill',
                c: { a: 0, k: [0.98, 0.75, 0.14, 1] }, // 星のゴールド色
                o: { a: 0, k: 90 },
                r: 1,
              },
              {
                ty: 'st',
                nm: 'Shard Edge',
                c: { a: 0, k: [1, 1, 1, 1] },
                o: { a: 0, k: 95 },
                w: { a: 0, k: 1.2 },
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
        ip: shatterStart,
        op: totalFrames,
        st: 0,
        bm: 0,
      });
    }
  }

  return { layer, extraLayers };
}
