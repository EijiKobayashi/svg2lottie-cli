/**
 * Lottie ネイティブ・シェイプモディファイア構築モジュール
 * After Effectsのシェイプレイヤー「追加（Add）」メニュー直結のコア機能群
 * （Trim Paths, Offset Paths, Merge Paths, Repeater, Round Corners, Gradient Fill/Stroke）
 */

import { hexToLottieColor, round4 } from './path-parser.mjs';

/**
 * 複数キーフレーム配列または静的プロパティを生成する
 * @param {Array<{ frame: number, value: number | number[] }>} [keyframes]
 * @param {any} [defaultValue]
 */
function buildKeyframedProp(keyframes, defaultValue) {
  if (Array.isArray(keyframes) && keyframes.length >= 2) {
    const k = keyframes.map((kf, i) => {
      const isLast = i === keyframes.length - 1;
      const val = Array.isArray(kf.value) ? kf.value : [kf.value];
      if (isLast) {
        return { t: kf.frame, s: val };
      }
      return {
        t: kf.frame,
        s: val,
        i: { x: [0.4], y: [1] },
        o: { x: [0.2], y: [1] },
      };
    });
    return { a: 1, k };
  }
  return { a: 0, k: defaultValue };
}

/**
 * 補間キーフレームまたは静的プロパティを生成する
 * @param {number | number[]} fromVal
 * @param {number | number[]} toVal
 * @param {number} [startFrame]
 * @param {number} [endFrame]
 */
function buildAnimProp(fromVal, toVal, startFrame, endFrame) {
  if (typeof startFrame === 'number' && typeof endFrame === 'number' && startFrame < endFrame) {
    const s = Array.isArray(fromVal) ? fromVal : [fromVal];
    const e = Array.isArray(toVal) ? toVal : [toVal];
    return {
      a: 1,
      k: [
        {
          t: startFrame,
          s,
          i: { x: [0.4], y: [1] },
          o: { x: [0.2], y: [1] },
        },
        {
          t: endFrame,
          s: e,
        },
      ],
    };
  }
  return { a: 0, k: toVal };
}

/**
 * パスのトリミング (Trim Paths / ty: "tm")
 * @param {object} cfg
 */
export function buildTrimPathsItem(cfg = {}) {
  const sStart = cfg.fromStart ?? cfg.start ?? 0;
  const sEnd = cfg.start ?? 0;
  const eStart = cfg.fromEnd ?? 0;
  const eEnd = cfg.end ?? 100;
  const offset = cfg.offset ?? 0;
  const mode = cfg.mode === 'individually' || cfg.mode === 2 ? 2 : 1;

  let sProp;
  if (Array.isArray(cfg.startKeyframes)) {
    sProp = buildKeyframedProp(cfg.startKeyframes, sEnd);
  } else if (typeof cfg.fromStart === 'number') {
    sProp = buildAnimProp(sStart, sEnd, cfg.startFrame, cfg.endFrame);
  } else {
    sProp = { a: 0, k: sEnd };
  }

  let eProp;
  if (Array.isArray(cfg.endKeyframes)) {
    eProp = buildKeyframedProp(cfg.endKeyframes, eEnd);
  } else if (typeof cfg.startFrame === 'number' && typeof cfg.endFrame === 'number') {
    eProp = buildAnimProp(eStart, eEnd, cfg.startFrame, cfg.endFrame);
  } else {
    eProp = { a: 0, k: eEnd };
  }

  let oProp;
  if (Array.isArray(cfg.offsetKeyframes)) {
    oProp = buildKeyframedProp(cfg.offsetKeyframes, offset);
  } else if (typeof cfg.fromOffset === 'number') {
    oProp = buildAnimProp(cfg.fromOffset, offset, cfg.startFrame, cfg.endFrame);
  } else {
    oProp = { a: 0, k: offset };
  }

  return {
    ty: 'tm',
    nm: cfg.nm || 'Trim Paths 1',
    s: sProp,
    e: eProp,
    o: oProp,
    m: mode,
    ix: 1,
  };
}

/**
 * パスのオフセット (Offset Paths / ty: "op")
 * @param {object} cfg
 */
export function buildOffsetPathsItem(cfg = {}) {
  // lottie-webの仕様: amountが厳密に0だと内部shapeCollectionが空になり描画が消失するため、最小値を0.01に安全クランプ
  const amount = Math.abs(cfg.amount ?? 10) < 0.01 ? 0.01 : cfg.amount ?? 10;
  const fromAmount =
    typeof cfg.fromAmount === 'number' && Math.abs(cfg.fromAmount) < 0.01
      ? 0.01
      : cfg.fromAmount;
  const ljMap = { miter: 1, round: 2, bevel: 3 };
  const lj = typeof cfg.lineJoin === 'number' ? cfg.lineJoin : ljMap[cfg.lineJoin] || 2;
  const ml = typeof cfg.miterLimit === 'object' ? cfg.miterLimit : { a: 0, k: cfg.miterLimit ?? 4 };

  const aProp =
    typeof fromAmount === 'number'
      ? buildAnimProp(fromAmount, amount, cfg.startFrame, cfg.endFrame)
      : { a: 0, k: amount };

  return {
    ty: 'op',
    nm: cfg.nm || 'Offset Paths 1',
    a: aProp,
    lj,
    ml,
    ix: 1,
  };
}

