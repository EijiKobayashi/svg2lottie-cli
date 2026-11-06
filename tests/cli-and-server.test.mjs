import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli } from '../src/cli.mjs';
import {
  createPreviewServer,
  createPreviewRequestHandler,
  rebuildIfStoryboardExists,
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

    // 認知アクセシビリティ: 段階表示・初期停止・進捗・自動保存・再開
    assert.ok(html.includes('1. 選択'));
    assert.ok(html.includes('2. 確認'));
    assert.ok(html.includes('3. 修正指示'));
    assert.ok(html.includes('id="display-options"'));
    assert.ok(html.includes('id="review-status"'));
    assert.ok(html.includes('未確認'));
    assert.ok(html.includes('要修正'));
    assert.ok(html.includes('確認済み'));
    assert.ok(html.includes('id="resume-banner"'));
    assert.ok(html.includes("const STORAGE_KEY = 'svg2lottie.preview.v1'"));
    assert.ok(html.includes('localStorage.setItem(STORAGE_KEY'));
    assert.ok(html.includes('autoplay: false'));
    assert.ok(html.includes('次の未完了'));
    assert.ok(html.includes('変更Inbox'));
    assert.ok(html.includes('id="revision-list"'));
    assert.ok(html.includes('id="revision-observation"'));
    assert.ok(html.includes('id="revision-expected"'));
    assert.ok(html.includes('id="revision-allowed"'));
    assert.ok(html.includes('id="revision-forbidden"'));
    assert.ok(html.includes('id="revision-acceptance"'));
    assert.ok(html.includes('id="revision-questions"'));
    assert.ok(html.includes('id="btn-save-revision"'));
    assert.ok(html.includes('id="btn-copy-approved"'));
    assert.ok(html.includes('revisionItems'));
    assert.ok(html.includes('/api/reload-token'));

    // 2. GET /api/animations & /api/live-reload
    const apiRes = invokeHandler(handler, '/api/animations');
    assert.equal(apiRes.status, 200);
    const apiData = apiRes.json();
    assert.ok(Array.isArray(apiData.files));
    assert.ok(apiData.files.length >= 1);

    // ホットリロード SSE エンドポイント
    const sseRes = invokeHandler(handler, '/api/live-reload');
    assert.equal(sseRes.status, 200);
    assert.ok(sseRes.headers.get('content-type').includes('text/event-stream'));
    assert.ok(sseRes.headers.get('cache-control').includes('no-cache'));

    // 3. パストラバーサル拒否
    const forbiddenRes = invokeHandler(handler, '/..%2f..%2fetc/passwd');
    assert.equal(forbiddenRes.status, 403);
  } finally {
    if (server && typeof server.close === 'function') server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Preview Server: ファイル保存検知 ➔ 自動再ビルド ➔ SSEホットリロード配信を検証する', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svg2lottie-live-'));
  await runCli(['init', '--dir', tmpDir]);

  const sseClients = new Set();
  let reloadToken = 'init-token';
  const handler = createPreviewRequestHandler({
    rootDir: tmpDir,
    sseClients,
    getReloadToken: () => reloadToken,
  });

  try {
    // 1. SSE接続のモック
    let sseOutput = '';
    const mockReq = { method: 'GET', url: '/api/live-reload', on(event, cb) {} };
    const mockRes = {
      setHeader() {},
      writeHead(code, hdrs) {},
      write(chunk) {
        sseOutput += chunk;
      },
      end() {},
    };

    handler(mockReq, mockRes);
    assert.equal(sseClients.size, 1);
    assert.ok(sseOutput.includes(': connected'));

    // 2. storyboard.json を更新して自動再ビルド関数を実行
    const sbPath = path.join(tmpDir, 'storyboard.json');
    const sb = JSON.parse(fs.readFileSync(sbPath, 'utf8'));
    sb.durationFrames = 240;
    fs.writeFileSync(sbPath, JSON.stringify(sb, null, 2), 'utf8');

    const rebuilt = rebuildIfStoryboardExists(tmpDir);
    assert.equal(rebuilt, true);

    const distPath = path.join(tmpDir, 'dist', `${sb.name}.json`);
    assert.ok(fs.existsSync(distPath));
    const builtLottie = JSON.parse(fs.readFileSync(distPath, 'utf8'));
    assert.equal(builtLottie.op, 240);

    // 3. ブロードキャスト送信
    const payload = `data: ${JSON.stringify({ type: 'reload', timestamp: 12345 })}\n\n`;
    for (const client of sseClients) {
      client.write(payload);
    }
    assert.ok(sseOutput.includes('"type":"reload"'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
