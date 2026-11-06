/**
 * ガラスひび割れ＆粉砕エフェクト（クラック伝播 ➔ 破片シャードの大粉砕 Shatter ➔ 黄金星のドラマチック再生 Rebirth）モジュール
 */

import { round4 } from '../path-parser.mjs';

/**
 * 衝撃点クラック、破片の四方砕け散り（Shatter）、および星の再生を生成する
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
    start = 22,
    end = 75,
    impactPoint,
    rays = 8,
    radius = 52,
    shake = true,
    shatter = true,
    shardCount = 8,
  } = options;

  const totalFrames = layer.op || 120;
  const rawCenter = ctx.center || layer.ks?.a?.k || [120, 120];
  const cx = rawCenter[0];
  const cy = rawCenter[1];
  // 衝撃点を自然に少し偏心させる（アシンメトリー化）
  const [ix, iy] = impactPoint || [round4(cx - 10), round4(cy - 6)];
  const origPos = layer.ks?.p?.k || [cx, cy, 0];
  const px = Array.isArray(origPos) ? origPos[0] : cx;
  const py = Array.isArray(origPos) ? origPos[1] : cy;

  const crackHit = start;
  const crackEnd = start + 8;
  const shatterStart = crackEnd + 4; // 34f: 大粉砕
  const shatterEnd = end;            // 75f: 破片完全消滅
  const rebirthStart = 82;           // 82f: 星の再生
  const rebirthEnd = 104;

  const easeInOut = { x: [0.35, 0.35, 0.35], y: [0.65, 0.65, 0.65] };

  // 1. 本体の位置（衝撃振動 ➔ 消滅 ➔ 再生時の弾性バウンス）
  if (shake) {
    layer.ks.p = {
      a: 1,
      k: [
        { t: 0, s: [px, py, 0] },
        { t: crackHit, s: [px, py, 0] },
        { t: crackHit + 2, s: [px + 4, py - 3, 0] },
        { t: crackHit + 4, s: [px - 3, py + 3, 0] },
        { t: crackHit + 6, s: [px + 2, py - 1, 0] },
        { t: crackEnd, s: [px, py, 0] },
        { t: rebirthStart, s: [px, py, 0] },
        { t: rebirthStart + 8, s: [px, py - 12, 0], i: easeInOut, o: easeInOut },
        { t: rebirthEnd, s: [px, py, 0] },
        { t: totalFrames, s: [px, py, 0] },
      ],
    };
  }

  // 2. 本体の不透明度とスケール（粉砕で0% ➔ 82fから再生して100%復帰）
  layer.ks.o = {
    a: 1,
    k: [
      { t: 0, s: [100] },
      { t: shatterStart, s: [100] },
      { t: shatterStart + 2, s: [0] },
      { t: rebirthStart, s: [0] },
      { t: rebirthStart + 4, s: [100] },
      { t: totalFrames, s: [100] },
    ],
  };

  layer.ks.s = {
    a: 1,
    k: [
      { t: 0, s: [100, 100, 100] },
      { t: shatterStart, s: [100, 100, 100] },
      { t: rebirthStart, s: [0, 0, 100] },
      { t: rebirthStart + 10, s: [122, 122, 100], i: easeInOut, o: easeInOut },
      { t: rebirthStart + 16, s: [94, 94, 100] },
      { t: rebirthEnd, s: [100, 100, 100] },
      { t: totalFrames, s: [100, 100, 100] },
    ],
  };

  // 3. アシンメトリー・不規則なクラックライン（不揃いな角度・ジグザグ折れ線・長短の差）
  const rayAngles = [0.12, 0.78, 1.45, 2.32, 3.15, 3.92, 4.68, 5.6];
  const rayPaths = [];
  for (let i = 0; i < rays; i++) {
    const baseAngle = rayAngles[i % rayAngles.length];
    // 長短の差（主クラックは長く、枝クラックは短く）
    const rLen = radius * (i % 3 === 0 ? 1.05 : (i % 3 === 1 ? 0.68 : 0.88));
    const midR = rLen * (0.35 + (i % 2) * 0.18);
    // ジグザグの曲がり角（自然界のひび割れの不規則性）
    const bend = (i % 2 === 0 ? 0.28 : -0.22);
    const mx = round4(ix + Math.cos(baseAngle + bend) * midR);
    const my = round4(iy + Math.sin(baseAngle + bend) * midR);
    const ex = round4(ix + Math.cos(baseAngle) * rLen);
    const ey = round4(iy + Math.sin(baseAngle) * rLen);

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

  // クラックラインレイヤー（Light/Dark双方でくっきり見える濃いコントラスト線）
  extraLayers.push({
    ddd: 0,
    ind: (layer.ind || 1) + 200,
    ty: 4,
    nm: `${layer.nm}-glass-crack-lines`,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: 0, s: [0] },
          { t: crackHit, s: [0] },
          { t: crackHit + 2, s: [100] },
          { t: shatterStart, s: [100] },
          { t: shatterStart + 2, s: [0] },
          { t: totalFrames, s: [0] },
        ],
      },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [0, 0, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        nm: 'Crack Lines Grp',
        it: [
          ...rayPaths,
          {
            ty: 'tm',
            nm: 'Trim Paths',
            s: { a: 0, k: 0 },
            e: {
              a: 1,
              k: [
                { t: crackHit, s: [0], i: { x: [0.1], y: [1] }, o: { x: [0.2], y: [1] } },
                { t: crackEnd, s: [100] },
              ],
            },
            o: { a: 0, k: 0 },
            m: 1,
          },
          {
            ty: 'st',
            nm: 'Crack Stroke',
            // LightモードでもDarkモードでもくっきり見える濃紺スレート色
            c: { a: 0, k: [0.12, 0.18, 0.28, 1] },
            o: { a: 0, k: 95 },
            w: { a: 0, k: 2.4 },
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
    ip: crackHit,
    op: shatterStart + 3,
    st: 0,
    bm: 0,
  });

  // 4. 四方八方に激しく砕け散る多角形破片シャード（枠内240×240に完全収容）
  if (shatter) {
    const shatterDur = Math.max(20, shatterEnd - shatterStart);

    for (let i = 0; i < shardCount; i++) {
      const angle = rayAngles[i % rayAngles.length] + (i % 2 === 0 ? 0.15 : -0.15);
      // 枠内収容: 飛散距離を抑制（最大 70px）、重力加速度落下も +22px 以内に収める
      const flyDist = Math.min(68, radius * (0.8 + (i % 3) * 0.25));
      const targetX = Math.round(Math.max(20, Math.min(220, ix + Math.cos(angle) * flyDist)));
      const targetY = Math.round(Math.max(20, Math.min(218, iy + Math.sin(angle) * flyDist + 20))); // 重力加速落下
      const spinAngle = (i % 2 === 0 ? 1 : -1) * (180 + i * 40);
      const shardSize = round4(radius * (0.24 + (i % 3) * 0.08));

      const p1 = [0, -shardSize];
      const p2 = [round4(shardSize * 0.85), round4(shardSize * 0.75)];
      const p3 = [round4(-shardSize * 0.75), round4(shardSize * 0.55)];

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
              { t: shatterStart + Math.round(shatterDur * 0.65), s: [95] },
              { t: shatterEnd, s: [0] },
              { t: totalFrames, s: [0] },
            ],
          },
          r: {
            a: 1,
            k: [
              { t: shatterStart, s: [0], i: { x: [0.15], y: [1] }, o: { x: [0.3], y: [1] } },
              { t: shatterEnd, s: [spinAngle] },
              { t: totalFrames, s: [spinAngle] },
            ],
          },
          p: {
            a: 1,
            k: [
              {
                t: shatterStart,
                s: [ix, iy, 0],
                i: { x: [0.12, 0.12, 0.12], y: [1, 1, 1] },
                o: { x: [0.25, 0.25, 0.25], y: [1, 1, 1] },
              },
              { t: shatterEnd, s: [targetX, targetY, 0] },
              { t: totalFrames, s: [targetX, targetY, 0] },
            ],
          },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: shatterStart, s: [100, 100, 100], i: { x: [0.2, 0.2, 0.2], y: [1, 1, 1] }, o: { x: [0.35, 0.35, 0.35], y: [1, 1, 1] } },
              { t: shatterEnd, s: [25, 25, 100] },
              { t: totalFrames, s: [25, 25, 100] },
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
                c: { a: 0, k: [0.98, 0.75, 0.14, 1] }, // ゴールド
                o: { a: 0, k: 92 },
                r: 1,
              },
              {
                ty: 'st',
                nm: 'Shard Edge',
                c: { a: 0, k: [1, 1, 1, 1] },
                o: { a: 0, k: 95 },
                w: { a: 0, k: 1.4 },
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
        op: shatterEnd + 2,
        st: 0,
        bm: 0,
      });
    }
  }

  return { layer, extraLayers };
}
