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
    // 安定点灯を維持
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
    end = 28,
  } = options;

  const extraLayers = [];
  const neonRgba = hexToLottieColor(color);
  const whiteRgba = [1, 1, 1, 1];
  const totalFrames = layer.op || 180;

  // 1. ネオン管モード: 塗りつぶしを排除し、鮮やかなネオン管ストロークに変換
  if (mode === 'neon' || tube) {
    layer.ks.o = { a: 1, k: buildNeonFlickerKeyframes(start, end, totalFrames) };

    // 本体は「鮮やかなネオンカラーの太いストローク管」にする
    for (const grp of layer.shapes || []) {
      const items = grp.it || [];
      // 既存の塗りを削除
      grp.it = items.filter((it) => it.ty !== 'fl');
      // ネオンストロークを追加
      grp.it.push({
        ty: 'st',
        nm: 'Neon Tube Stroke',
        c: { a: 0, k: neonRgba },
        o: { a: 0, k: 95 },
        w: { a: 0, k: 5.5 },
        lc: 2,
        lj: 2,
      });
      // トランスフォームを末尾に保証
      const tr = items.find((it) => it.ty === 'tr');
      if (tr) {
        grp.it = grp.it.filter((it) => it.ty !== 'tr');
        grp.it.push(tr);
      }
    }

    // 2. 白熱する純白の芯ストロークレイヤー（White Inner Core）
    const coreLayer = structuredClone(layer);
    coreLayer.nm = `${layer.nm}-neon-core`;
    coreLayer.ind = (layer.ind || 1) + 80;
    for (const grp of coreLayer.shapes || []) {
      for (const it of grp.it || []) {
        if (it.ty === 'st') {
          it.c = { a: 0, k: whiteRgba };
          it.w = { a: 0, k: 2.2 };
          it.o = { a: 0, k: 100 };
        }
      }
    }
    extraLayers.push(coreLayer);

    // 3. 外側への豊かなブルーム発光レイヤー（Outer Bloom Glow）
    const bloomLayer = structuredClone(layer);
    bloomLayer.nm = `${layer.nm}-neon-bloom`;
    bloomLayer.ind = (layer.ind || 1) - 1; // 本体の背面に配置
    bloomLayer.ef = [...(bloomLayer.ef || []), makeBlurEffect(blur)];
    for (const grp of bloomLayer.shapes || []) {
      for (const it of grp.it || []) {
        if (it.ty === 'st') {
          it.c = { a: 0, k: neonRgba };
          it.w = { a: 0, k: 14 };
          it.o = { a: 0, k: 75 };
        }
      }
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
