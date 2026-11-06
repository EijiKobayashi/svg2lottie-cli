/**
 * すりガラス・グラスプレート・Apple風リキッドグラス（前面ガラス ＋ 背面オブジェクトぼかし屈折 ＋ 有機的液状流動 ＋ 立体エッジリム）モジュール
 */

import { round4 } from '../path-parser.mjs';

/**
 * 液体の表面張力と慣性でダイナミックにうねり流動するベジェブロブ形状キーフレームを生成する
 */
function buildLiquidBlobKeyframes(baseRadius, totalFrames = 120, waveAmp = 7.5) {
  const numPoints = 8;
  const numKeyframes = 9;
  const step = totalFrames / (numKeyframes - 1);
  const kfs = [];
  const easeInOut = { x: 0.38, y: 0.62 };

  for (let k = 0; k < numKeyframes; k++) {
    const t = Math.round(k * step);
    const timeAngle = (k / (numKeyframes - 1)) * Math.PI * 2;

    const v = [];
    const inHandles = [];
    const outHandles = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const wave =
        Math.sin(angle * 2 + timeAngle) * waveAmp +
        Math.cos(angle * 3 - timeAngle * 1.5) * (waveAmp * 0.55) +
        Math.sin(angle * 4 + timeAngle * 0.8) * (waveAmp * 0.3);
      const r = baseRadius + wave;

      const px = round4(Math.cos(angle) * r);
      const py = round4(Math.sin(angle) * r);
      v.push([px, py]);

      const tangentLen = (r * (Math.PI * 2) / numPoints) * 0.38;
      const tangAngle = angle + Math.PI / 2;
      const hx = round4(Math.cos(tangAngle) * tangentLen);
      const hy = round4(Math.sin(tangAngle) * tangentLen);

      inHandles.push([-hx, -hy]);
      outHandles.push([hx, hy]);
    }

    kfs.push({
      t,
      s: [{ c: true, v, i: inHandles, o: outHandles }],
      ...(k < numKeyframes - 1 ? { i: easeInOut, o: easeInOut } : {}),
    });
  }

  return kfs;
}

/**
 * Apple風リキッドグラスを適用する
 * レイヤーの前後関係（Lottie描画順序: 先頭が最前面、末尾が最背面）:
 * 1. [最前面] extraLayers[0]: ガラスの立体エッジリム（純白ハイライト）
 * 2. [前面] extraLayers[1]: ガラスのグロスシマー（光沢帯）
 * 3. [前面] extraLayers[2]: ガラス本体（半透明ミルキーフロストガラス）
 * 4. [ガラス直下] extraLayers[3]: ガラス越しブラー（ガラス形状でマスクされたぼやけ＆屈折レイヤー）
 * 5. [最背面] layer: 背後にある鮮やかなオブジェクト（オレンジ円、ピンクピル、シアンのドット）
 */
