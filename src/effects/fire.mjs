/**
 * 炎エフェクト（点P空間アニメーション基礎準拠: 凹凸のベジェ波送り ＋ 先端の縦伸び・ちぎれ ＋ 二層メラメラ燃焼）モジュール
 * 参考: https://blog.tenp-kukan.com/9474/
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

/**
 * 炎のベジェパス頂点群に「下から上へ抜ける熱対流の波送り」モーフィングを施す
 * @param {object} baseShape - { c: true, v: [...], i: [...], o: [...] }
 * @param {number} totalFrames
 * @param {{ cycles?: number, intensity?: number, phaseShift?: number, scale?: number }} opts
 * @returns {Array<{ t: number, s: [object], i?: object, o?: object }>}
 */
function buildFlamePathKeyframes(baseShape, totalFrames = 120, opts = {}) {
  const {
    cycles = 2,
    intensity = 1.0,
    phaseShift = 0,
    scale = 1.0,
  } = opts;

  // 頂点群のY座標の最小・最大を計測
  let minY = Infinity;
  let maxY = -Infinity;
  let centerX = 0;
  for (const [vx, vy] of baseShape.v) {
    if (vy < minY) minY = vy;
    if (vy > maxY) maxY = vy;
    centerX += vx;
  }
  centerX /= Math.max(1, baseShape.v.length);
  const height = Math.max(10, maxY - minY);

  const numKeyframes = 13; // 12区間で滑らかなベジェ補間
  const step = totalFrames / (numKeyframes - 1);
  const kfs = [];
  const easeInOutShape = { x: 0.35, y: 0.65 };

  for (let k = 0; k < numKeyframes; k++) {
    const t = Math.round(k * step);
    const progress = (k / (numKeyframes - 1)) * cycles; // 0 〜 cycles
    const timeAngle = progress * Math.PI * 2 + phaseShift;

    const newV = [];
    const newI = [];
    const newO = [];

    for (let idx = 0; idx < baseShape.v.length; idx++) {
      const [vx, vy] = baseShape.v[idx];
      const [ix, iy] = baseShape.i[idx] || [0, 0];
      const [ox, oy] = baseShape.o[idx] || [0, 0];

      // u: 炎の底面が 0.0、先端が 1.0
      const u = Math.max(0, Math.min(1, (maxY - vy) / height));

      // 点P空間の波送り: 高さ u と 時間 timeAngle の進行波
      // 波が下から上へ移動: phi = u * 2.4 * PI - timeAngle
      const wavePhi = u * Math.PI * 2.4 - timeAngle;

      // 振幅: 底面は地面に固定(小)、中腹〜上部で激しくうねる
      const ampX = (u < 0.15 ? u * 12 : 2.5 + Math.sin(u * Math.PI * 0.9) * 7.5) * intensity;
      const dx = Math.sin(wavePhi) * ampX;

      // 縦方向の熱リフト: 上部ほど熱対流で引っ張られる
      const liftY = -Math.pow(u, 1.4) * (4.5 + Math.cos(wavePhi) * 3.5) * intensity;

      // 中心からのスケール適用（内炎用）
      const scaledX = centerX + (vx + dx - centerX) * scale;
      const scaledY = maxY - (maxY - (vy + liftY)) * scale;

      newV.push([round4(scaledX), round4(scaledY)]);
      newI.push([round4(ix * scale), round4(iy * scale)]);
      newO.push([round4(ox * scale), round4(oy * scale)]);
    }

    const morphedShape = {
      c: baseShape.c !== false,
      v: newV,
      i: newI,
      o: newO,
    };

    kfs.push({
      t,
      s: [morphedShape],
      ...(k < numKeyframes - 1 ? { i: easeInOutShape, o: easeInOutShape } : {}),
    });
  }

  // 始点と終点の形状を完全一致させてシームレスループを保証
  kfs[kfs.length - 1].s = [structuredClone(kfs[0].s[0])];

  return kfs;
}