/**
 * パスの結合 (Merge Paths / ty: "mm")
 * @param {object} cfg
 */
export function buildMergePathsItem(cfg = {}) {
  const modeMap = {
    merge: 1,
    add: 2,
    subtract: 3,
    intersect: 4,
    exclude: 5,
  };
  const mm = typeof cfg.mode === 'number' ? cfg.mode : modeMap[cfg.mode] || 2;

  return {
    ty: 'mm',
    nm: cfg.nm || 'Merge Paths 1',
    mm,
    ix: 1,
  };
}

/**
 * リピーター (Repeater / ty: "rp")
 * @param {object} cfg
 */
export function buildRepeaterItem(cfg = {}) {
  const copies = cfg.copies ?? 3;
  const offset = cfg.offset ?? 0;
  const pos = cfg.position || [0, 0];
  const anchor = cfg.anchor || [0, 0];
  const scale = cfg.scale || [100, 100];
  const rot = cfg.rotation ?? 0;
  const so = cfg.startOpacity ?? 100;
  const eo = cfg.endOpacity ?? 100;

  const cProp =
    typeof cfg.fromCopies === 'number'
      ? buildAnimProp(cfg.fromCopies, copies, cfg.startFrame, cfg.endFrame)
      : { a: 0, k: copies };

  const oProp =
    typeof cfg.fromOffset === 'number'
      ? buildAnimProp(cfg.fromOffset, offset, cfg.startFrame, cfg.endFrame)
      : { a: 0, k: offset };

  const rProp =
    typeof cfg.fromRotation === 'number'
      ? buildAnimProp(cfg.fromRotation, rot, cfg.startFrame, cfg.endFrame)
      : { a: 0, k: rot };

  const pProp = cfg.fromPosition
    ? buildAnimProp(cfg.fromPosition, pos, cfg.startFrame, cfg.endFrame)
    : { a: 0, k: [pos[0], pos[1]] };

  const sProp = cfg.fromScale
    ? buildAnimProp(cfg.fromScale, scale, cfg.startFrame, cfg.endFrame)
    : { a: 0, k: [scale[0], scale[1]] };

  return {
    ty: 'rp',
    nm: cfg.nm || 'Repeater 1',
    c: cProp,
    o: oProp,
    m: 1,
    tr: {
      ty: 'tr',
      p: pProp,
      a: { a: 0, k: [anchor[0], anchor[1]] },
      s: sProp,
      r: rProp,
      so: { a: 0, k: so },
      eo: { a: 0, k: eo },
    },
    ix: 1,
  };
}

/**
 * 角を丸くする (Round Corners / ty: "rd")
 * @param {object} cfg
 */
export function buildRoundCornersItem(cfg = {}) {
  const radius = cfg.radius ?? 10;
  const fromRadius = cfg.fromRadius ?? 0;

  const rProp =
    typeof cfg.fromRadius === 'number'
      ? buildAnimProp(fromRadius, radius, cfg.startFrame, cfg.endFrame)
      : { a: 0, k: radius };

  return {
    ty: 'rd',
    nm: cfg.nm || 'Round Corners 1',
    r: rProp,
    ix: 1,
  };
}

/**
 * カラーストップ配列から Bodymovin Gradient 配列 [pos, r, g, b, ...] を生成する
 * @param {Array<{ offset: number, color: string }>} stops
 */
function buildGradientStopData(stops = []) {
  if (stops.length === 0) {
    stops = [
      { offset: 0, color: '#38bdf8' },
      { offset: 1, color: '#0284c7' },
    ];
  }
  const arr = [];
  stops.forEach((s) => {
    const pos = round4(s.offset ?? 0);
    const [r, g, b] = hexToLottieColor(s.color || '#000000');
    arr.push(pos, round4(r), round4(g), round4(b));
  });
  return arr;
}

/**
 * グラデーション塗り (Gradient Fill / ty: "gf")
 * @param {object} cfg
 */
export function buildGradientFillItem(cfg = {}) {
  const type = cfg.type === 'radial' || cfg.type === 2 ? 2 : 1;
  const start = cfg.start || [0, 0];
  const end = cfg.end || [100, 100];
  const stops = cfg.stops || [];
  const count = stops.length || 2;
  const kData = buildGradientStopData(stops);
  const opacity = cfg.opacity ?? 100;

  const sProp = cfg.fromStart
    ? buildAnimProp(cfg.fromStart, start, cfg.startFrame, cfg.endFrame)
    : { a: 0, k: [start[0], start[1]] };

  const eProp = cfg.fromEnd
    ? buildAnimProp(cfg.fromEnd, end, cfg.startFrame, cfg.endFrame)
    : { a: 0, k: [end[0], end[1]] };

  return {
    ty: 'gf',
    nm: cfg.nm || 'Gradient Fill 1',
    t: type,
    s: sProp,
    e: eProp,
    g: {
      p: count,
      k: { a: 0, k: kData },
    },
    o: { a: 0, k: opacity },
    r: 1,
    ix: 1,
  };
}

