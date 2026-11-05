/**
 * 炎エフェクト（点P空間アニメーション基礎準拠: 凹凸の波送り ＋ 先端の縦伸び・ちぎれ ＋ 二層メラメラ燃焼）モジュール
 * 参考: https://blog.tenp-kukan.com/9474/
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 点P空間「火のアニメーション基礎」理論に準拠した本物の炎エフェクトを適用する
 * 1. 下から上へ凹凸の波を送る（Wave propagation）
 * 2. 先端が縦に伸びてくびれ、ちぎれて独立した火の玉になる（Flame tear-off）
 * 3. 外炎（橙赤）と高熱内炎コア（白黄）の二層温度燃焼
 *
 * @param {object} layer
 * @param {{
 *   start?: number,
 *   end?: number,
 *   flameColor?: string,
 *   coreColor?: string,
 *   emberCount?: number,
 *   intensity?: number,
 *   innerCore?: boolean
 * }} options
 * @param {{ width?: number, height?: number, center?: [number, number] }} ctx
 */
export function applyFire(layer, options = {}, ctx = {}) {
  const {
    start = 0,
    end = 120,
    flameColor = '#ea580c',
    coreColor = '#fef08a',
    emberCount = 6,
    intensity = 1.2,
    innerCore = true,
  } = options;

  const totalFrames = layer.op || 120;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [120, 120];
  const w = ctx.width || 240;
  const h = ctx.height || 240;

  const flameRgba = hexToLottieColor(flameColor);
  const coreRgba = hexToLottieColor(coreColor);

  // 1. 本体の「凹凸の波送り」（下から上へ熱対流が抜けていく周期的な縦伸び・くびれ・左右S字うねり）
  const dur = Math.max(24, end - start);
  const waveCycles = 4;
  const step = Math.round(dur / (waveCycles * 2));

  const scaleKfs = [];
  const skewKfs = [];
  const posKfs = [];
  const easeInOut = { x: [0.33, 0.33, 0.33], y: [1, 1, 1] };

  for (let i = 0; i <= waveCycles * 2; i++) {
    const t = Math.min(end, start + i * step);
    const isStretch = i % 2 === 1;

    // 縦にグッと伸びる時（Stretch: X縮み、Y伸び）、先端がくびれる
    const sx = isStretch ? 90 - 4 * intensity : 105 + 3 * intensity;
    const sy = isStretch ? 112 + 6 * intensity : 94 - 4 * intensity;

    // 左右への有機的なS字の波送り（スキュー）
    const sk = (i % 4 === 1 ? 5 : i % 4 === 3 ? -5 : 0) * intensity;

    // 上へ昇っていく熱対流の微小リフト
    const dy = isStretch ? -4 * intensity : 2 * intensity;

    scaleKfs.push({ t, s: [round4(sx), round4(sy), 100], i: easeInOut, o: easeInOut });
    skewKfs.push({ t, s: [round4(sk)], i: { x: [0.33], y: [1] }, o: { x: [0.33], y: [1] } });
    posKfs.push({ t, s: [round4(cx), round4(cy + dy), 0], i: easeInOut, o: easeInOut });
  }

  // 最終フレームまでループ接続を保証
  if (scaleKfs[scaleKfs.length - 1].t < totalFrames) {
    scaleKfs.push({ t: totalFrames, s: scaleKfs[0].s });
    skewKfs.push({ t: totalFrames, s: skewKfs[0].s });
    posKfs.push({ t: totalFrames, s: posKfs[0].s });
  }
  delete scaleKfs[scaleKfs.length - 2].i;
  delete scaleKfs[scaleKfs.length - 2].o;
  delete skewKfs[skewKfs.length - 2].i;
  delete skewKfs[skewKfs.length - 2].o;
  delete posKfs[posKfs.length - 2].i;
  delete posKfs[posKfs.length - 2].o;

  layer.ks.s = { a: 1, k: scaleKfs };
  layer.ks.sk = { a: 1, k: skewKfs };
  layer.ks.sa = { a: 0, k: 0 };
  layer.ks.p = { a: 1, k: posKfs };
  layer.ks.o = { a: 0, k: 100 };

  const extraLayers = [];

  // 2. 高熱内炎コア（Inner Core）: 白黄色で外炎の中心で燃え盛る二層構造
  if (innerCore) {
    const coreLayer = structuredClone(layer);
    coreLayer.nm = `${layer.nm}-flame-core`;
    coreLayer.ind = (layer.ind || 1) + 50;

    for (const grp of coreLayer.shapes || []) {
      for (const it of grp.it || []) {
        if (it.ty === 'fl' && it.c) {
          it.c = { a: 0, k: coreRgba };
        }
      }
    }

    // 内炎コアは外炎の65%サイズで、波を逆位相で送る（二重のうねり）
    const coreScaleKfs = scaleKfs.map((k, idx) => ({
      t: k.t,
      s: [
        round4(k.s[0] * 0.65 * (idx % 2 === 0 ? 1.08 : 0.92)),
        round4(k.s[1] * 0.65 * (idx % 2 === 0 ? 0.92 : 1.08)),
        100,
      ],
      ...(k.i ? { i: k.i, o: k.o } : {}),
    }));
    coreLayer.ks.s = { a: 1, k: coreScaleKfs };
    extraLayers.push(coreLayer);
  }

  // 3. 点P空間の真髄「先端がちぎれて独立した火の玉になる」（Flame Tear-Off）
  // 炎の先端からくびれて分離し、上へシュッと加速して消滅する火の玉を2周期生成
  const tearCycles = 2;
  const tearInterval = Math.round(dur / tearCycles);

  for (let c = 0; c < tearCycles; c++) {
    const tearStart = start + 18 + c * tearInterval;
    const tearPinch = tearStart + 10; // くびれ・分離の瞬間
    const tearEnd = tearStart + 28;   // 上空で消滅

    extraLayers.push({
      ddd: 0,
      ind: (layer.ind || 1) + 150 + c,
      ty: 4,
      nm: `${layer.nm}-flame-tear-${c + 1}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: tearStart, s: [0] },
            { t: tearPinch, s: [100] },
            { t: tearEnd, s: [0] },
            { t: totalFrames, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: tearStart, s: [cx, cy - 32, 0], i: { x: 0.42, y: 0 }, o: { x: 0.58, y: 1 } },
            { t: tearPinch, s: [cx + (c % 2 === 0 ? 4 : -4), cy - 52, 0], i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
            { t: tearEnd, s: [cx + (c % 2 === 0 ? 8 : -8), cy - 85, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            // ちぎれる直前は縦に引き伸ばされ、ちぎれた後は丸くなって縮小消滅
            { t: tearStart, s: [35, 90, 100], i: easeInOut, o: easeInOut },
            { t: tearPinch, s: [55, 65, 100], i: easeInOut, o: easeInOut },
            { t: tearEnd, s: [15, 15, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Tear Shape',
          it: [
            {
              ty: 'el',
              nm: 'Tear Ellipse',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [18, 24] },
            },
            {
              ty: 'fl',
              nm: 'Tear Fill',
              c: {
                a: 1,
                k: [
                  { t: tearStart, s: coreRgba },
                  { t: tearEnd, s: flameRgba },
                ],
              },
              o: { a: 0, k: 95 },
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
      ip: tearStart,
      op: totalFrames,
      st: 0,
      bm: 0,
    });
  }

  // 4. 上昇する火の粉（Ember）パーティクル
  const spreadX = Math.max(16, w * 0.18);
  const riseDist = Math.max(30, h * 0.35);
  const dotSize = round4(Math.max(3.5, Math.min(w, h) * 0.026));

  for (let i = 0; i < emberCount; i++) {
    const norm = (i / Math.max(1, emberCount - 1)) - 0.5;
    const offsetX = round4(norm * spreadX);
    const swayX = round4((i % 2 === 0 ? 1 : -1) * spreadX * 0.45);
    const riseY = round4(riseDist * (0.8 + (i % 3) * 0.3));
    const emberStart = start + i * 10;
    const emberMid = Math.round(emberStart + 22);
    const emberEnd = Math.min(end, emberStart + 50);

    extraLayers.push({
      ddd: 0,
      ind: (layer.ind || 1) + 300 + i,
      ty: 4,
      nm: `${layer.nm}-fire-ember-${i + 1}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: emberStart, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: emberStart + 6, s: [95], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: emberEnd, s: [0] },
            { t: totalFrames, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: emberStart, s: [cx + offsetX, cy + 5, 0], i: { x: 0.42, y: 0 }, o: { x: 0.58, y: 1 } },
            { t: emberMid, s: [cx + offsetX + swayX, round4(cy - riseY * 0.5), 0], i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
            { t: emberEnd, s: [cx + offsetX - swayX * 0.5, round4(cy - riseY), 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: emberStart, s: [40, 40, 100], i: easeInOut, o: easeInOut },
            { t: emberMid, s: [120, 120, 100], i: easeInOut, o: easeInOut },
            { t: emberEnd, s: [10, 10, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Ember Glow Dot',
          it: [
            {
              ty: 'el',
              nm: 'Ember Circle',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [dotSize, dotSize] },
            },
            {
              ty: 'fl',
              nm: 'Flame Color Transition',
              c: {
                a: 1,
                k: [
                  { t: emberStart, s: coreRgba, i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
                  { t: emberEnd, s: flameRgba },
                ],
              },
              o: { a: 0, k: 100 },
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
      ip: emberStart,
      op: totalFrames,
      st: 0,
      bm: 0,
    });
  }

  return { layer, extraLayers };
}
