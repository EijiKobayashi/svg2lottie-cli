/**
 * フェードイン・フェードアウト＆滲んだフェード（ガウスブラー＋全方位拡縮＋加算マスク）モジュール
 */

const EASE_IN = { x: [0.22], y: [1] };
const EASE_OUT = { x: [0.36], y: [1] };
const EASE_3D_IN = { x: [0.22, 0.22, 0.22], y: [1, 1, 1] };
const EASE_3D_OUT = { x: [0.36, 0.36, 0.36], y: [1, 1, 1] };

/**
 * 滲んだフェードイン／フェードアウトの Lottie プロパティを構築する
 * @param {{
 *   fadeIn?: { start: number, end: number, blur?: number, scaleFrom?: number },
 *   fadeOut?: { start: number, end: number, blur?: number, scaleTo?: number },
 *   initialOpacity?: number,
 *   clipMaskShape?: { c: boolean, v: [number, number][], i: [number, number][], o: [number, number][] }
 * }} options
 */
export function buildBleedFadeProps(options = {}) {
  const { fadeIn, fadeOut, initialOpacity, clipMaskShape } = options;
  const startOpacity =
    typeof initialOpacity === 'number' ? initialOpacity : fadeIn ? 0 : 100;

  // 1. Opacity (o)
  const opKfs = [];
  if (fadeIn) {
    if (fadeIn.start > 0) {
      opKfs.push({
        t: 0,
        s: [startOpacity],
        i: { x: [0.5], y: [0.5] },
        o: { x: [0.5], y: [0.5] },
      });
    }
    opKfs.push(
      { t: fadeIn.start, s: [startOpacity], i: EASE_IN, o: EASE_OUT },
      { t: fadeIn.end, s: [100], i: EASE_IN, o: EASE_OUT }
    );
  }
  if (fadeOut) {
    if (!fadeIn && fadeOut.start > 0) {
      opKfs.push({
        t: 0,
        s: [startOpacity],
        i: { x: [0.5], y: [0.5] },
        o: { x: [0.5], y: [0.5] },
      });
    }
    opKfs.push(
      { t: fadeOut.start, s: [100], i: EASE_IN, o: EASE_OUT },
      { t: fadeOut.end, s: [0] }
    );
  } else if (opKfs.length > 0) {
    delete opKfs[opKfs.length - 1].i;
    delete opKfs[opKfs.length - 1].o;
  }

  const opacity =
    opKfs.length > 0 ? { a: 1, k: opKfs } : { a: 0, k: startOpacity };

  // 2. Scale (s) — センターから全方位拡縮
  const scKfs = [];
  const inScale = fadeIn && typeof fadeIn.scaleFrom === 'number' ? fadeIn.scaleFrom : 100;
  const outScale = fadeOut && typeof fadeOut.scaleTo === 'number' ? fadeOut.scaleTo : 100;

  if (fadeIn && inScale !== 100) {
    if (fadeIn.start > 0) {
      scKfs.push({
        t: 0,
        s: [inScale, inScale, 100],
        i: EASE_3D_IN,
        o: EASE_3D_OUT,
      });
    }
    scKfs.push(
      { t: fadeIn.start, s: [inScale, inScale, 100], i: EASE_3D_IN, o: EASE_3D_OUT },
      { t: fadeIn.end, s: [100, 100, 100], i: EASE_3D_IN, o: EASE_3D_OUT }
    );
  }
  if (fadeOut && outScale !== 100) {
    scKfs.push(
      { t: fadeOut.start, s: [100, 100, 100], i: EASE_3D_IN, o: EASE_3D_OUT },
      { t: fadeOut.end, s: [outScale, outScale, 100] }
    );
  } else if (scKfs.length > 0) {
    delete scKfs[scKfs.length - 1].i;
    delete scKfs[scKfs.length - 1].o;
  }

  const scale =
    scKfs.length > 0 ? { a: 1, k: scKfs } : { a: 0, k: [100, 100, 100] };

  // 3. Gaussian Blur (ty: 29)
  const blurKfs = [];
  const inBlur = fadeIn ? (fadeIn.blur ?? 24) : 0;
  const outBlur = fadeOut ? (fadeOut.blur ?? 24) : 0;

  if (fadeIn && inBlur > 0) {
    if (fadeIn.start > 0) {
      blurKfs.push({ t: 0, s: [inBlur], i: EASE_IN, o: EASE_OUT });
    }
    blurKfs.push(
      { t: fadeIn.start, s: [inBlur], i: EASE_IN, o: EASE_OUT },
      { t: fadeIn.end, s: [0], i: EASE_IN, o: EASE_OUT }
    );
  }
  if (fadeOut && outBlur > 0) {
    blurKfs.push(
      { t: fadeOut.start, s: [0], i: EASE_IN, o: EASE_OUT },
      { t: fadeOut.end, s: [outBlur] }
    );
  } else if (blurKfs.length > 0) {
    delete blurKfs[blurKfs.length - 1].i;
    delete blurKfs[blurKfs.length - 1].o;
  }

  const effects =
    blurKfs.length > 0
      ? [
          {
            ty: 29,
            nm: 'Gaussian Blur',
            np: 3,
            mn: 'ADBE Gaussian Blur 2',
            ix: 1,
            en: 1,
            ef: [
              {
                ty: 0,
                nm: 'Blurriness',
                mn: 'ADBE Gaussian Blur 2-0001',
                ix: 1,
                v: { a: 1, k: blurKfs },
              },
              {
                ty: 7,
                nm: 'Blur Dimensions',
                mn: 'ADBE Gaussian Blur 2-0002',
                ix: 2,
                v: { a: 0, k: 1 },
              },
              {
                ty: 7,
                nm: 'Repeat Edge Pixels',
                mn: 'ADBE Gaussian Blur 2-0003',
                ix: 3,
                v: { a: 0, k: 0 },
              },
            ],
          },
        ]
      : [];

  const masksProperties = clipMaskShape
    ? [
        {
          inv: false,
          mode: 'a',
          pt: { a: 0, k: clipMaskShape },
          o: { a: 0, k: 100 },
          x: { a: 0, k: 0 },
          nm: 'Clip Mask',
        },
      ]
    : [];

  return { opacity, scale, effects, masksProperties };
}

/**
 * レイヤーに滲んだフェードイン／アウトを適用する
 * @param {object} layer
 * @param {object} options
 */
export function applyBleedFade(layer, options = {}) {
  const props = buildBleedFadeProps(options);
  layer.ks.o = props.opacity;
  if (props.scale.a === 1) {
    layer.ks.s = props.scale;
  }
  layer.ef = [...(layer.ef || []), ...props.effects];
  if (props.masksProperties.length > 0) {
    layer.masksProperties = [...(layer.masksProperties || []), ...props.masksProperties];
  }
  return { layer, extraLayers: [] };
}

