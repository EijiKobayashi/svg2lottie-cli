/**
 * ガラスひび割れ＆粉砕エフェクトモジュール
 * - ヒビ割れ: 黄色い星の上でもくっきり見える高コントラスト亀裂（濃紺スレート）が、
 *   星の5つの尖った角の最先端・谷・中心全体へ隈なく走る蜘蛛の巣クラック
 * - 粉砕: 粉砕前の星の形状（シルエット）全体に倣って配置された48個の破片が、その位置から外側へ一斉に弾け飛ぶ（Shatter）
 * - 再生: 破片消滅後に黄金星がドラマチックにバウンス再生
 */

import { round4 } from '../path-parser.mjs';

function buildStarAnatomyPoints(cx, cy) {
  const points = [];

  const outerAngles = [-Math.PI / 2, -Math.PI / 2 + 1.2566, -Math.PI / 2 + 2.5133, -Math.PI / 2 + 3.7699, -Math.PI / 2 + 5.0265];
  const innerAngles = outerAngles.map((a) => a + 0.6283);

  const R_OUTER = 64; // 星の先端半径
  const R_INNER = 28; // 星の谷半径

  // 1. 先端パーツ（5箇所 × 2個 = 10個）
  for (let i = 0; i < 5; i++) {
    const a = outerAngles[i];
    points.push({
      x: round4(cx + Math.cos(a) * (R_OUTER * 0.95)),
      y: round4(cy + Math.sin(a) * (R_OUTER * 0.95)),
      tier: 'tip',
      angle: a,
    });
    points.push({
      x: round4(cx + Math.cos(a + 0.12) * (R_OUTER * 0.78)),
      y: round4(cy + Math.sin(a + 0.12) * (R_OUTER * 0.78)),
      tier: 'tip-sub',
      angle: a + 0.1,
    });
  }

  // 2. 稜線パーツ（各辺の中間、10箇所）
  for (let i = 0; i < 5; i++) {
    const aOut = outerAngles[i];
    const aInNext = innerAngles[i];
    const aInPrev = innerAngles[(i + 4) % 5];

    const mx1 = (Math.cos(aOut) * R_OUTER + Math.cos(aInNext) * R_INNER) / 2;
    const my1 = (Math.sin(aOut) * R_OUTER + Math.sin(aInNext) * R_INNER) / 2;
    points.push({
      x: round4(cx + mx1),
      y: round4(cy + my1),
      tier: 'edge',
      angle: Math.atan2(my1, mx1),
    });

    const mx2 = (Math.cos(aOut) * R_OUTER + Math.cos(aInPrev) * R_INNER) / 2;
    const my2 = (Math.sin(aOut) * R_OUTER + Math.sin(aInPrev) * R_INNER) / 2;
    points.push({
      x: round4(cx + mx2),
      y: round4(cy + my2),
      tier: 'edge',
      angle: Math.atan2(my2, mx2),
    });
  }

  // 3. 谷部パーツ（5箇所）
  for (let i = 0; i < 5; i++) {
    const a = innerAngles[i];
    points.push({
      x: round4(cx + Math.cos(a) * (R_INNER * 0.9)),
      y: round4(cy + Math.sin(a) * (R_INNER * 0.9)),
      tier: 'valley',
      angle: a,
    });
  }

  // 4. 星の内部・腹部パーツ（15個）
  for (let i = 0; i < 15; i++) {
    const a = (i / 15) * Math.PI * 2 + 0.2;
    const r = 14 + (i % 3) * 11;
    points.push({
      x: round4(cx + Math.cos(a) * r),
      y: round4(cy + Math.sin(a) * r),
      tier: 'body',
      angle: a,
    });
  }

  // 5. 中心コア・微細ダストパーツ（8個）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 5 + (i % 2) * 4;
    points.push({
      x: round4(cx + Math.cos(a) * r),
      y: round4(cy + Math.sin(a) * r),
      tier: 'core',
      angle: a,
    });
  }

  return points.slice(0, 48);
}

