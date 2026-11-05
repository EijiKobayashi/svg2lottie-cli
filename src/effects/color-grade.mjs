/**
 * カラーコレクション・カラーグレーディング（ティント・彩度・明度・コントラスト）モジュール
 */

import { hexToLottieColor, round4 } from '../path-parser.mjs';

function adjustColorRgba(rgba, { tintColor, brightness = 1, saturation = 1, contrast = 1 }) {
  let [r, g, b] = tintColor ? hexToLottieColor(tintColor) : rgba;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = lum + (r - lum) * saturation;
  g = lum + (g - lum) * saturation;
  b = lum + (b - lum) * saturation;

  r = ((r - 0.5) * contrast + 0.5) * brightness;
  g = ((g - 0.5) * contrast + 0.5) * brightness;
  b = ((b - 0.5) * contrast + 0.5) * brightness;

  return [
    round4(Math.min(1, Math.max(0, r))),
    round4(Math.min(1, Math.max(0, g))),
    round4(Math.min(1, Math.max(0, b))),
    1,
  ];
}

/**
 * レイヤー内の塗り（fl）やストローク（st）の色をグレーディング調整する
 * @param {object} layer
 * @param {{ tintColor?: string, brightness?: number, saturation?: number, contrast?: number }} options
 */
export function applyColorGrade(layer, options = {}) {
  for (const group of layer.shapes || []) {
    for (const item of group.it || []) {
      if ((item.ty === 'fl' || item.ty === 'st') && item.c && item.c.a === 0) {
        item.c.k = adjustColorRgba(item.c.k, options);
      }
    }
  }
  return { layer, extraLayers: [] };
}
