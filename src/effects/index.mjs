/**
 * キラーエフェクト統一レジストリ（全17種レイヤーエフェクト＋粉飛散エンディング）
 */

import { applyCrossDissolve } from './cross-dissolve.mjs';
import { applyBleedFade, buildBleedFadeProps } from './bleed-fade.mjs';
import { applyWipe } from './wipe.mjs';
import { applySlidePushPull, buildMoveKeyframes } from './slide-push-pull.mjs';
import { applyPopIn } from './pop-in.mjs';
import { applyTrimStroke, buildTrimStrokeLayer } from './trim-stroke.mjs';
import { applyZoomSlideSpin } from './zoom-slide-spin.mjs';
import { applyTransform } from './transform.mjs';
import { applySpeedControl } from './speed-control.mjs';
import { applyColorGrade } from './color-grade.mjs';
import { applyMask } from './mask.mjs';
import { applyUltraKey } from './ultra-key.mjs';
import { applyEchoGlowNeon } from './echo-glow-neon.mjs';
import { applyLiquidGlass } from './liquid-glass.mjs';
import { applyGlassCrack } from './glass-crack.mjs';
import { applyFire } from './fire.mjs';
import { applyWater } from './water.mjs';
import { applySnowfallLoop } from './snowfall-loop.mjs';
import { applyPowderScatter } from './powder-scatter.mjs';

export const EFFECT_REGISTRY = Object.freeze({
  'cross-dissolve': applyCrossDissolve,
  'bleed-fade': applyBleedFade,
  wipe: applyWipe,
  'slide-push-pull': applySlidePushPull,
  'pop-in': applyPopIn,
  'trim-stroke': applyTrimStroke,
  'zoom-slide-spin': applyZoomSlideSpin,
  transform: applyTransform,
  'speed-control': applySpeedControl,
  'color-grade': applyColorGrade,
  mask: applyMask,
  'ultra-key': applyUltraKey,
  'echo-glow-neon': applyEchoGlowNeon,
  'liquid-glass': applyLiquidGlass,
  'glass-crack': applyGlassCrack,
  fire: applyFire,
  water: applyWater,
  'snowfall-loop': applySnowfallLoop,
  'powder-scatter': applyPowderScatter,
});

/**
 * 登録されている全キラーエフェクト識別名の一覧を返す
 * @returns {string[]}
 */
export function listEffects() {
  return Object.keys(EFFECT_REGISTRY);
}

/**
 * レイヤーに対して effects 配列のエフェクト群を順番に適用し、付随レイヤーと共に返す
 * @param {object} layer
 * @param {Array<{ type: string, [key: string]: any }>} effects
 * @param {object} ctx
 * @returns {{ layer: object, extraLayers: object[] }}
 */
export function applyLayerEffects(layer, effects = [], ctx = {}) {
  const allExtraLayers = [];
  let currentLayer = layer;

  for (const effectConfig of effects) {
    if (!effectConfig || !effectConfig.type) continue;
    const handler = EFFECT_REGISTRY[effectConfig.type];
    if (!handler) {
      throw new Error(`Unknown effect type: ${effectConfig.type}`);
    }
    const res = handler(currentLayer, effectConfig, ctx);
    if (res && res.layer) {
      currentLayer = res.layer;
    }
    if (res && Array.isArray(res.extraLayers)) {
      allExtraLayers.push(...res.extraLayers);
    }
  }

  return { layer: currentLayer, extraLayers: allExtraLayers };
}

export {
  buildBleedFadeProps,
  buildMoveKeyframes,
  buildTrimStrokeLayer,
  applyPowderScatter,
};