export function applyGlassCrack(layer, options = {}, ctx = {}) {
  const {
    start = 16,
    end = 72,
    impactPoint,
    shake = true,
    shatter = true,
    shardCount = 48,
  } = options;

  const totalFrames = layer.op || 120;
  const rawCenter = ctx.center || layer.ks?.a?.k || [120, 120];
  const cx = rawCenter[0];
  const cy = rawCenter[1];

  const [ix, iy] = impactPoint || [round4(cx - 6), round4(cy - 4)];
  const origPos = layer.ks?.p?.k || [cx, cy, 0];
  const px = Array.isArray(origPos) ? origPos[0] : cx;
  const py = Array.isArray(origPos) ? origPos[1] : cy;

  const crackHit = start;
  const crackEnd = start + 8;
  const shatterStart = crackEnd + 3; // 27f: 大粉砕
  const shatterEnd = end;            // 72f: 破片完全消滅
  const rebirthStart = 82;           // 82f: 星の再生
  const rebirthEnd = 106;

  const easeInOut = { x: [0.35, 0.35, 0.35], y: [0.65, 0.65, 0.65] };

  // 1. 本体星の挙動（振動 ➔ 粉砕瞬間に0%消滅 ➔ 再生バウンス）
  const shakePosKeyframes = [
    { t: 0, s: [px, py, 0] },
    { t: crackHit, s: [px, py, 0] },
    { t: crackHit + 2, s: [px + 3, py - 2, 0] },
    { t: crackHit + 4, s: [px - 3, py + 2, 0] },
    { t: crackHit + 6, s: [px + 2, py - 1, 0] },
    { t: crackEnd, s: [px, py, 0] },
    { t: rebirthStart, s: [px, py, 0] },
    { t: rebirthStart + 8, s: [px, py - 10, 0], i: easeInOut, o: easeInOut },
    { t: rebirthEnd, s: [px, py, 0] },
    { t: totalFrames, s: [px, py, 0] },
  ];

  if (shake) {
    layer.ks.p = { a: 1, k: shakePosKeyframes };
  }

  layer.ks.o = {
    a: 1,
    k: [
      { t: 0, s: [100] },
      { t: shatterStart, s: [100] },
      { t: shatterStart + 1, s: [0] },
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
      { t: rebirthStart + 10, s: [118, 118, 100], i: easeInOut, o: easeInOut },
      { t: rebirthStart + 16, s: [96, 96, 100] },
      { t: rebirthEnd, s: [100, 100, 100] },
      { t: totalFrames, s: [100, 100, 100] },
    ],
  };

  // 2. 星全体に隈なく走るクラックパスの生成
  const outerAngles = [-Math.PI / 2, -Math.PI / 2 + 1.2566, -Math.PI / 2 + 2.5133, -Math.PI / 2 + 3.7699, -Math.PI / 2 + 5.0265];
  const innerAngles = outerAngles.map((a) => a + 0.6283);

  const rayPaths = [];

  // (A) 衝撃点から星の5つの角の先端へ走る5大主クラック
  for (let i = 0; i < 5; i++) {
    const a = outerAngles[i];
    const tipX = round4(cx + Math.cos(a) * 62);
    const tipY = round4(cy + Math.sin(a) * 62);

    const mid1X = round4(ix + (tipX - ix) * 0.35 + Math.cos(a + 1.57) * 4);
    const mid1Y = round4(iy + (tipY - iy) * 0.35 + Math.sin(a + 1.57) * 4);
    const mid2X = round4(ix + (tipX - ix) * 0.72 - Math.cos(a + 1.57) * 3);
    const mid2Y = round4(iy + (tipY - iy) * 0.72 - Math.sin(a + 1.57) * 3);

    rayPaths.push({
      ty: 'sh',
      nm: `Main Tip Crack ${i + 1}`,
      ks: {
        a: 0,
        k: {
          c: false,
          v: [[ix, iy], [mid1X, mid1Y], [mid2X, mid2Y], [tipX, tipY]],
          i: [[0, 0], [0, 0], [0, 0], [0, 0]],
          o: [[0, 0], [0, 0], [0, 0], [0, 0]],
        },
      },
    });

    const crossX1 = round4(tipX + Math.cos(a + 1.8) * 12);
    const crossY1 = round4(tipY + Math.sin(a + 1.8) * 12);
    const crossX2 = round4(tipX + Math.cos(a - 1.8) * 12);
    const crossY2 = round4(tipY + Math.sin(a - 1.8) * 12);
    rayPaths.push({
      ty: 'sh',
      nm: `Tip Cross Crack ${i + 1}`,
      ks: {
        a: 0,
        k: {
          c: false,
          v: [[crossX1, crossY1], [mid2X, mid2Y], [crossX2, crossY2]],
          i: [[0, 0], [0, 0], [0, 0]],
          o: [[0, 0], [0, 0], [0, 0]],
        },
      },
    });
  }

  // (B) 衝撃点から5つの谷へ走るクラック
  for (let i = 0; i < 5; i++) {
    const a = innerAngles[i];
    const valX = round4(cx + Math.cos(a) * 26);
    const valY = round4(cy + Math.sin(a) * 26);
    const midX = round4(ix + (valX - ix) * 0.5 + Math.cos(a + 1.57) * 3);
    const midY = round4(iy + (valY - iy) * 0.5 + Math.sin(a + 1.57) * 3);

    rayPaths.push({
      ty: 'sh',
      nm: `Valley Crack ${i + 1}`,
      ks: {
        a: 0,
        k: {
          c: false,
          v: [[ix, iy], [midX, midY], [valX, valY]],
          i: [[0, 0], [0, 0], [0, 0]],
          o: [[0, 0], [0, 0], [0, 0]],
        },
      },
    });
  }

  // (C) 星全体を横断する蜘蛛の巣状環状クラック
  const ringScales = [0.32, 0.60, 0.85];
  for (let rIdx = 0; rIdx < ringScales.length; rIdx++) {
    const sc = ringScales[rIdx];
    const ringVerts = [];
    for (let k = 0; k < 5; k++) {
      const aOut = outerAngles[k];
      const aIn = innerAngles[k];
      ringVerts.push([
        round4(cx + Math.cos(aOut) * (62 * sc)),
        round4(cy + Math.sin(aOut) * (62 * sc)),
      ]);
      ringVerts.push([
        round4(cx + Math.cos(aIn) * (26 * sc)),
        round4(cy + Math.sin(aIn) * (26 * sc)),
      ]);
    }
    rayPaths.push({
      ty: 'sh',
      nm: `Star Web Ring ${rIdx + 1}`,
      ks: {
        a: 0,
        k: {
          c: true,
          v: ringVerts,
          i: ringVerts.map(() => [0, 0]),
          o: ringVerts.map(() => [0, 0]),
        },
      },
    });
  }

  const extraLayers = [];

  // 指示: 「ヒビが見えません」の完全解決！
  // 誤ったマスクを排除し、本体の星の直前に重ねる！
  // 濃紺スレート線幅 2.2px（くっきり鮮明）で確実に描画する！
  const crackLinesLayer = {
    ddd: 0,
    ind: 2,
    ty: 4,
    nm: `${layer.nm}-glass-crack-lines`,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: 0, s: [0] },
          { t: crackHit, s: [0] },
          { t: crackHit + 1, s: [100] },
          { t: shatterStart, s: [100] },
          { t: shatterStart + 1, s: [0] },
          { t: totalFrames, s: [0] },
        ],
      },
      r: { a: 0, k: 0 },
      p: { a: 1, k: shakePosKeyframes },
      a: { a: 0, k: [px, py, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        nm: 'All Star Crack Lines Grp',
        it: [
          ...rayPaths,
          {
            ty: 'tm',
            nm: 'Trim Paths Fast Fissure',
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
            nm: 'Crack Stroke Dark Slate',
            // 濃紺スレート色（黄色い星の上でバキッと最高コントラスト）
            c: { a: 0, k: [0.08, 0.12, 0.22, 1] },
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
    ip: crackHit,
    op: shatterStart + 2,
    st: 0,
    bm: 0,
  };

  extraLayers.push(crackLinesLayer);

  // 3. 粉砕前の星のシルエット位置に倣って配置された48破片の弾け飛び
  if (shatter) {
    const starPoints = buildStarAnatomyPoints(cx, cy);
    const shatterDur = Math.max(22, shatterEnd - shatterStart);

    for (let i = 0; i < starPoints.length; i++) {
      const pt = starPoints[i];
      const initX = pt.x;
      const initY = pt.y;

      const flyAngle = pt.angle + ((i % 3) * 0.15 - 0.15);
      const flySpeed = pt.tier === 'tip' ? 44 : pt.tier === 'edge' ? 36 : pt.tier === 'valley' ? 30 : 24;

      const targetX = Math.round(Math.max(16, Math.min(224, initX + Math.cos(flyAngle) * flySpeed)));
      const targetY = Math.round(Math.max(16, Math.min(222, initY + Math.sin(flyAngle) * flySpeed + 14)));
      const spinAngle = (i % 2 === 0 ? 1 : -1) * (180 + i * 40);

      let shardSize = 4;
      let shardColor = [0.98, 0.78, 0.05, 1];

      if (pt.tier === 'tip') {
        shardSize = 9.0;
        shardColor = [0.98, 0.75, 0.04, 1];
      } else if (pt.tier === 'edge') {
        shardSize = 6.8;
        shardColor = [1, 0.84, 0.18, 1];
      } else if (pt.tier === 'valley') {
        shardSize = 5.4;
        shardColor = [0.95, 0.72, 0.03, 1];
      } else if (pt.tier === 'body') {
        shardSize = 4.5;
        shardColor = i % 2 === 0 ? [1, 0.90, 0.35, 1] : [0.98, 0.78, 0.05, 1];
      } else {
        shardSize = 3.0;
        shardColor = [0.98, 0.82, 0.1, 1];
      }

      const p1 = [0, -shardSize];
      const p2 = [round4(shardSize * 0.75), round4(shardSize * 0.65)];
      const p3 = [round4(-shardSize * 0.65), round4(shardSize * 0.5)];

      extraLayers.push({
        ddd: 0,
        ind: (layer.ind || 1) + 210 + i,
        ty: 4,
        nm: `${layer.nm}-star-shard-${i + 1}`,
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [0] },
              { t: shatterStart, s: [100] },
              { t: shatterStart + Math.round(shatterDur * 0.6), s: [90] },
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
                s: [initX, initY, 0],
                i: { x: [0.1], y: [1] },
                o: { x: [0.2], y: [1] },
              },
              { t: shatterEnd, s: [targetX, targetY, 0] },
              { t: totalFrames, s: [targetX, targetY, 0] },
            ],
          },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: shatterStart, s: [100, 100, 100] },
              { t: shatterEnd, s: [35, 35, 100] },
              { t: totalFrames, s: [35, 35, 100] },
            ],
          },
        },
        ao: 0,
        shapes: [
          {
            ty: 'gr',
            nm: 'Star Shard Grp',
            it: [
              {
                ty: 'sh',
                nm: 'Triangle Shard',
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
                c: { a: 0, k: shardColor },
                o: { a: 0, k: 95 },
                r: 1,
              },
              {
                ty: 'st',
                nm: 'Shard Border',
                c: { a: 0, k: [0.12, 0.16, 0.25, 1] },
                o: { a: 0, k: 70 },
                w: { a: 0, k: 0.8 },
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
