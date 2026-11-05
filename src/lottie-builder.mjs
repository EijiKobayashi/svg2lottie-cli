/**
 * Storyboard定義＋モジュラーエフェクト群 → Lottie JSON 構築エンジン
 * （viewBox自動縮小スケーリング・マルチカラー保持・パーツ個別中心Staggerアニメーション対応）
 */

import {
  hexToLottieColor,
  parseSvgPathToLottieShapes,
  scaleLottieShapes,
  computeShapesCenter,
  round4,
} from './path-parser.mjs';
import { extractPathsWithMeta, extractViewBox } from './svg-extractor.mjs';
import {
  applyLayerEffects,
  buildBleedFadeProps,
  buildMoveKeyframes,
  buildTrimStrokeLayer,
  applyPowderScatter,
} from './effects/index.mjs';

function safeHexToRgba(hex, fallbackRgba) {
  if (!hex) return fallbackRgba;
  try {
    return hexToLottieColor(hex);
  } catch {
    return fallbackRgba;
  }
}

function buildPartGroupTransform(partCenter, idx, staggerCfg) {
  const [px, py] = partCenter;
  if (!staggerCfg || !(staggerCfg.delayFrames > 0)) {
    return {
      ty: 'tr',
      p: { a: 0, k: [px, py] },
      a: { a: 0, k: [px, py] },
      s: { a: 0, k: [100, 100] },
      r: { a: 0, k: 0 },
      o: { a: 0, k: 100 },
      sk: { a: 0, k: 0 },
      sa: { a: 0, k: 0 },
    };
  }

  const start = round4((staggerCfg.start || 0) + idx * staggerCfg.delayFrames);
  const dur = staggerCfg.durationFrames || 34;
  const tOver = round4(start + dur * 0.58);
  const end = round4(start + dur);
  const fromScale = staggerCfg.fromScale ?? 0;
  const overScale = staggerCfg.overshootScale ?? 112;

  const scKfs = [];
  const opKfs = [];
  if (start > 0) {
    scKfs.push({
      t: 0,
      s: [fromScale, fromScale],
      i: { x: [0.16, 0.16], y: [1, 1] },
      o: { x: [0.34, 0.34], y: [1, 1] },
    });
    opKfs.push({
      t: 0,
      s: [0],
      i: { x: [0.22], y: [1] },
      o: { x: [0.36], y: [1] },
    });
  }
  scKfs.push(
    {
      t: start,
      s: [fromScale, fromScale],
      i: { x: [0.16, 0.16], y: [1, 1] },
      o: { x: [0.34, 0.34], y: [1, 1] },
    },
    {
      t: tOver,
      s: [overScale, overScale],
      i: { x: [0.34, 0.34], y: [1, 1] },
      o: { x: [0.34, 0.34], y: [1, 1] },
    },
    {
      t: end,
      s: [100, 100],
    }
  );
  opKfs.push(
    {
      t: start,
      s: [0],
      i: { x: [0.22], y: [1] },
      o: { x: [0.36], y: [1] },
    },
    {
      t: round4(start + dur * 0.65),
      s: [100],
    }
  );

  return {
    ty: 'tr',
    p: { a: 0, k: [px, py] },
    a: { a: 0, k: [px, py] },
    s: { a: 1, k: scKfs },
    r: { a: 0, k: 0 },
    o: { a: 1, k: opKfs },
    sk: { a: 0, k: 0 },
    sa: { a: 0, k: 0 },
  };
}

