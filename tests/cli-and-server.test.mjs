import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli } from '../src/cli.mjs';
import {
  createPreviewServer,
  createPreviewRequestHandler,
} from '../src/preview-server.mjs';

function invokeHandler(handler, urlPath, method = 'GET') {
  const headers = new Map();
  let statusCode = 200;
  let bodyBuffer = Buffer.alloc(0);

  const req = { method, url: urlPath };
  const res = {
    setHeader(k, v) {
      headers.set(k.toLowerCase(), v);
    },
    writeHead(code, hdrs = {}) {
      statusCode = code;
      for (const [k, v] of Object.entries(hdrs)) {
        headers.set(k.toLowerCase(), v);
      }
    },
    end(chunk) {
      if (chunk) {
        bodyBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      }
    },
  };

  handler(req, res);
  return {
    status: statusCode,
    headers,
    text: () => bodyBuffer.toString('utf8'),
    json: () => JSON.parse(bodyBuffer.toString('utf8')),
  };
}

test('CLI: init -> build の一貫フローとパストラバーサル防止を検証する', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svg2lottie-test-'));

  try {
    // 1. init
    const initRes = await runCli(['init', '--dir', tmpDir]);
    assert.equal(initRes.exitCode, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, 'shooting-script.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'storyboard.json')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'svg', 'scene0.svg')));

    // 2. build
    const outDir = path.join(tmpDir, 'dist');
    const buildRes = await runCli([
      'build',
      '--config',
      path.join(tmpDir, 'storyboard.json'),
      '--out',
      outDir,
    ]);
    assert.equal(buildRes.exitCode, 0);
    const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.json'));
    assert.ok(files.length >= 1);

    // 3. パストラバーサルを含むSVGパスは拒否されること
    const badConfigPath = path.join(tmpDir, 'bad-storyboard.json');
    fs.writeFileSync(
      badConfigPath,
      JSON.stringify({
        name: 'evil',
        width: 100,
        height: 100,
        durationFrames: 60,
        layers: [{ id: 'hack', svg: '../../../etc/passwd' }],
      })
    );
    await assert.rejects(
      () => runCli(['build', '--config', badConfigPath, '--out', outDir]),
      /Path traversal/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Preview Server: セキュリティヘッダー・a11y属性・API・パストラバーサル拒否を検証する', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svg2lottie-preview-'));
  await runCli(['init', '--dir', tmpDir]);
  await runCli([
    'build',
    '--config',
    path.join(tmpDir, 'storyboard.json'),
    '--out',
    path.join(tmpDir, 'dist'),
  ]);

  const server = createPreviewServer({ rootDir: tmpDir });
  assert.ok(server);
  const handler = createPreviewRequestHandler({ rootDir: tmpDir });

  try {
    // 1. GET / (HTML + CSP + a11y + 縦横サイズ欄)
    const htmlRes = invokeHandler(handler, '/');
    assert.equal(htmlRes.status, 200);
    assert.equal(htmlRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(htmlRes.headers.get('x-frame-options'), 'DENY');
    assert.ok(htmlRes.headers.get('content-security-policy'));

    const html = htmlRes.text();
    assert.ok(html.includes('aria-live="polite"'));
    assert.ok(html.includes('prefers-reduced-motion'));
    assert.ok(html.includes('AI修正指示'));
    assert.ok(html.includes('横幅 (width px)'));
    assert.ok(html.includes('縦幅 (height px)'));

    // 2. GET /api/animations
    const apiRes = invokeHandler(handler, '/api/animations');
    assert.equal(apiRes.status, 200);
    const apiData = apiRes.json();
    assert.ok(Array.isArray(apiData.files));
    assert.ok(apiData.files.length >= 1);

    // 3. パストラバーサル拒否
    const forbiddenRes = invokeHandler(handler, '/..%2f..%2fetc/passwd');
    assert.equal(forbiddenRes.status, 403);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