/**
 * グラデーション線 (Gradient Stroke / ty: "gs")
 * @param {object} cfg
 */
export function buildGradientStrokeItem(cfg = {}) {
  const type = cfg.type === 'radial' || cfg.type === 2 ? 2 : 1;
  const start = cfg.start || [0, 0];
  const end = cfg.end || [100, 100];
  const stops = cfg.stops || [];
  const count = stops.length || 2;
  const kData = buildGradientStopData(stops);
  const opacity = cfg.opacity ?? 100;
  const width = cfg.width ?? 4;

  const sProp = cfg.fromStart
    ? buildAnimProp(cfg.fromStart, start, cfg.startFrame, cfg.endFrame)
    : { a: 0, k: [start[0], start[1]] };

  const eProp = cfg.fromEnd
    ? buildAnimProp(cfg.fromEnd, end, cfg.startFrame, cfg.endFrame)
    : { a: 0, k: [end[0], end[1]] };

  return {
    ty: 'gs',
    nm: cfg.nm || 'Gradient Stroke 1',
    t: type,
    s: sProp,
    e: eProp,
    g: {
      p: count,
      k: { a: 0, k: kData },
    },
    o: { a: 0, k: opacity },
    w: { a: 0, k: width },
    lc: 2, // round cap
    lj: 2, // round join
    ix: 1,
  };
}

/**
 * シェイプグループの items 配列に、レイヤー設定に基づくモディファイアを統合・合成する
 * @param {any[]} items
 * @param {object} layerCfg
 * @returns {any[]}
 */
export function applyShapeModifiers(items = [], layerCfg = {}) {
  const result = [];
  const paths = [];
  let fillItem = null;
  let strokeItem = null;
  let transformItem = null;

  for (const it of items) {
    if (it.ty === 'sh') paths.push(it);
    else if (it.ty === 'fl' || it.ty === 'gf') fillItem = it;
    else if (it.ty === 'st' || it.ty === 'gs') strokeItem = it;
    else if (it.ty === 'tr') transformItem = it;
    else result.push(it);
  }

  // 1. パス群を配置
  result.unshift(...paths);

  // 2. パス変形モディファイア (Merge Paths -> Offset Paths -> Round Corners)
  if (layerCfg.mergePaths) {
    result.push(buildMergePathsItem(layerCfg.mergePaths));
  }
  if (layerCfg.offsetPaths) {
    result.push(buildOffsetPathsItem(layerCfg.offsetPaths));
  }
  if (layerCfg.roundCorners) {
    result.push(buildRoundCornersItem(layerCfg.roundCorners));
  }

  // 3. トリミングモディファイア (Trim Paths)
  if (layerCfg.trim) {
    result.push(buildTrimPathsItem(layerCfg.trim));
  }

  // 4. 塗り・グラデーション塗り (Repeaterより前に配置し、各複製コピーに塗りを適用)
  const isFillDisabled = layerCfg.fill === false || layerCfg.noFill === true;
  if (!isFillDisabled) {
    if (layerCfg.gradientFill) {
      result.push(buildGradientFillItem(layerCfg.gradientFill));
    } else if (fillItem) {
      result.push(fillItem);
    }
  }

  // 5. 線・グラデーション線 (Repeaterより前に配置し、各複製コピーに線を適用)
  if (layerCfg.gradientStroke) {
    result.push(buildGradientStrokeItem(layerCfg.gradientStroke));
  } else if (layerCfg.stroke) {
    const strokeCfg = layerCfg.stroke;
    const strokeRgba = hexToLottieColor(strokeCfg.color || '#38bdf8');
    result.push({
      ty: 'st',
      nm: 'Stroke 1',
      c: { a: 0, k: strokeRgba },
      o: { a: 0, k: strokeCfg.opacity ?? 100 },
      w: { a: 0, k: strokeCfg.width ?? 8 },
      lc: strokeCfg.lineCap === 'round' ? 2 : 1,
      lj: strokeCfg.lineJoin === 'round' ? 2 : 1,
    });
  } else if (strokeItem) {
    result.push(strokeItem);
  }

  // 6. 複製モディファイア (Repeater) — パス・塗りをまるごと配列複製！
  if (layerCfg.repeater) {
    result.push(buildRepeaterItem(layerCfg.repeater));
  }

  // 7. トランスフォーム（末尾必須）
  if (transformItem) {
    result.push(transformItem);
  } else {
    result.push({
      ty: 'tr',
      p: { a: 0, k: [0, 0] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
      r: { a: 0, k: 0 },
      o: { a: 0, k: 100 },
      sk: { a: 0, k: 0 },
      sa: { a: 0, k: 0 },
    });
  }

  return result;
}

