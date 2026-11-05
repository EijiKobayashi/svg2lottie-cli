/**
 * セキュアSVG検証・viewBox取得・ID/インデックス別Path＆マルチカラー抽出モジュール
 */

const MAX_SVG_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * SVG文字列の安全性を検証する（XSS・XXE・上限サイズ超過を拒否）
 * @param {string} svgText
 */
export function validateSafeSvg(svgText) {
  if (typeof svgText !== 'string' || svgText.trim().length === 0) {
    throw new Error('Unsafe SVG: Empty or invalid SVG input');
  }
  if (Buffer.byteLength(svgText, 'utf8') > MAX_SVG_BYTES) {
    throw new Error('Unsafe SVG: Exceeds 10MB limit');
  }
  if (/<script\b/i.test(svgText)) {
    throw new Error('Unsafe SVG: <script> tag is not allowed');
  }
  if (/<!ENTITY\b/i.test(svgText)) {
    throw new Error('Unsafe SVG: XML <!ENTITY> declaration is not allowed');
  }
  if (/\bon[a-z]+\s*=/i.test(svgText)) {
    throw new Error('Unsafe SVG: Event handler attributes (on*) are not allowed');
  }
}

function isWhiteBackgroundPath(pathTag) {
  const fillMatch = pathTag.match(/\bfill\s*=\s*["']([^"']+)["']/i);
  const styleMatch = pathTag.match(/fill\s*:\s*([^;"']+)/i);
  const rawFill = (fillMatch?.[1] || styleMatch?.[1] || '').trim().toLowerCase();
  return rawFill === '#fff' || rawFill === '#ffffff' || rawFill === 'white';
}

function extractGradientMap(svgText) {
  const map = new Map();
  const gradRe = /<(?:linearGradient|radialGradient)\b[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:linearGradient|radialGradient)>/gi;
  for (const m of svgText.matchAll(gradRe)) {
    const gradId = m[1];
    const body = m[2];
    const stops = [...body.matchAll(/\bstop-color\s*[:=]\s*["']?([^;"'\s>]+)/gi)].map(
      (s) => s[1]
    );
    if (stops.length > 0) {
      map.set(gradId, stops[stops.length - 1]);
    }
  }
  return map;
}

function resolveFillColor(rawFill, gradMap) {
  if (!rawFill) return null;
  const trimmed = rawFill.trim();
  const urlMatch = trimmed.match(/^url\(\s*#([^)\s]+)\s*\)$/i);
  if (urlMatch && gradMap.has(urlMatch[1])) {
    return gradMap.get(urlMatch[1]);
  }
  return trimmed;
}

function extractPathTagsWithMeta(fragment, gradMap, options = {}) {
  const { keepWhitePaths = false, pathRange, pathIndices } = options;
  const results = [];
  const pathRe = /<path\b[^>]*>/gi;
  let rawIdx = 0;

  for (const match of fragment.matchAll(pathRe)) {
    const currentIdx = rawIdx++;
    if (Array.isArray(pathRange) && pathRange.length === 2) {
      if (currentIdx < pathRange[0] || currentIdx > pathRange[1]) continue;
    }
    if (Array.isArray(pathIndices) && !pathIndices.includes(currentIdx)) {
      continue;
    }

    const tag = match[0];
    if (!keepWhitePaths && isWhiteBackgroundPath(tag)) continue;
    const dMatch = tag.match(/\bd\s*=\s*["']([^"']+)["']/i);
    if (!dMatch) continue;
    const fillMatch = tag.match(/\bfill\s*=\s*["']([^"']+)["']/i);
    const styleFillMatch = tag.match(/fill\s*:\s*([^;"']+)/i);
    const idMatch = tag.match(/\bid\s*=\s*["']([^"']+)["']/i);
    const resolvedFill = resolveFillColor(
      fillMatch?.[1] || styleFillMatch?.[1] || null,
      gradMap
    );

    results.push({
      index: currentIdx,
      id: idMatch?.[1] || '',
      d: dMatch[1],
      fill: resolvedFill,
    });
  }
  return results;
}

function extractTargetFragment(svgText, targetId) {
  if (!targetId) return svgText;
  const escapedId = targetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const gRe = new RegExp(
    `<g\\b[^>]*\\bid\\s*=\\s*["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/g>`,
    'i'
  );
  const gMatch = svgText.match(gRe);
  if (gMatch) {
    return gMatch[1];
  }
  const pathRe = new RegExp(
    `<path\\b[^>]*\\bid\\s*=\\s*["']${escapedId}["'][^>]*>`,
    'i'
  );
  const pathMatch = svgText.match(pathRe);
  if (pathMatch) {
    return pathMatch[0];
  }
  return '';
}

/**
 * 安全性を検証した上で、指定IDまたはインデックス範囲から <path> の d 属性と色メタ情報を抽出する
 * @param {string} svgText
 * @param {string} [targetId]
 * @param {{ keepWhitePaths?: boolean, pathRange?: [number, number], pathIndices?: number[] }} [options]
 * @returns {Array<{ index: number, id: string, d: string, fill: string | null }>}
 */
export function extractPathsWithMeta(svgText, targetId, options = {}) {
  validateSafeSvg(svgText);
  const gradMap = extractGradientMap(svgText);
  const fragment = extractTargetFragment(svgText, targetId);
  return extractPathTagsWithMeta(fragment, gradMap, options);
}

/**
 * 安全性を検証した上で、指定IDまたは全体から <path d="..."> 文字列配列を抽出する
 * @param {string} svgText
 * @param {string} [targetId]
 * @returns {string[]}
 */
export function extractPathDsById(svgText, targetId) {
  return extractPathsWithMeta(svgText, targetId).map((item) => item.d);
}

/**
 * SVG の viewBox または width/height 属性から寸法を抽出する
 * @param {string} svgText
 * @returns {{ width: number, height: number }}
 */
export function extractViewBox(svgText) {
  validateSafeSvg(svgText);
  const vbMatch = svgText.match(
    /\bviewBox\s*=\s*["']\s*[-+\d.]+\s+[-+\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i
  );
  if (vbMatch) {
    return {
      width: Number.parseFloat(vbMatch[1]),
      height: Number.parseFloat(vbMatch[2]),
    };
  }
  const wMatch = svgText.match(/\bwidth\s*=\s*["']([\d.]+)/i);
  const hMatch = svgText.match(/\bheight\s*=\s*["']([\d.]+)/i);
  return {
    width: wMatch ? Number.parseFloat(wMatch[1]) : 520,
    height: hMatch ? Number.parseFloat(hMatch[1]) : 140,
  };
}
