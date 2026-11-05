/**
 * Ultraキー（グリーンスクリーン / クロマキー特定色透過）モジュール
 */

import { hexToLottieColor } from '../path-parser.mjs';

function colorDistance(c1, c2) {
  return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

/**
 * 指定したキーカラー（デフォルト #00ff00）と許容距離内の色を持つパス要素を自動除去する
 * @param {object} layer
 * @param {{ keyColor?: string, tolerance?: number }} options
 */
export function applyUltraKey(layer, options = {}) {
  const keyRgba = hexToLottieColor(options.keyColor || '#00ff00');
  const tolerance = typeof options.tolerance === 'number' ? options.tolerance : 0.25;

  for (const group of layer.shapes || []) {
    if (!Array.isArray(group.it)) continue;
    group.it = group.it.filter((item) => {
      if (item.ty === 'sh' && item._sourceFill) {
        try {
          const itemRgba = hexToLottieColor(item._sourceFill);
          if (colorDistance(itemRgba, keyRgba) <= tolerance) {
            return false;
          }
        } catch {
          return true;
        }
      }
      return true;
    });
    for (const item of group.it) {
      delete item._sourceFill;
    }
  }
  return { layer, extraLayers: [] };
}