function buildShapeLayer(layerCfg, ind, defaultColorHex, durationFrames, canvasDims, svgResolver) {
  const fallbackColorHex = layerCfg.color || defaultColorHex || '#264f74';
  const fallbackRgba = hexToLottieColor(fallbackColorHex);
  const preserveColors = Boolean(layerCfg.preserveColors);
  const staggerCfg = layerCfg.stagger || null;
  const inFrame = typeof layerCfg.inFrame === 'number' ? layerCfg.inFrame : 0;
  const outFrame =
    typeof layerCfg.outFrame === 'number' ? layerCfg.outFrame : durationFrames;

  if (layerCfg.type === 'stroke' || layerCfg.trimStroke) {
    const baseStrokeLayer = buildTrimStrokeLayer({
      ind,
      id: layerCfg.id,
      ...(layerCfg.trimStroke || {}),
      colorRgba: fallbackRgba,
      inFrame,
      outFrame,
      fadeOut: layerCfg.fadeOut,
    });
    return applyLayerEffects(baseStrokeLayer, layerCfg.effects || [], {
      width: canvasDims.width,
      height: canvasDims.height,
      center: [canvasDims.width / 2, canvasDims.height / 2],
    });
  }

  const svgText = svgResolver(layerCfg.svg);
  const vb = extractViewBox(svgText);
  const scaleX = vb.width > 0 ? canvasDims.width / vb.width : 1;
  const scaleY = vb.height > 0 ? canvasDims.height / vb.height : 1;

  const pathMetaList = extractPathsWithMeta(svgText, layerCfg.targetId, {
    keepWhitePaths: Boolean(layerCfg.keepWhitePaths),
    pathRange: layerCfg.pathRange,
    pathIndices: layerCfg.pathIndices,
  });

  const allShapes = [];
  const flatShapeItems = [];
  const partGroups = [];
  let firstPrimaryShape = null;

  pathMetaList.forEach((meta, idx) => {
    const rawSubShapes = parseSvgPathToLottieShapes(meta.d);
    const subShapes = scaleLottieShapes(rawSubShapes, scaleX, scaleY);
    const pathShItems = [];
    subShapes.forEach((sh, subIdx) => {
      allShapes.push(sh);
      if (!firstPrimaryShape) {
        firstPrimaryShape = sh;
      }
      const shItem = {
        ty: 'sh',
        nm: `Path ${idx + 1}-${subIdx + 1}`,
        ks: { a: 0, k: sh },
        _sourceFill: meta.fill,
      };
      flatShapeItems.push(shItem);
      pathShItems.push(shItem);
    });

    if ((preserveColors || staggerCfg) && pathShItems.length > 0) {
      const itemRgba = preserveColors
        ? safeHexToRgba(meta.fill, fallbackRgba)
        : fallbackRgba;
      const partCenter = computeShapesCenter(
        subShapes,
        canvasDims.width / 2,
        canvasDims.height / 2
      );
      partGroups.push({
        ty: 'gr',
        nm: `${layerCfg.id}-part-${idx + 1}`,
        it: [
          ...pathShItems,
          {
            ty: 'fl',
            nm: `Fill ${idx + 1}`,
            c: { a: 0, k: itemRgba },
            o: { a: 0, k: 100 },
            r: 1,
          },
          buildPartGroupTransform(partCenter, idx, staggerCfg),
        ],
      });
    }
  });

  const [cx, cy] = computeShapesCenter(
    allShapes,
    canvasDims.width / 2,
    canvasDims.height / 2
  );

  const fadeProps = buildBleedFadeProps({
    fadeIn: layerCfg.fadeIn,
    fadeOut: layerCfg.fadeOut,
    initialOpacity: layerCfg.initialOpacity,
    clipMaskShape: layerCfg.clipMask ? firstPrimaryShape : undefined,
  });

  const positionProp = layerCfg.move
    ? buildMoveKeyframes({
        cx,
        cy,
        dx: layerCfg.move.dx ?? 0,
        dy: layerCfg.move.dy ?? 0,
        start: layerCfg.move.start ?? 0,
        end: layerCfg.move.end ?? 60,
        overshoot: layerCfg.move.overshoot ?? 0,
      })
    : { a: 0, k: [cx, cy, 0] };

  const shapesArray =
    (preserveColors || staggerCfg) && partGroups.length > 0
      ? partGroups
      : [
          {
            ty: 'gr',
            nm: layerCfg.id,
            it: [
              ...flatShapeItems,
              {
                ty: 'fl',
                nm: 'Fill 1',
                c: { a: 0, k: fallbackRgba },
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
        ];

  const baseLayer = {
    ddd: 0,
    ind,
    ty: 4,
    nm: layerCfg.id,
    sr: 1,
    ks: {
      o: fadeProps.opacity,
      r: { a: 0, k: 0 },
      p: positionProp,
      a: { a: 0, k: [cx, cy, 0] },
      s: fadeProps.scale,
    },
    ao: 0,
    ef: fadeProps.effects,
    masksProperties: fadeProps.masksProperties,
    shapes: shapesArray,
    ip: inFrame,
    op: outFrame,
    st: 0,
    bm: 0,
  };

  const result = applyLayerEffects(baseLayer, layerCfg.effects || [], {
    width: canvasDims.width,
    height: canvasDims.height,
    center: [cx, cy],
  });

  for (const group of result.layer.shapes || []) {
    for (const it of group.it || []) {
      delete it._sourceFill;
    }
  }

  return result;
}

/**
 * StoryboardConfig と SVGリゾルバから LottieAnimation JSON オブジェクトを構築する
 * @param {object} config
 * @param {(svgPath: string) => string} svgResolver
 */
export function buildLottieFromStoryboard(config, svgResolver) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid storyboard config');
  }
  const width = Number(config.width) || 520;
  const height = Number(config.height) || 140;
  const fps = Number(config.fps) || 60;
  const durationFrames = Number(config.durationFrames) || 560;
  const name = config.name || 'animation';
  const defaultColor = config.color || '#264f74';

  const outputLayers = [];
  const rawLayers = Array.isArray(config.layers) ? config.layers : [];

  rawLayers.forEach((layerCfg, idx) => {
    const { layer, extraLayers } = buildShapeLayer(
      layerCfg,
      idx + 1,
      defaultColor,
      durationFrames,
      { width, height },
      svgResolver
    );
    // 先に定義されたレイヤーを背面、後に定義されたレイヤー（およびハイライト・波紋）を前面に配置
    outputLayers.unshift(...extraLayers, layer);
  });

  outputLayers.forEach((l, i) => {
    l.ind = i + 1;
  });

  return {
    v: '5.12.2',
    fr: fps,
    ip: 0,
    op: durationFrames,
    w: width,
    h: height,
    nm: name,
    ddd: 0,
    loop: Boolean(config.loop),
    assets: [],
    layers: outputLayers,
    markers: Array.isArray(config.markers) ? config.markers : [],
  };
}

/**
 * ベースLottieに粉飛散エンディング（powder-scatter.mjs）を付加した派生Lottie JSONを返す
 * @param {object} baseLottie
 * @param {object} config
 */
export function appendPowderEnding(baseLottie, config) {
  const colorRgba = hexToLottieColor(config?.color || '#264f74');
  return applyPowderScatter(baseLottie, {
    ...(config?.powderEnding || {}),
    colorRgba,
  });
}
