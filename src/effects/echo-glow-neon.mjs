/**
 * エコー（残像レイヤー）/ グロー（発光ブルーム）/ ネオン管エフェクトモジュール
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
 * エコー（時間遅延残像）・グロー（発光）・ネオン管エフェクトを適用する
 * @param {object} layer
 * @param {{
 *   mode?: 'echo' | 'glow' | 'neon',
 *   color?: string,
 *   blur?: number,
 *   echoCount?: number,
 *   echoDelayFrames?: number
 * }} options
 */
export function applyEchoGlowNeon(layer, options = {}) {
  const {
    mode = 'glow',
    color,
    blur = 18,
    echoCount = 2,
    echoDelayFrames = 3,
  } = options;

  const extraLayers = [];
  const rgba = color ? hexToLottieColor(color) : null;

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
    glowClone.nm = `${layer.nm}-${mode}`;
    glowClone.ks.o = { a: 0, k: mode === 'neon' ? 85 : 65 };
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
