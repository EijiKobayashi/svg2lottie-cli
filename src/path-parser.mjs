/**
 * SVG Path(d) & HEXカラー → Lottieベジェ頂点・中心座標変換モジュール
 */

const TOKEN_RE = /([a-zA-Z])|([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/g;

/**
 * 数値を小数点4桁に丸める
 * @param {number} n
 * @returns {number}
 */
export function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * 3次元プロパティ（位置p・スケールs）用の安全なイージングハンドルを生成する
 */
export function makeEase3D(ix = 0.35, iy = 1, ox = 0.35, oy = 1) {
  return {
    i: { x: [ix, ix, ix], y: [iy, iy, iy] },
    o: { x: [ox, ox, ox], y: [oy, oy, oy] },
  };
}

/**
 * 1次元プロパティ（不透明度o・回転r）用の安全なイージングハンドルを生成する
 */
export function makeEase1D(ix = 0.35, iy = 1, ox = 0.35, oy = 1) {
  return {
    i: { x: [ix], y: [iy] },
    o: { x: [ox], y: [oy] },
  };
}

/**
 * #RGB または #RRGGBB を Lottie 正規化 RGBA 配列 [r, g, b, 1] に変換する
 * @param {string} hex
 * @returns {[number, number, number, 1]}
 */
export function hexToLottieColor(hex) {
  if (typeof hex !== 'string') {
    throw new Error(`Invalid hex color: ${String(hex)}`);
  }
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const full =
    clean.length === 3
      ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
      : clean;
  const num = Number.parseInt(full, 16);
  const r = round4(((num >> 16) & 255) / 255);
  const g = round4(((num >> 8) & 255) / 255);
  const b = round4((num & 255) / 255);
  return [r, g, b, 1];
}

function tokenizePath(d) {
  const tokens = [];
  for (const match of d.matchAll(TOKEN_RE)) {
    if (match[1]) {
      tokens.push({ type: 'cmd', val: match[1] });
    } else {
      tokens.push({ type: 'num', val: Number.parseFloat(match[2]) });
    }
  }
  return tokens;
}

function arcToCubicSegments(x1, y1, rxIn, ryIn, phiDeg, fa, fs, x2, y2) {
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) {
    return [[x1, y1, x2, y2, x2, y2]];
  }

  const phi = (phiDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  const lam = x1pSq / rxSq + y1pSq / rySq;
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  const sign = fa === fs ? -1 : 1;
  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const den = rxSq * y1pSq + rySq * x1pSq;
  const coef = sign * Math.sqrt(den === 0 ? 0 : num / den);

  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  function angle(ux, uy, vx, vy) {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const ang = Math.acos(Math.min(1, Math.max(-1, dot / (len || 1))));
    return ux * vy - uy * vx < 0 ? -ang : ang;
  }

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );

  if (!fs && dTheta > 0) dTheta -= 2 * Math.PI;
  if (fs && dTheta < 0) dTheta += 2 * Math.PI;

  const segs = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segs;
  const alpha = (4 / 3) * Math.tan(delta / 4);

  const result = [];
  let t = theta1;
  for (let i = 0; i < segs; i++) {
    const cos1 = Math.cos(t);
    const sin1 = Math.sin(t);
    const cos2 = Math.cos(t + delta);
    const sin2 = Math.sin(t + delta);

    const p1x = cx + rx * (cosPhi * cos1 - sinPhi * sin1);
    const p1y = cy + ry * (sinPhi * cos1 + cosPhi * sin1);
    const p2x = cx + rx * (cosPhi * cos2 - sinPhi * sin2);
    const p2y = cy + ry * (sinPhi * cos2 + cosPhi * sin2);

    const dx1 = -rx * (cosPhi * sin1 + sinPhi * cos1);
    const dy1 = -ry * (sinPhi * sin1 - cosPhi * cos1);
    const dx2v = -rx * (cosPhi * sin2 + sinPhi * cos2);
    const dy2v = -ry * (sinPhi * sin2 - cosPhi * cos2);

    result.push([
      p1x + alpha * dx1,
      p1y + alpha * dy1,
      p2x - alpha * dx2v,
      p2y - alpha * dy2v,
      p2x,
      p2y,
    ]);
    t += delta;
  }
  return result;
}

/**
 * SVG Path の d 属性文字列を Lottie Shape ({ c, v, i, o }) 配列に変換する
 * @param {string} d
 * @returns {Array<{ c: boolean, v: [number, number][], i: [number, number][], o: [number, number][] }>}
 */
export function parseSvgPathToLottieShapes(d) {
  if (!d || typeof d !== 'string') return [];
  const tokens = tokenizePath(d);
  let idx = 0;

  const shapes = [];
  let current = null;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastCmd = '';
  let lastCtrlX = 0;
  let lastCtrlY = 0;

  function flushSubpath(closed = false) {
    if (!current || current.v.length === 0) return;
    if (closed && current.v.length > 1) {
      const first = current.v[0];
      const last = current.v[current.v.length - 1];
      if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-3) {
        current.i[0] = current.i[current.i.length - 1];
        current.v.pop();
        current.i.pop();
        current.o.pop();
      }
    }
    current.c = closed;
    shapes.push({
      c: current.c,
      v: current.v.map(([x, y]) => [round4(x), round4(y)]),
      i: current.i.map(([x, y]) => [round4(x), round4(y)]),
      o: current.o.map(([x, y]) => [round4(x), round4(y)]),
    });
    current = null;
  }

  function addCubic(c1x, c1y, c2x, c2y, x, y) {
    const prevIdx = current.v.length - 1;
    const [px, py] = current.v[prevIdx];
    current.o[prevIdx] = [c1x - px, c1y - py];
    current.v.push([x, y]);
    current.i.push([c2x - x, c2y - y]);
    current.o.push([0, 0]);
    cx = x;
    cy = y;
  }

  function addLine(x, y) {
    current.v.push([x, y]);
    current.i.push([0, 0]);
    current.o.push([0, 0]);
    cx = x;
    cy = y;
  }

  function nextNum() {
    return tokens[idx++].val;
  }

  function hasNum() {
    return idx < tokens.length && tokens[idx].type === 'num';
  }

  let cmd = '';
  while (idx < tokens.length) {
    if (tokens[idx].type === 'cmd') {
      cmd = tokens[idx++].val;
    }
    const isRel = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();

    if (upper === 'M') {
      flushSubpath(false);
      const x = nextNum() + (isRel ? cx : 0);
      const y = nextNum() + (isRel ? cy : 0);
      current = { c: false, v: [[x, y]], i: [[0, 0]], o: [[0, 0]] };
      cx = x;
      cy = y;
      sx = x;
      sy = y;
      lastCmd = 'M';
      while (hasNum()) {
        const lx = nextNum() + (isRel ? cx : 0);
        const ly = nextNum() + (isRel ? cy : 0);
        addLine(lx, ly);
        lastCmd = 'L';
      }
    } else if (upper === 'L') {
      do {
        const x = nextNum() + (isRel ? cx : 0);
        const y = nextNum() + (isRel ? cy : 0);
        addLine(x, y);
        lastCmd = 'L';
      } while (hasNum());
    } else if (upper === 'H') {
      do {
        const x = nextNum() + (isRel ? cx : 0);
        addLine(x, cy);
        lastCmd = 'H';
      } while (hasNum());
    } else if (upper === 'V') {
      do {
        const y = nextNum() + (isRel ? cy : 0);
        addLine(cx, y);
        lastCmd = 'V';
      } while (hasNum());
    } else if (upper === 'C') {
      do {
        const c1x = nextNum() + (isRel ? cx : 0);
        const c1y = nextNum() + (isRel ? cy : 0);
        const c2x = nextNum() + (isRel ? cx : 0);
        const c2y = nextNum() + (isRel ? cy : 0);
        const x = nextNum() + (isRel ? cx : 0);
        const y = nextNum() + (isRel ? cy : 0);
        addCubic(c1x, c1y, c2x, c2y, x, y);
        lastCtrlX = c2x;
        lastCtrlY = c2y;
        lastCmd = 'C';
      } while (hasNum());
    } else if (upper === 'S') {
      do {
        const c1x = lastCmd === 'C' || lastCmd === 'S' ? 2 * cx - lastCtrlX : cx;
        const c1y = lastCmd === 'C' || lastCmd === 'S' ? 2 * cy - lastCtrlY : cy;
        const c2x = nextNum() + (isRel ? cx : 0);
        const c2y = nextNum() + (isRel ? cy : 0);
        const x = nextNum() + (isRel ? cx : 0);
        const y = nextNum() + (isRel ? cy : 0);
        addCubic(c1x, c1y, c2x, c2y, x, y);
        lastCtrlX = c2x;
        lastCtrlY = c2y;
        lastCmd = 'S';
      } while (hasNum());
    } else if (upper === 'Q') {
      do {
        const qx = nextNum() + (isRel ? cx : 0);
        const qy = nextNum() + (isRel ? cy : 0);
        const x = nextNum() + (isRel ? cx : 0);
        const y = nextNum() + (isRel ? cy : 0);
        const c1x = cx + (2 / 3) * (qx - cx);
        const c1y = cy + (2 / 3) * (qy - cy);
        const c2x = x + (2 / 3) * (qx - x);
        const c2y = y + (2 / 3) * (qy - y);
        addCubic(c1x, c1y, c2x, c2y, x, y);
        lastCtrlX = qx;
        lastCtrlY = qy;
        lastCmd = 'Q';
      } while (hasNum());
    } else if (upper === 'T') {
      do {
        const qx = lastCmd === 'Q' || lastCmd === 'T' ? 2 * cx - lastCtrlX : cx;
        const qy = lastCmd === 'Q' || lastCmd === 'T' ? 2 * cy - lastCtrlY : cy;
        const x = nextNum() + (isRel ? cx : 0);
        const y = nextNum() + (isRel ? cy : 0);
        const c1x = cx + (2 / 3) * (qx - cx);
        const c1y = cy + (2 / 3) * (qy - cy);
        const c2x = x + (2 / 3) * (qx - x);
        const c2y = y + (2 / 3) * (qy - y);
        addCubic(c1x, c1y, c2x, c2y, x, y);
        lastCtrlX = qx;
        lastCtrlY = qy;
        lastCmd = 'T';
      } while (hasNum());
    } else if (upper === 'A') {
      do {
        const rx = nextNum();
        const ry = nextNum();
        const phi = nextNum();
        const fa = nextNum();
        const fs = nextNum();
        const x = nextNum() + (isRel ? cx : 0);
        const y = nextNum() + (isRel ? cy : 0);
        const segs = arcToCubicSegments(cx, cy, rx, ry, phi, fa, fs, x, y);
        for (const [c1x, c1y, c2x, c2y, ex, ey] of segs) {
          addCubic(c1x, c1y, c2x, c2y, ex, ey);
        }
        lastCmd = 'A';
      } while (hasNum());
    } else if (upper === 'Z') {
      cx = sx;
      cy = sy;
      flushSubpath(true);
      lastCmd = 'Z';
    } else {
      idx++;
    }
  }

  flushSubpath(false);
  return shapes;
}

