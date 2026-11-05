/**
 * 一筆書き枠線アニメーション（Trim Paths）モジュール
 */

import { computeShapesCenter } from '../path-parser.mjs';
import { buildBleedFadeProps } from './bleed-fade.mjs';

/**
 * 頂点配列と線幅から Trim Paths 付きストロークシェイプレイヤーを構築する
 * @param {{
 *   ind?: number,
 *   id?: string,
 *   vertices: [number, number][],
 *   closed?: boolean,
 *   strokeWidth?: number,
 *   start?: number,
 *   end?: number,
 *   colorRgba: [number, number, number, 1],
 *   inFrame?: number,
 *   outFrame?: number,
 *   fadeOut?: { start: number, end: number, blur?: number, scaleTo?: number }
 * }} options
 */
export function buildTrimStrokeLayer(options) {
  const {
    ind = 1,
    id = 'stroke-layer',
    vertices = [
      [470, 20],
      [50, 20],
      [50, 120],
      [470, 120],
    ],
    closed = true,
    strokeWidth = 4,
    start = 0,
    end = 60,
    colorRgba = [0.149, 0.3098, 0.4549, 1],
    inFrame = 0,
    outFrame = 560,
    fadeOut,
  } = options;

  const shape = {
    c: closed,
    v: vertices,
    i: vertices.map(() => [0, 0]),
    o: vertices.map(() => [0, 0]),
  };
  const [cx, cy] = computeShapesCenter([shape]);
  const fadeProps = buildBleedFadeProps({
    initialOpacity: 100,
    fadeOut,
  });

  const trimKfs = [];
  if (start > 0) {
    trimKfs.push({
      t: 0,
      s: [0],
      i: { x: [0.5], y: [0.5] },
      o: { x: [0.5], y: [0.5] },
    });
  }
  trimKfs.push(
    { t: start, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
    { t: end, s: [100] }
  );

  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: id,
    sr: 1,
    ks: {
      o: fadeProps.opacity,
      r: { a: 0, k: 0 },
      p: { a: 0, k: [cx, cy, 0] },
      a: { a: 0, k: [cx, cy, 0] },
      s: fadeProps.scale,
    },
    ao: 0,
    ef: fadeProps.effects,
    shapes: [
      {
        ty: 'gr',
        nm: id,
        it: [
          {
            ty: 'sh',
            nm: 'Path 1',
            ks: { a: 0, k: shape },
          },
          {
            ty: 'tm',
            nm: 'Trim Paths 1',
            s: { a: 0, k: 0 },
            e: { a: 1, k: trimKfs },
            o: { a: 0, k: 0 },
            m: 1,
          },
          {
            ty: 'st',
            nm: 'Stroke 1',
            c: { a: 0, k: colorRgba },
            o: { a: 0, k: 100 },
            w: { a: 0, k: strokeWidth },
            lc: 2,
            lj: 2,
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
    ip: inFrame,
    op: outFrame,
    st: 0,
    bm: 0,
  };
}

/**
 * 既存シェイプレイヤーに Trim Paths 要素を追加する
 * @param {object} layer
 * @param {{ start?: number, end?: number }} options
 */
export function applyTrimStroke(layer, options = {}) {
  const { start = 0, end = 60 } = options;
  const trimItem = {
    ty: 'tm',
    nm: 'Trim Paths',
    s: { a: 0, k: 0 },
    e: {
      a: 1,
      k: [
        { t: start, s: [0], i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [1] } },
        { t: end, s: [100] },
      ],
    },
    o: { a: 0, k: 0 },
    m: 1,
  };
  const group = layer.shapes?.[0];
  if (group && Array.isArray(group.it)) {
    group.it.splice(Math.max(0, group.it.length - 1), 0, trimItem);
  }
  return { layer, extraLayers: [] };
}

