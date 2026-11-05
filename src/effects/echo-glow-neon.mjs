/**
 * エコー（残像レイヤー）/ グロー（発光ブルーム）/ ネオン管（中空ガラス管＋点灯フリッカー）エフェクトモジュール
 */

import { hexToLottieColor } from '../path-parser.mjs';

function makeBlurEffect(blurVal) {
  return {
    ty: 29,
    nm: 'Glow Blur',
    np: 3,
    mn: 'ADBE Gaussian Blur 2',
    ix: 1,
    en: 1,
    ef: [
      { ty: 0, nm: 'Blurriness', mn: 'ADBE Gaussian Blur 2-0001', ix: 1, v: { a: 0, k: blurVal } },
      { ty: 7, nm: 'Blur Dimensions', mn: 'ADBE Gaussian Blur 2-0002', ix: 2, v: { a: 0, k: 1 } },
      { ty: 7, nm: 'Repeat Edge Pixels', mn: 'ADBE Gaussian Blur 2-0003', ix: 3, v: { a: 0, k: 0 } },
    ],
  };
}

/**
 * ネオン管のリアルな点灯フリッカー（瞬きから安定フル点灯）を生成する
 * @param {number} start
 * @param {number} end
 * @param {number} totalFrames
 * @returns {Array<object>}
 */
function buildNeonFlickerKeyframes(start = 0, end = 30, totalFrames = 120) {
  const dur = Math.max(16, end - start);
  const t0 = start;
  const t1 = Math.round(start + dur * 0.15);
  const t2 = Math.round(start + dur * 0.3);
  const t3 = Math.round(start + dur * 0.5);
  const t4 = Math.round(start + dur * 0.7);
  const t5 = Math.round(start + dur * 0.88);
  const tEnd = Math.min(end, start + dur);

  return [
    { t: 0, s: [0] },
    { t: t0, s: [0] },
    { t: t1, s: [85] },
    { t: t2, s: [10] },
    { t: t3, s: [100] },
    { t: t4, s: [30] },
    { t: t5, s: [90] },
    { t: tEnd, s: [100] },
    // 安定点灯を最終フレームまで100%維持
    { t: totalFrames, s: [100] },
  ];
}

/**
 * エコー（時間遅延残像）・グロー（発光）・ネオン管エフェクトを適用する
 * @param {object} layer
 * @param {{
 *   mode?: 'echo' | 'glow' | 'neon',
 *   color?: string,
 *   blur?: number,
 *   echoCount?: number,
 *   echoDelayFrames?: number,
 *   flicker?: boolean,
 *   tube?: boolean,
 *   start?: number,
 *   end?: number
 * }} options
 */
export function applyEchoGlowNeon(layer, options = {}) {
  const {
    mode = 'glow',
    color = '#f43f5e',
    blur = 18,
    echoCount = 2,
    echoDelayFrames = 3,
    flicker = false,
    tube = true,
    start = 5,
    end = 32,
  } = options;

  const extraLayers = [];
  const neonRgba = hexToLottieColor(color);
  const whiteRgba = [1, 1, 1, 1];
  const totalFrames = layer.op || 120;

  // 1. ネオン管モード: 鮮やかなネオン管ストローク＋ほんのり発光する薄い塗りを構成
  if (mode === 'neon' || tube) {
    layer.ks.o = { a: 1, k: buildNeonFlickerKeyframes(start, end, totalFrames) };

    for (const grp of layer.shapes || []) {
      const items = grp.it || [];
      const tr = items.find((it) => it.ty === 'tr');
      const shList = items.filter((it) => it.ty === 'sh');

      // 内部の薄いネオン発光塗り（不透明度 18%）＋ネオン管ストローク（線幅 5.5px）
      grp.it = [
        ...shList,
        {
          ty: 'fl',
          nm: 'Neon Inner Glow Fill',
          c: { a: 0, k: neonRgba },
          o: { a: 0, k: 18 },
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
          o: { a: 0, k: 80 },
          w: { a: 0, k: 14 },
          lc: 2,
          lj: 2,
        },
      ];
      if (tr) grp.it.push(tr);
    }
    extraLayers.push(bloomLayer);

    return { layer, extraLayers };
  }

  // エコーまたは汎用グロー
  if (mode === 'echo') {
    for (let i = 1; i <= echoCount; i++) {
      const clone = structuredClone(layer);
      clone.nm = `${layer.nm}-echo-${i}`;
      clone.st = (layer.st || 0) + i * echoDelayFrames;
      clone.ip = (layer.ip || 0) + i * echoDelayFrames;
      clone.ks.o = { a: 0, k: Math.max(10, Math.round(55 / i)) };
      clone.ef = [...(clone.ef || []), makeBlurEffect(blur * 0.5 * i)];
      extraLayers.push(clone);
    }
  } else {
    const glowClone = structuredClone(layer);
    glowClone.nm = `${layer.nm}-glow`;
    glowClone.ks.o = { a: 0, k: 65 };
    glowClone.ef = [...(glowClone.ef || []), makeBlurEffect(blur)];
    extraLayers.push(glowClone);
  }

  return { layer, extraLayers };
}
