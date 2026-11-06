/**
 * エコー・グロー・ネオン管エフェクトモジュール
 * （中空ガラス管・白コア芯・多重ブルーム発光・ドラマチックな放電点火・呼吸パルス）
 */

import { hexToLottieColor } from '../path-parser.mjs';

function makeBlurEffect(blurRadius = 16) {
  return {
    ty: 29,
    nm: 'Gaussian Blur',
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
        v: { a: 0, k: blurRadius },
      },
      {
        ty: 7,
        nm: 'Blur Dimensions',
        mn: 'ADBE Gaussian Blur 2-0002',
        ix: 2,
        v: { a: 0, k: 3 },
      },
      {
        ty: 7,
        nm: 'Repeat Edge Pixels',
        mn: 'ADBE Gaussian Blur 2-0003',
        ix: 3,
        v: { a: 0, k: 1 },
      },
    ],
  };
}

/**
 * 映画のようなドラマチックな点火放電フリッカーと点灯後の生き生きとしたプラズマ脈動キーフレームを生成する
 */
function buildNeonPulseKeyframes(start = 10, totalFrames = 120) {
  const kfs = [
    { t: 0, s: [35] }, // 0fでもネオン管が見えている
    { t: start, s: [35] },
    // 1. 最初の放電パルス（バチッ！）
    { t: start + 2, s: [75] },
    { t: start + 4, s: [20] },
    // 2. 激しい放電ストロボ（チッチッ！）
    { t: start + 7, s: [90] },
    { t: start + 9, s: [30] },
    { t: start + 12, s: [95] },
    // 3. 一瞬の静寂タメ
    { t: start + 14, s: [25] },
    // 4. ガツンと100%全開フル点灯！
    { t: start + 17, s: [100] },
  ];

  // 点灯後の微細なプラズマ呼吸パルス（95% 〜 100%）
  const pulseStart = start + 18;
  const pulseDur = totalFrames - pulseStart;
  const cycles = 4;
  const step = pulseDur / (cycles * 2);

  for (let c = 1; c <= cycles * 2; c++) {
    const t = Math.min(totalFrames - 1, Math.round(pulseStart + c * step));
    const val = c % 2 === 1 ? 93 : 100;
    kfs.push({ t, s: [val] });
  }

  kfs.push({ t: totalFrames, s: [100] });
  return kfs;
}

/**
 * 本物のネオン管構造（白熱コア芯＋鮮やかネオン管＋大気ブルーム＋内部ガス充填）を構築する
 * @param {object} layer
 * @param {{
 *   mode?: 'echo' | 'glow' | 'neon',
 *   color?: string,
 *   blur?: number,
 *   flicker?: boolean,
 *   tube?: boolean,
 *   start?: number,
 *   end?: number
 * }} options
 * @param {{ center?: [number, number] }} ctx
 */
export function applyEchoGlowNeon(layer, options = {}, ctx = {}) {
  const {
    mode = 'neon',
    color = '#f43f5e',
    blur = 18,
    flicker = true,
    tube = true,
    start = 10,
  } = options;

  const extraLayers = [];
  const neonRgba = hexToLottieColor(color);
  const whiteRgba = [1, 1, 1, 1];
  const totalFrames = layer.op || 120;

  // 1. ネオン管モード: 鮮やかなネオン管ストローク＋ほんのり発光する薄い塗りを構成
  if (mode === 'neon' || tube) {
    layer.ks.o = { a: 1, k: buildNeonPulseKeyframes(start, totalFrames) };

    for (const grp of layer.shapes || []) {
      const items = grp.it || [];
      const tr = items.find((it) => it.ty === 'tr');
      const shList = items.filter((it) => it.ty === 'sh');

      // 内部の薄いネオン発光塗り（不透明度 22%）＋ネオン管ストローク（線幅 5.5px）
      grp.it = [
        ...shList,
        {
          ty: 'fl',
          nm: 'Neon Inner Glow Fill',
          c: { a: 0, k: neonRgba },
          o: { a: 0, k: 22 },
          r: 1,
        },
        {
          ty: 'st',
          nm: 'Neon Tube Stroke',
          c: { a: 0, k: neonRgba },
          o: { a: 0, k: 95 },
          w: { a: 0, k: 5.5 },
          lc: 2,
          lj: 2,
        },
      ];
      if (tr) grp.it.push(tr);
    }

    // 2. 白熱する純白の芯ストロークレイヤー（White Inner Core）
    const coreLayer = structuredClone(layer);
    coreLayer.nm = `${layer.nm}-neon-core`;
    coreLayer.ind = (layer.ind || 1) + 80;
    for (const grp of coreLayer.shapes || []) {
      const items = grp.it || [];
      const tr = items.find((it) => it.ty === 'tr');
      const shList = items.filter((it) => it.ty === 'sh');
      grp.it = [
        ...shList,
        {
          ty: 'st',
          nm: 'White Core Stroke',
          c: { a: 0, k: whiteRgba },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 2.2 },
          lc: 2,
          lj: 2,
        },
      ];
      if (tr) grp.it.push(tr);
    }
    extraLayers.push(coreLayer);

    // 3. 外側への豊かなブルーム発光レイヤー（Outer Bloom Glow）
    const bloomLayer = structuredClone(layer);
    bloomLayer.nm = `${layer.nm}-neon-bloom`;
    bloomLayer.ind = (layer.ind || 1) - 1;
    bloomLayer.ef = [...(bloomLayer.ef || []), makeBlurEffect(blur)];
    for (const grp of bloomLayer.shapes || []) {
      const items = grp.it || [];
      const tr = items.find((it) => it.ty === 'tr');
      const shList = items.filter((it) => it.ty === 'sh');
      grp.it = [
        ...shList,
        {
          ty: 'st',
          nm: 'Bloom Stroke',
          c: { a: 0, k: neonRgba },
          o: { a: 0, k: 85 },
          w: { a: 0, k: 16 },
          lc: 2,
          lj: 2,
        },
      ];
      if (tr) grp.it.push(tr);
    }
    extraLayers.push(bloomLayer);

    return { layer, extraLayers };
  }

  return { layer, extraLayers };
}
