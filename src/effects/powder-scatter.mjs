/**
 * 粉飛散パーティクルエフェクト（Powder Ending — マルチカラー頂点サンプリング＆放射飛散）モジュール
 */

import { round4 } from '../path-parser.mjs';
import { buildBleedFadeProps } from './bleed-fade.mjs';

function collectColoredPointsFromItems(items, currentRgba, outPoints) {
  let activeColor = currentRgba;
  for (const item of items || []) {
    if (item.ty === 'fl' && item.c?.a === 0 && Array.isArray(item.c.k)) {
      activeColor = item.c.k;
    }
  }
  for (const item of items || []) {
    if (item.ty === 'sh' && item.ks?.k?.v) {
      const verts = item.ks.k.v;
      for (let i = 0; i < verts.length; i++) {
        const [x1, y1] = verts[i];
        const [x2, y2] = verts[(i + 1) % verts.length];
        outPoints.push({ x: x1, y: y1, color: activeColor });
        outPoints.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, color: activeColor });
      }
    } else if (item.ty === 'gr' && Array.isArray(item.it)) {
      collectColoredPointsFromItems(item.it, activeColor, outPoints);
    }
  }
}

/**
 * ベースLottieアニメーションに対し、指定レイヤー群の頂点・色をサンプリングして放射飛散・消滅する粉パーティクルを追加する
 * @param {object} baseLottie
 * @param {{
 *   targetLayerIds?: string[],
 *   appearFrame?: number,
 *   fadeStartFrame?: number,
 *   fadeEndFrame?: number,
 *   totalFrames?: number,
 *   particleCount?: number,
 *   loop?: boolean,
 *   colorRgba?: [number, number, number, 1]
 * }} options
 */
export function applyPowderScatter(baseLottie, options = {}) {
  const {
    targetLayerIds = [],
    appearFrame = 178,
    fadeStartFrame = 180,
    fadeEndFrame = 228,
    totalFrames = 240,
    particleCount = 240,
    loop = true,
    colorRgba = [0.149, 0.3098, 0.4549, 1],
  } = options;

  const clone = structuredClone(baseLottie);
  clone.op = totalFrames;
  clone.loop = loop;

  const targetLayers = clone.layers.filter((l) =>
    targetLayerIds.length > 0 ? targetLayerIds.includes(l.nm) : true
  );

  const sampledPoints = [];
  for (const tl of targetLayers) {
    tl.op = totalFrames;
    const syncFade = buildBleedFadeProps({
      initialOpacity: 100,
      fadeOut: { start: fadeStartFrame, end: fadeEndFrame, blur: 18, scaleTo: 103 },
    });
    if (tl.ks.o?.a === 1 && Array.isArray(tl.ks.o.k)) {
      tl.ks.o.k.push(
        {
          t: fadeStartFrame,
          s: [100],
          i: { x: [0.22], y: [1] },
          o: { x: [0.36], y: [1] },
        },
        { t: fadeEndFrame, s: [0] }
      );
    } else {
      tl.ks.o = syncFade.opacity;
    }
    tl.ef = [...(tl.ef || []), ...syncFade.effects];
    collectColoredPointsFromItems(tl.shapes, colorRgba, sampledPoints);
  }

  if (sampledPoints.length === 0) {
    sampledPoints.push({ x: clone.w / 2, y: clone.h / 2, color: colorRgba });
  }

  const cx = clone.w / 2;
  const cy = clone.h / 2;
  const maxTravel = Math.min(clone.w, clone.h) * 0.14;
  const groupCount = Math.min(28, Math.max(8, Math.ceil(particleCount / 24)));
  const perGroup = Math.max(1, Math.ceil(particleCount / groupCount));
  const baseDotRadius = Math.max(2.2, Math.min(clone.w, clone.h) * 0.006);

  const particleLayers = [];
  for (let g = 0; g < groupCount; g++) {
    const angle = (g / groupCount) * Math.PI * 2 + (g % 3) * 0.15;
    const dist = maxTravel * (0.45 + (g % 5) * 0.14);
    const dx = round4(Math.cos(angle) * dist);
    const dy = round4(Math.sin(angle) * dist - dist * 0.18); // 軽い上昇気流

    const ellipses = [];
    let groupColor = colorRgba;

    for (let p = 0; p < perGroup; p++) {
      const idx = Math.floor(((g * perGroup + p) * 13) % sampledPoints.length);
      const pt = sampledPoints[idx];
      if (p === 0 && pt.color) {
        groupColor = pt.color;
      }
      const jitterX = round4(pt.x + Math.sin(g * 17 + p * 7) * 4);
      const jitterY = round4(pt.y + Math.cos(g * 13 + p * 11) * 4);
      const size = round4(baseDotRadius * (0.7 + ((g + p) % 4) * 0.35));
      ellipses.push({
        ty: 'el',
        nm: `Dot ${p + 1}`,
        p: { a: 0, k: [jitterX, jitterY] },
        s: { a: 0, k: [size, size] },
      });
    }

    particleLayers.push({
      ddd: 0,
      ind: 1000 + g,
      ty: 4,
      nm: `powder-group-${g + 1}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: appearFrame, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: fadeStartFrame + 4, s: [92], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: fadeEndFrame, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: fadeStartFrame, s: [cx, cy, 0], i: { x: 0.16, y: 1 }, o: { x: 0.36, y: 1 } },
            {
              t: fadeEndFrame,
              s: [round4(cx + dx), round4(cy + dy), 0],
            },
          ],
        },
        a: { a: 0, k: [cx, cy, 0] },
        s: {
          a: 1,
          k: [
            {
              t: fadeStartFrame,
              s: [100, 100, 100],
              i: { x: [0.22, 0.22, 0.22], y: [1, 1, 1] },
              o: { x: [0.36, 0.36, 0.36], y: [1, 1, 1] },
            },
            { t: fadeEndFrame, s: [65, 65, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'Powder Particles',
          it: [
            ...ellipses,
            {
              ty: 'fl',
              nm: 'Powder Fill',
              c: { a: 0, k: groupColor },
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
      ip: appearFrame,
      op: totalFrames,
      st: 0,
      bm: 0,
    });
  }

  clone.layers = [...particleLayers, ...clone.layers];
  return clone;
}
