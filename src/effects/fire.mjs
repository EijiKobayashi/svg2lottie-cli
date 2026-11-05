/**
 * 炎エフェクト（外炎・内炎コアの二層メラメラうねり＋有機的熱波呼吸＋上昇火の粉）モジュール
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 本物の炎のようなメラメラ感を生成する（外炎＋高熱内炎コア＋火の粉）
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
    end = 180,
    flameColor = '#ea580c',
    coreColor = '#fef08a',
    emberCount = 8,
    intensity = 1.0,
    innerCore = true,
  } = options;

  const [cx, cy] = ctx.center || layer.ks?.a?.k || [100, 100];
  const w = ctx.width || 200;
  const h = ctx.height || 200;

  const flameRgba = hexToLottieColor(flameColor);
  const coreRgba = hexToLottieColor(coreColor);

  // 1. 外炎（本体レイヤー）：メラメラうねるスケール・スキュー・位置キーフレーム
  const dur = Math.max(20, end - start);
  const cycles = Math.max(4, Math.round(dur / 18));
  const step = Math.round(dur / (cycles * 2));

  const scaleKfs = [];
  const skewKfs = [];
  const posKfs = [];
  const easeInOut = { x: [0.33, 0.33, 0.33], y: [1, 1, 1] };
  const origPos = layer.ks?.p?.k || [cx, cy, 0];
  const px = Array.isArray(origPos) ? origPos[0] : cx;
  const py = Array.isArray(origPos) ? origPos[1] : cy;

  for (let i = 0; i <= cycles * 2; i++) {
    const t = Math.min(end, start + i * step);
    const isPeak = i % 2 === 1;
    // メラメラ伸び縮み
    const sx = isPeak ? 92 - 4 * intensity : 104 + 3 * intensity;
    const sy = isPeak ? 108 + 5 * intensity : 96 - 3 * intensity;
    // 左右のうねり（スキュー）
    const sk = (i % 4 === 1 ? 4.5 : i % 4 === 3 ? -4.5 : 0) * intensity;
    // 上下微小浮動
    const dy = isPeak ? -2.5 * intensity : 1.5 * intensity;

    scaleKfs.push({ t, s: [round4(sx), round4(sy), 100], i: easeInOut, o: easeInOut });
    skewKfs.push({ t, s: [round4(sk)], i: { x: [0.33], y: [1] }, o: { x: [0.33], y: [1] } });
    posKfs.push({ t, s: [round4(px), round4(py + dy), 0], i: easeInOut, o: easeInOut });
  }

  delete scaleKfs[scaleKfs.length - 1].i;
  delete scaleKfs[scaleKfs.length - 1].o;
  delete skewKfs[skewKfs.length - 1].i;
  delete skewKfs[skewKfs.length - 1].o;
  delete posKfs[posKfs.length - 1].i;
  delete posKfs[posKfs.length - 1].o;

  layer.ks.s = { a: 1, k: scaleKfs };
  layer.ks.sk = { a: 1, k: skewKfs };
  layer.ks.sa = { a: 0, k: 0 };
  layer.ks.p = { a: 1, k: posKfs };

  const extraLayers = [];

  // 2. 高熱内炎コアレイヤー（Inner Core）: 70%サイズで白黄色、異なる位相でメラメラ蠢く
  if (innerCore) {
    const coreLayer = structuredClone(layer);
    coreLayer.nm = `${layer.nm}-flame-core`;
    coreLayer.ind = (layer.ind || 1) + 50;

    // コアの色を coreColor（白黄）に差し替え
    for (const grp of coreLayer.shapes || []) {
      for (const it of grp.it || []) {
        if (it.ty === 'fl' && it.c) {
          it.c = { a: 0, k: coreRgba };
        }
      }
    }

    // 内炎コア用の逆位相スケール（外炎とズラすことで有機的なメラメラ炎に見える）
    const coreScaleKfs = scaleKfs.map((k, idx) => ({
      t: k.t,
      s: [round4(k.s[0] * 0.72 * (idx % 2 === 0 ? 1.06 : 0.94)), round4(k.s[1] * 0.72 * (idx % 2 === 0 ? 0.95 : 1.05)), 100],
      ...(k.i ? { i: k.i, o: k.o } : {}),
    }));
    coreLayer.ks.s = { a: 1, k: coreScaleKfs };
    extraLayers.push(coreLayer);
  }

  // 3. 立ち昇る火の粉（Ember）パーティクル
  const spreadX = Math.max(16, w * 0.2);
  const riseDist = Math.max(30, h * 0.32);
  const dotSize = round4(Math.max(3.5, Math.min(w, h) * 0.026));

  for (let i = 0; i < emberCount; i++) {
    const norm = (i / Math.max(1, emberCount - 1)) - 0.5;
    const offsetX = round4(norm * spreadX);
    const swayX = round4((i % 2 === 0 ? 1 : -1) * spreadX * 0.4);
    const riseY = round4(riseDist * (0.8 + (i % 3) * 0.3));
    const emberStart = start + i * 8;
    const emberMid = Math.round(emberStart + 22);
    const emberEnd = Math.min(end, emberStart + 52);

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
            { t: emberStart, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: emberStart + 8, s: [95], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: emberEnd, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: emberStart, s: [cx + offsetX, cy + 10, 0], i: { x: 0.42, y: 0 }, o: { x: 0.58, y: 1 } },
            { t: emberMid, s: [cx + offsetX + swayX, round4(cy - riseY * 0.5), 0], i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
            { t: emberEnd, s: [cx + offsetX - swayX * 0.5, round4(cy - riseY), 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: emberStart, s: [40, 40, 100], i: easeInOut, o: easeInOut },
            { t: emberMid, s: [130, 130, 100], i: easeInOut, o: easeInOut },
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
      op: emberEnd,
      st: 0,
      bm: 0,
    });
  }

  return { layer, extraLayers };
}