/**
 * 点P空間「火のアニメーション基礎」理論に準拠した本物の炎エフェクトを適用する
 * 1. 炎のベジェ頂点そのものが下から上へと波打つ「波送りモーフィング」
 * 2. 先端が縦に伸びてくびれ、独立した火の玉になる「ちぎれ（Flame Tear-Off）」
 * 3. 外炎（橙赤）と高熱内炎コア（白黄）の二層温度燃焼
 * 4. 乱流に乗って舞い上がる火の粉（Ember）
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
    emberCount = 8,
    intensity = 1.3,
    innerCore = true,
  } = options;

  const totalFrames = layer.op || 120;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [120, 120];
  const w = ctx.width || 240;
  const h = ctx.height || 240;

  const flameRgba = hexToLottieColor(flameColor);
  const coreRgba = hexToLottieColor(coreColor);

  // 1. 本体のベジェパスを抽出し、「下から上へ抜ける波送り」モーフィングに置き換える
  let baseShape = null;
  function processShapes(items) {
    for (const it of items || []) {
      if (it.ty === 'sh' && it.ks?.k?.v) {
        if (!baseShape) baseShape = structuredClone(it.ks.k);
        it.ks = {
          a: 1,
          k: buildFlamePathKeyframes(it.ks.k, totalFrames, {
            cycles: 2,
            intensity,
            phaseShift: 0,
            scale: 1.0,
          }),
        };
      }
      if (it.ty === 'fl') {
        it.c = { a: 0, k: flameRgba };
      }
      if (it.ty === 'gr' && Array.isArray(it.it)) {
        processShapes(it.it);
      }
    }
  }
  processShapes(layer.shapes || []);

  // もしパスが見つからなかった場合でもダミーのベースパスを用意してコア生成を保証
  if (!baseShape) {
    baseShape = { c: true, v: [[cx, cy - 40], [cx + 30, cy + 30], [cx - 30, cy + 30]], i: [[0,0],[0,0],[0,0]], o: [[0,0],[0,0],[0,0]] };
  }

  // トランスフォームは微小な熱対流呼吸のみに抑え、波打ちはパス変形に委ねる
  const dur = Math.max(24, end - start);
  const breathCycles = 2;
  const breathStep = Math.round(dur / (breathCycles * 2));
  const scaleKfs = [];
  const easeInOut = { x: [0.35, 0.35, 0.35], y: [0.65, 0.65, 0.65] };

  for (let i = 0; i <= breathCycles * 2; i++) {
    const t = Math.min(totalFrames, Math.round(start + i * breathStep));
    const isStretch = i % 2 === 1;
    const sx = isStretch ? 97 : 103;
    const sy = isStretch ? 104 : 96;
    scaleKfs.push({ t, s: [sx, sy, 100], ...(i < breathCycles * 2 ? { i: easeInOut, o: easeInOut } : {}) });
  }
  scaleKfs[scaleKfs.length - 1].s = scaleKfs[0].s;

  layer.ks.s = { a: 1, k: scaleKfs };
  layer.ks.o = { a: 0, k: 100 };
  if (!layer.ks.p || layer.ks.p.a === 0) {
    layer.ks.p = { a: 0, k: [cx, cy, 0] };
  }

  const extraLayers = [];

  // 2. 高熱内炎コア（Inner Core）: 内部で二層燃焼する白黄色のコア
  if (innerCore && baseShape) {
    const coreLayer = structuredClone(layer);
    coreLayer.nm = `${layer.nm}-flame-core`;
    coreLayer.ind = (layer.ind || 1) - 1; // 本体の手前に描画

    function updateCoreShapes(items) {
      for (const it of items || []) {
        if (it.ty === 'sh' && baseShape) {
          it.ks = {
            a: 1,
            k: buildFlamePathKeyframes(baseShape, totalFrames, {
              cycles: 2,
              intensity: intensity * 0.85,
              phaseShift: Math.PI * 0.45,
              scale: 0.62,
            }),
          };
        }
        if (it.ty === 'fl') {
          it.c = { a: 0, k: coreRgba };
          it.o = { a: 0, k: 95 };
        }
        if (it.ty === 'gr' && Array.isArray(it.it)) {
          updateCoreShapes(it.it);
        }
      }
    }
    updateCoreShapes(coreLayer.shapes || []);
    extraLayers.push(coreLayer);
  }

  // 3. 点P空間の真髄「先端がちぎれて独立した火の玉になる」（Flame Tear-Off）
  const tearCycles = 2;
  const tearInterval = Math.round(dur / tearCycles);

  for (let c = 0; c < tearCycles; c++) {
    const tearStart = start + 12 + c * tearInterval;
    const tearPinch = tearStart + 10;
    const tearEnd = tearStart + 32;

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
            {
              t: tearStart,
              s: [cx, cy - 36, 0],
              i: { x: [0.42, 0.42, 0.42], y: [0, 0, 0] },
              o: { x: [0.58, 0.58, 0.58], y: [1, 1, 1] },
            },
            {
              t: tearPinch,
              s: [cx + (c % 2 === 0 ? 5 : -5), cy - 56, 0],
              i: { x: [0.22, 0.22, 0.22], y: [1, 1, 1] },
              o: { x: [0.36, 0.36, 0.36], y: [1, 1, 1] },
            },
            { t: tearEnd, s: [cx + (c % 2 === 0 ? 10 : -10), cy - 92, 0] },
            { t: totalFrames, s: [cx, cy - 92, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: tearStart, s: [35, 95, 100], i: easeInOut, o: easeInOut },
            { t: tearPinch, s: [60, 70, 100], i: easeInOut, o: easeInOut },
            { t: tearEnd, s: [10, 10, 100] },
            { t: totalFrames, s: [10, 10, 100] },
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
              s: { a: 0, k: [16, 22] },
            },
            {
              ty: 'fl',
              nm: 'Tear Fill',
              c: {
                a: 1,
                k: [
                  { t: tearStart, s: coreRgba },
                  { t: tearEnd, s: flameRgba },
                  { t: totalFrames, s: flameRgba },
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

  // 4. 上昇する火の粉（Ember）パーティクル: 乱流の弧を描きながら舞い上がる
  const spreadX = Math.max(16, w * 0.18);
  const riseDist = Math.max(40, h * 0.42);
  const dotSize = round4(Math.max(3.5, Math.min(w, h) * 0.026));

  for (let i = 0; i < emberCount; i++) {
    const eStart = start + Math.round((i * (dur * 0.85)) / emberCount);
    const eDur = Math.round(22 + (i % 3) * 6);
    const eEnd = Math.min(totalFrames, eStart + eDur);
    const dir = i % 2 === 0 ? 1 : -1;
    const startOffset = ((i % 4) - 1.5) * (spreadX * 0.45);
    const sway = dir * (spreadX * (0.6 + (i % 3) * 0.25));

    extraLayers.push({
      ddd: 0,
      ind: (layer.ind || 1) + 200 + i,
      ty: 4,
      nm: `${layer.nm}-ember-${i + 1}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: eStart, s: [0] },
            { t: eStart + 4, s: [90] },
            { t: eEnd - 3, s: [85] },
            { t: eEnd, s: [0] },
            { t: totalFrames, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            {
              t: eStart,
              s: [round4(cx + startOffset), round4(cy - 10), 0],
              i: { x: [0.2, 0.2, 0.2], y: [1, 1, 1] },
              o: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] },
            },
            {
              t: Math.round(eStart + eDur * 0.5),
              s: [round4(cx + startOffset + sway * 0.6), round4(cy - 10 - riseDist * 0.55), 0],
              i: { x: [0.2, 0.2, 0.2], y: [1, 1, 1] },
              o: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] },
            },
            {
              t: eEnd,
              s: [round4(cx + startOffset + sway), round4(cy - 10 - riseDist), 0],
            },
            {
              t: totalFrames,
              s: [round4(cx + startOffset + sway), round4(cy - 10 - riseDist), 0],
            },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: eStart, s: [100, 100, 100] },
            { t: eEnd, s: [30, 30, 100] },
            { t: totalFrames, s: [30, 30, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Ember Dot',
          it: [
            {
              ty: 'el',
              nm: 'Dot',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [dotSize, dotSize] },
            },
            {
              ty: 'fl',
              nm: 'Fill',
              c: { a: 0, k: coreRgba },
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
      ip: eStart,
      op: totalFrames,
      st: 0,
      bm: 0,
    });
  }

  return { layer, extraLayers };
}
