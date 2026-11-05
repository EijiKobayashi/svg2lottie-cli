/**
 * Storyboard定義＋モジュラーエフェクト群 → Lottie JSON 構築エンジン
 */

import {
  hexToLottieColor,
  parseSvgPathToLottieShapes,
  computeShapesCenter,
} from './path-parser.mjs';
import { extractPathsWithMeta } from './svg-extractor.mjs';
import {
  applyLayerEffects,
  buildBleedFadeProps,
  buildMoveKeyframes,
  buildTrimStrokeLayer,
  applyPowderScatter,
} from './effects/index.mjs';

function buildShapeLayer(layerCfg, ind, defaultColorHex, durationFrames, canvasDims, svgResolver) {
  const colorHex = layerCfg.color || defaultColorHex || '#264f74';
  const colorRgba = hexToLottieColor(colorHex);
  const inFrame = typeof layerCfg.inFrame === 'number' ? layerCfg.inFrame : 0;
  const outFrame =
    typeof layerCfg.outFrame === 'number' ? layerCfg.outFrame : durationFrames;

  if (layerCfg.type === 'stroke' || layerCfg.trimStroke) {
    const baseStrokeLayer = buildTrimStrokeLayer({
      ind,
      id: layerCfg.id,
      ...(layerCfg.trimStroke || {}),
      colorRgba,
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
  const pathMetaList = extractPathsWithMeta(svgText, layerCfg.targetId);

  const allShapes = [];
  const shapeItems = [];
  let firstPrimaryShape = null;

  pathMetaList.forEach((meta, idx) => {
    const subShapes = parseSvgPathToLottieShapes(meta.d);
    subShapes.forEach((sh, subIdx) => {
      allShapes.push(sh);
      if (!firstPrimaryShape) {
        firstPrimaryShape = sh;
      }
      shapeItems.push({
        ty: 'sh',
        nm: `Path ${idx + 1}-${subIdx + 1}`,
        ks: { a: 0, k: sh },
        _sourceFill: meta.fill,
      });
    });
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
    shapes: [
      {
        ty: 'gr',
        nm: layerCfg.id,
        it: [
          ...shapeItems,
          {
            ty: 'fl',
            nm: 'Fill 1',
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

  // 内部メタデータのクリーンアップ
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
    outputLayers.push(layer, ...extraLayers);
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