export function applyLiquidGlass(layer, options = {}, ctx = {}) {
  const {
    variant = 'liquid',
    blur = 20,
    tintOpacity = 68,
    start = 0,
    end = 120,
  } = options;

  const totalFrames = layer.op || 120;
  const [cx, cy] = ctx.center || layer.ks?.a?.k || [120, 120];
  const w = ctx.width || 240;
  const h = ctx.height || 240;

  const blobRadius = Math.round(Math.min(w, h) * 0.20);
  const blobKeyframes = buildLiquidBlobKeyframes(blobRadius, totalFrames, 7.5);

  // リキッドガラスの有機的浮遊モーション（中心付近を優雅に漂う円弧運動）
  const driftPoints = [
    { t: 0, s: [cx - 10, cy - 6, 0] },
    { t: 30, s: [cx + 12, cy - 12, 0] },
    { t: 60, s: [cx + 14, cy + 10, 0] },
    { t: 90, s: [cx - 12, cy + 8, 0] },
    { t: totalFrames, s: [cx - 10, cy - 6, 0] },
  ];
  const driftEase = { x: [0.4, 0.4, 0.4], y: [0.6, 0.6, 0.6] };
  const glassPosKeyframes = driftPoints.map((pt, idx) => ({
    ...pt,
    ...(idx < driftPoints.length - 1 ? { i: driftEase, o: driftEase } : {}),
  }));

  const glassScaleKeyframes = [
    { t: 0, s: [100, 100, 100], i: driftEase, o: driftEase },
    { t: 30, s: [108, 92, 100], i: driftEase, o: driftEase },
    { t: 60, s: [94, 106, 100], i: driftEase, o: driftEase },
    { t: 90, s: [106, 94, 100], i: driftEase, o: driftEase },
    { t: totalFrames, s: [100, 100, 100] },
  ];

  // =========================================================================
  // 5. 【最背面レイヤー (layer)】: 背後にある鮮やかなオブジェクト群（Backdrop）
  // オレンジの円、ピンクのピル、シアンのドットが、ガラスの完全に「後ろ」に配置される！
  // =========================================================================
  layer.shapes = [
    {
      ty: 'gr',
      nm: 'Sunset Orb',
      it: [
        {
          ty: 'el',
          nm: 'Circle Path',
          p: { a: 0, k: [-32, -26] },
          s: { a: 0, k: [76, 76] },
        },
        {
          ty: 'fl',
          nm: 'Orange Fill',
          c: { a: 0, k: [0.98, 0.42, 0.12, 1] },
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
    {
      ty: 'gr',
      nm: 'Neon Pill',
      it: [
        {
          ty: 'rc',
          nm: 'Rounded Rect',
          p: { a: 0, k: [28, 24] },
          s: { a: 0, k: [88, 42] },
          r: { a: 0, k: 21 },
        },
        {
          ty: 'fl',
          nm: 'Magenta Fill',
          c: { a: 0, k: [0.86, 0.18, 0.62, 1] },
          o: { a: 0, k: 95 },
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
    {
      ty: 'gr',
      nm: 'Cyan Accent Dot',
      it: [
        {
          ty: 'el',
          nm: 'Dot',
          p: { a: 0, k: [42, -34] },
          s: { a: 0, k: [26, 26] },
        },
        {
          ty: 'fl',
          nm: 'Cyan Fill',
          c: { a: 0, k: [0.06, 0.72, 0.88, 1] },
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

  layer.ks.p = { a: 0, k: [cx, cy, 0] };
  layer.ks.a = { a: 0, k: [0, 0, 0] };
  layer.ks.s = { a: 0, k: [100, 100, 100] };
  layer.ks.o = { a: 0, k: 95 };

  // =========================================================================
  // 4. 【ガラス越しブラー・屈折レイヤー (Frosted Blur Behind Glass)】:
  // 前面にあるガラス（Liquid Blob）の形状でクリップマスク（mode: 'a'）。
  // ガラスの真後ろにある部分だけ、奥のオブジェクトが大きくボケて（Gaussian Blur）
  // かつ屈折（108%拡大）して見える！
  // =========================================================================
  const blurredBackdropShapes = [];
  const blurTiers = [
    { scale: 0.82, op: 15 },
    { scale: 0.94, op: 14 },
    { scale: 1.06, op: 13 },
    { scale: 1.18, op: 11 },
    { scale: 1.32, op: 9 },
    { scale: 1.48, op: 7 },
    { scale: 1.66, op: 5 },
    { scale: 1.86, op: 3 },
  ];

  for (let b = 0; b < blurTiers.length; b++) {
    const tier = blurTiers[b];
    blurredBackdropShapes.push({
      ty: 'gr',
      nm: `Orb Blur Tier ${b}`,
      it: [
        {
          ty: 'el',
          nm: 'Circle',
          p: { a: 0, k: [-32, -26] },
          s: { a: 0, k: [round4(76 * tier.scale), round4(76 * tier.scale)] },
        },
        {
          ty: 'fl',
          nm: 'Orange Soft',
          c: { a: 0, k: [0.98, 0.46, 0.16, 1] },
          o: { a: 0, k: tier.op },
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
    });

    blurredBackdropShapes.push({
      ty: 'gr',
      nm: `Pill Blur Tier ${b}`,
      it: [
        {
          ty: 'rc',
          nm: 'Pill',
          p: { a: 0, k: [28, 24] },
          s: { a: 0, k: [round4(88 * tier.scale), round4(42 * tier.scale)] },
          r: { a: 0, k: round4(21 * tier.scale) },
        },
        {
          ty: 'fl',
          nm: 'Magenta Soft',
          c: { a: 0, k: [0.86, 0.24, 0.65, 1] },
          o: { a: 0, k: tier.op },
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
    });
  }

  const blurLayer = {
    ddd: 0,
    ind: 4,
    ty: 4,
    nm: `liquid-glass-frosted-blur`,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 1, k: glassPosKeyframes },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: glassScaleKeyframes.map((kf) => ({
          ...kf,
          s: [round4(kf.s[0] * 1.08), round4(kf.s[1] * 1.08), 100],
        })),
      },
    },
    ao: 0,
    masksProperties: [
      {
        inv: false,
        mode: 'a',
        pt: { a: 1, k: blobKeyframes },
        o: { a: 0, k: 100 },
        x: { a: 0, k: 0 },
        nm: 'Liquid Glass Mask',
      },
    ],
    shapes: [
      {
        ty: 'gr',
        nm: 'Blurred Backdrop Refracted',
        it: [
          ...blurredBackdropShapes,
          {
            ty: 'tr',
            p: {
              a: 1,
              k: driftPoints.map((pt, idx) => ({
                t: pt.t,
                s: [round4(-(pt.s[0] - cx)), round4(-(pt.s[1] - cy))],
                ...(idx < driftPoints.length - 1 ? { i: driftEase, o: driftEase } : {}),
              })),
            },
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
    ip: 0,
    op: totalFrames,
    st: 0,
    bm: 0,
  };

  // =========================================================================
  // 3. 【前面: ガラス本体 (Liquid Glass Body)】:
  // 半透明のミルキーフロストガラス。背後を適度に遮蔽しながら光を散乱させる！
  // =========================================================================
  const glassBodyLayer = {
    ddd: 0,
    ind: 3,
    ty: 4,
    nm: `liquid-glass-body`,
    sr: 1,
    ks: {
      o: { a: 0, k: tintOpacity },
      r: { a: 0, k: 0 },
      p: { a: 1, k: glassPosKeyframes },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: glassScaleKeyframes },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        nm: 'Glass Frost Fill Grp',
        it: [
          {
            ty: 'sh',
            nm: 'Blob Path',
            ks: { a: 1, k: blobKeyframes },
          },
          {
            ty: 'fl',
            nm: 'Milky Frost Fill',
            // Apple風フロストホワイト（背後を上品にぼかして光を散乱させる）
            c: { a: 0, k: [0.94, 0.97, 1.0, 1] },
            o: { a: 0, k: 85 },
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
    ip: 0,
    op: totalFrames,
    st: 0,
    bm: 0,
  };

  // =========================================================================
  // 2. 【前面: グロスシマー帯 (Gloss Highlight Shimmer)】:
  // =========================================================================
  const sweepDur = Math.max(26, Math.round((end - start) * 0.4));
  const sweepStart = start + 10;
  const sweepEnd = sweepStart + sweepDur;

  const shimmerLayer = {
    ddd: 0,
    ind: 2,
    ty: 4,
    nm: `liquid-glass-shimmer`,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: 0, s: [0] },
          { t: sweepStart - 2, s: [0] },
          { t: sweepStart + 4, s: [85] },
          { t: sweepEnd - 4, s: [85] },
          { t: sweepEnd, s: [0] },
          { t: totalFrames, s: [0] },
        ],
      },
      r: { a: 0, k: -35 },
      p: { a: 1, k: glassPosKeyframes },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: glassScaleKeyframes },
    },
    ao: 0,
    masksProperties: [
      {
        inv: false,
        mode: 'a',
        pt: { a: 1, k: blobKeyframes },
        o: { a: 0, k: 100 },
        x: { a: 0, k: 0 },
        nm: 'Liquid Glass Mask',
      },
    ],
    shapes: [
      {
        ty: 'gr',
        nm: 'Gloss Shimmer Band',
        it: [
          {
            ty: 'rc',
            nm: 'Sharp Highlight',
            p: {
              a: 1,
              k: [
                { t: 0, s: [-blobRadius * 1.6, 0] },
                {
                  t: sweepStart,
                  s: [-blobRadius * 1.6, 0],
                  i: { x: [0.2], y: [1] },
                  o: { x: [0.3], y: [1] },
                },
                { t: sweepEnd, s: [blobRadius * 1.6, 0] },
                { t: totalFrames, s: [blobRadius * 1.6, 0] },
              ],
            },
            s: { a: 0, k: [14, Math.round(blobRadius * 2.5)] },
            r: { a: 0, k: 3 },
          },
          {
            ty: 'fl',
            nm: 'Gloss Fill',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: { a: 0, k: 80 },
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
    ip: sweepStart - 2,
    op: sweepEnd + 2,
    st: 0,
    bm: 0,
  };

  // =========================================================================
  // 1. 【最前面: 立体エッジリム (Specular Edge Rim)】:
  // ガラスの輪郭に沿ったシャープな純白エッジ
  // =========================================================================
  const rimLayer = {
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: `liquid-glass-specular-rim`,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 1, k: glassPosKeyframes },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: glassScaleKeyframes },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        nm: 'Liquid Specular Rim',
        it: [
          {
            ty: 'sh',
            nm: 'Rim Blob Path',
            ks: { a: 1, k: blobKeyframes },
          },
          {
            ty: 'st',
            nm: 'Specular Edge Stroke',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: { a: 0, k: 95 },
            w: { a: 0, k: 2.2 },
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
    ip: 0,
    op: totalFrames,
    st: 0,
    bm: 0,
  };

  // 前面から背面の順に extraLayers を配置
  // outputLayers.unshift(...extraLayers, layer) によって：
  // extraLayers[0] (rimLayer) が [最前面]
  // extraLayers[1] (shimmerLayer) が [前面]
  // extraLayers[2] (glassBodyLayer) が [前面]
  // extraLayers[3] (blurLayer) が [ガラス直下]
  // layer (backdrop) が [最背面]
  const extraLayers = [rimLayer, shimmerLayer, glassBodyLayer, blurLayer];

  return { layer, extraLayers };
}