/**
 * 形状配列を [scaleX, scaleY] 倍にスケーリングする（巨大SVGの適正サイズ縮小用）
 * @param {Array<{ c: boolean, v: [number, number][], i: [number, number][], o: [number, number][] }>} shapes
 * @param {number} scaleX
 * @param {number} scaleY
 */
export function scaleLottieShapes(shapes, scaleX = 1, scaleY = scaleX) {
  if (Math.abs(scaleX - 1) < 1e-6 && Math.abs(scaleY - 1) < 1e-6) {
    return shapes;
  }
  return shapes.map((s) => ({
    c: s.c,
    v: s.v.map(([x, y]) => [round4(x * scaleX), round4(y * scaleY)]),
    i: s.i.map(([x, y]) => [round4(x * scaleX), round4(y * scaleY)]),
    o: s.o.map(([x, y]) => [round4(x * scaleX), round4(y * scaleY)]),
  }));
}

/**
 * 形状配列のバウンディングボックス中心 [cx, cy] を算出する
 * @param {Array<{ v: [number, number][] }>} shapes
 * @param {number} [fallbackX=260]
 * @param {number} [fallbackY=70]
 * @returns {[number, number]}
 */
export function computeShapesCenter(shapes, fallbackX = 260, fallbackY = 70) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of shapes) {
    for (const [x, y] of s.v) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) {
    return [fallbackX, fallbackY];
  }
  return [round4((minX + maxX) / 2), round4((minY + maxY) / 2)];
}

