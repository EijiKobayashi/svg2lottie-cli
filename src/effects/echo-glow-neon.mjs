/**
 * エコー（残像レイヤー）/ グロー（発光ブルーム）/ ネオン管（点灯フリッカー）エフェクトモジュール
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
 * ネオン管のリアルな点灯フリッカー（不透明度キーフレーム）を生成する
 * @param {number} start
 * @param {number} end
 * @returns {Array<object>}
 */
function buildNeonFlickerKeyframes(start = 0, end = 36) {
  const dur = Math.max(16, end - start);
  const t0 = start;
  const t1 = Math.round(start + dur * 0.12);
  const t2 = Math.round(start + dur * 0.24);
  const t3 = Math.round(start + dur * 0.42);
  const t4 = Math.round(start + dur * 0.6);
  const t5 = Math.round(start + dur * 0.78);
  const t6 = Math.min(end, start + dur);

  return [
    { t: t0, s: [0] },
    { t: t1, s: [85] },
    { t: t2, s: [15] },
    { t: t3, s: [100] },
    { t: t4, s: [35] },
    { t: t5, s: [92] },
    { t: t6, s: [100] },
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
 *   start?: number,
 *   end?: number
 * }} options
 */
export function applyEchoGlowNeon(layer, options = {}) {
  const {
    mode = 'glow',
    color,
    blur = 18,
    echoCount = 2,
    echoDelayFrames = 3,
    flicker = false,
    start = 0,
    end = 36,
  } = options;

  const extraLayers = [];
  const rgba = color ? hexToLottieColor(color) : null;

  // ネオンモードまたは明示的なフリッカー指定時は、本体に点灯フリッカーを付与
  if (mode === 'neon' || flicker) {
    layer.ks.o = { a: 1, k: buildNeonFlickerKeyframes(start, end) };
  }

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
    // グロー（多層発光ブルーム）
    const glowClone = structuredClone(layer);
    glowClone.nm = `${layer.nm}-${mode}-glow`;
    glowClone.ks.o = mode === 'neon' || flicker
      ? { a: 1, k: buildNeonFlickerKeyframes(start, end) }
      : { a: 0, k: mode === 'neon' ? 85 : 65 };
    glowClone.ef = [...(glowClone.ef || []), makeBlurEffect(blur)];
    if (rgba) {
      for (const group of glowClone.shapes || []) {
        for (const it of group.it || []) {
          if ((it.ty === 'fl' || it.ty === 'st') && it.c) {
            it.c = { a: 0, k: rgba };
          }
        }
      }
    }
    extraLayers.push(glowClone);
  }

  return { layer, extraLayers };
}
