import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSafeSvg,
  extractPathDsById,
  extractViewBox,
} from '../src/svg-extractor.mjs';

test('validateSafeSvg: XSS(<script>, onload)およびXXE(<!ENTITY)を拒否する', () => {
  assert.throws(
    () => validateSafeSvg('<svg><script>alert(1)</script></svg>'),
    /Unsafe SVG/
  );
  assert.throws(
    () => validateSafeSvg('<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg/>'),
    /Unsafe SVG/
  );
  assert.throws(
    () => validateSafeSvg('<svg onload="evil()"><path d="M0 0"/></svg>'),
    /Unsafe SVG/
  );
});

test('extractPathDsById: 指定IDのグループ・パスを抽出し、白座布団(#fff)を除外する', () => {
  const svg = `
    <svg viewBox="0 0 520 140">
      <path fill="#ffffff" d="M0 0H520V140H0Z"/>
      <g id="icon-star">
        <path fill="#fff" d="M0 0H10V10H0Z"/>
        <path fill="#264f74" d="M10 10L50 10L50 50Z"/>
        <path fill="#264f74" d="M20 20L40 20L40 40Z"/>
      </g>
      <path id="single-line" d="M0 70L520 70"/>
    </svg>
  `;

  const groupPaths = extractPathDsById(svg, 'icon-star');
  assert.deepEqual(groupPaths, ['M10 10L50 10L50 50Z', 'M20 20L40 20L40 40Z']);

  const singlePath = extractPathDsById(svg, 'single-line');
  assert.deepEqual(singlePath, ['M0 70L520 70']);

  const allPaths = extractPathDsById(svg);
  assert.equal(allPaths.length, 3);
});

test('extractViewBox: viewBoxまたはwidth/heightから寸法を取得する', () => {
  assert.deepEqual(extractViewBox('<svg viewBox="0 0 640 360"></svg>'), {
    width: 640,
    height: 360,
  });
  assert.deepEqual(extractViewBox('<svg width="300" height="200"></svg>'), {
    width: 300,
    height: 200,
  });
});
