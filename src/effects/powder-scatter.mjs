/**
 * 粉飛散パーティクルエフェクト（Powder Ending）モジュール
 */

import { round4 } from '../path-parser.mjs';
import { buildBleedFadeProps } from './bleed-fade.mjs';

function collectSamplePointsFromLayer(layer) {
  const points = [];
  for (const group of layer.shapes || []) {
    for (const item of group.it || []) {
      if (item.ty === 'sh' && item.ks?.k?.v) {
        const verts = item.ks.k.v;
        for (let i = 0; i < verts.length; i++) {
          const [x1, y1] = verts[i];
          const [x2, y2] = verts[(i + 1) % verts.length];
          points.push([x1, y1]);
          points.push([(x1 + x2) / 2, (y1 + y2) / 2]);
        }
      }
    }
  }
  return points;
}

/**
 * ベースLottieアニメーションに対し、指定レイヤー群と同期して飛散・消滅する粉パーティクルを追加する
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
    appearFrame = 628,
    fadeStartFrame = 630,
    fadeEndFrame = 690,
    totalFrames = 720,
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

  const rawPoints = [];
  for (const tl of targetLayers) {
    tl.op = totalFrames;
    const syncFade = buildBleedFadeProps({
      initialOpacity: 100,
      fadeOut: { start: fadeStartFrame, end: fadeEndFrame, blur: 16, scaleTo: 100 },
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
    rawPoints.push(...collectSamplePointsFromLayer(tl));
  }

  if (rawPoints.length === 0) {
    rawPoints.push([clone.w / 2, clone.h / 2]);
  }

  const cx = clone.w / 2;
  const cy = clone.h / 2;
  const groupCount = Math.min(24, Math.max(4, Math.ceil(particleCount / 30)));
  const perGroup = Math.max(1, Math.ceil(particleCount / groupCount));

  const particleLayers = [];
  for (let g = 0; g < groupCount; g++) {
    const angle = (g / groupCount) * Math.PI * 2;
    const dist = 16 + (g % 5) * 7;
    const dx = round4(Math.cos(angle) * dist);
    const dy = round4(Math.sin(angle) * dist);

    const ellipses = [];
    for (let p = 0; p < perGroup; p++) {
      const idx = (g * perGroup + p) % rawPoints.length;
      const [px, py] = rawPoints[idx];
      const jitterX = round4(px + Math.sin(g * 17 + p * 7) * 2.5);
      const jitterY = round4(py + Math.cos(g * 13 + p * 11) * 2.5);
      const size = round4(1.4 + ((g + p) % 3) * 0.6);
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
            { t: fadeStartFrame, s: [90], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
            { t: fadeEndFrame, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: fadeStartFrame, s: [cx, cy, 0], i: { x: 0.22, y: 1 }, o: { x: 0.36, y: 1 } },
            {
              t: fadeEndFrame,
              s: [
                Math.min(clone.w - 4, Math.max(4, cx + dx)),
                Math.min(clone.h - 4, Math.max(4, cy + dy)),
                0,
              ],
            },
          ],
        },
        a: { a: 0, k: [cx, cy, 0] },
        s: { a: 0, k: [100, 100, 100] },
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
              c: { a: 0, k: colorRgba },
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
