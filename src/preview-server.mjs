/**
 * 検収プレビュー＆AI修正指示生成スタジオ付きローカルHTTPサーバー（127.0.0.1限定・CSP・a11y完全対応）
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
});

function buildPreviewStudioHtml() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>svg2lottie-cli — 検収プレビュー＆AI修正指示スタジオ</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js" crossorigin="anonymous"></script>
  <style>
    :root {
      --bg: #f1f5f9;
      --card: #ffffff;
      --text: #0f172a;
      --sub: #475569;
      --border: #cbd5e1;
      --accent: #1d4ed8;
      --accent-fg: #ffffff;
      --checker-a: #e2e8f0;
      --checker-b: #f8fafc;
    }
    body.dark {
      --bg: #0f172a;
      --card: #1e293b;
      --text: #f8fafc;
      --sub: #cbd5e1;
      --border: #334155;
      --accent: #38bdf8;
      --accent-fg: #0f172a;
      --checker-a: #1e293b;
      --checker-b: #0f172a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    header, main {
      max-width: 1120px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    h1 { font-size: 1.25rem; margin: 0; }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    button, select, input, textarea {
      font: inherit;
      color: var(--text);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 12px;
    }
    button { cursor: pointer; font-weight: 600; }
    button.primary {
      background: var(--accent);
      color: var(--accent-fg);
      border-color: var(--accent);
    }
    button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
    }
    .stage-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 220px;
      border-radius: 10px;
      border: 1px dashed var(--border);
      background-image:
        linear-gradient(45deg, var(--checker-a) 25%, transparent 25%),
        linear-gradient(-45deg, var(--checker-a) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--checker-a) 75%),
        linear-gradient(-45deg, transparent 75%, var(--checker-a) 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0;
      padding: 20px;
      margin: 12px 0;
    }
    body.invert #lottie-stage {
      filter: invert(1) brightness(2);
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      font-size: 0.9rem;
      color: var(--sub);
      gap: 8px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 12px;
    }
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 4px;
    }
    textarea { width: 100%; min-height: 110px; }
    .sr-status {
      display: inline-block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--accent);
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>🔍 svg2lottie-cli — 検収プレビュー＆AI修正指示スタジオ</h1>
      <output id="a11y-status" class="sr-status" aria-live="polite">スタジオ準備完了</output>
    </div>
    <div class="toolbar">
      <label for="file-select">対象JSON:</label>
      <select id="file-select" aria-label="検収対象のLottie JSONファイル選択"></select>
      <button type="button" id="btn-dark" aria-label="ダークモード切替">🌙 Dark</button>
      <button type="button" id="btn-invert" aria-label="Day and Night 色反転切替">🔄 Day&amp;Night反転</button>
    </div>
  </header>

  <main>
    <section class="panel" aria-label="アニメーション再生・コマ送り検収パネル">
      <div class="meta-bar">
        <span id="meta-info">サイズ: - × - px | フレーム: 0 / 0f</span>
        <span id="scene-info">現在シーン: scene0</span>
      </div>
      <div class="stage-wrap">
        <div id="lottie-stage" role="img" aria-label="Lottieアニメーション描画ステージ"></div>
      </div>
      <div class="toolbar">
        <button type="button" id="btn-play" class="primary" aria-label="再生または一時停止 (Space)">⏯ 再生 / 停止</button>
        <button type="button" id="btn-prev" aria-label="1フレーム戻る (左矢印)">◀ 1f</button>
        <button type="button" id="btn-next" aria-label="1フレーム進む (右矢印)">1f ▶</button>
        <label for="seek-bar">シーク:</label>
        <input type="range" id="seek-bar" min="0" max="100" value="0" style="flex:1" aria-label="フレームシークバー" />
        <label for="speed-select">速度:</label>
        <select id="speed-select" aria-label="再生速度切替">
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1" selected>1.0x</option>
          <option value="1.5">1.5x</option>
        </select>
      </div>
      <div class="toolbar" id="marker-buttons" style="margin-top:10px" aria-label="シーンジャンプボタン群"></div>
    </section>

    <section class="panel" aria-label="AI修正指示および文字コンテ初期サイズ生成パネル">
      <h2 style="font-size:1.05rem;margin-top:0">📝 AI修正指示 / GitHub Issue ジェネレーター（文字コンテ縦横サイズ欄対応）</h2>
      <div class="grid-2">
        <div>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <div style="flex:1">
              <label for="canvas-w">横幅 (width px)</label>
              <input type="number" id="canvas-w" value="520" style="width:100%" />
            </div>
            <div style="flex:1">
              <label for="canvas-h">縦幅 (height px)</label>
              <input type="number" id="canvas-h" value="140" style="width:100%" />
            </div>
          </div>
          <label for="layer-select">修正対象レイヤーID</label>
          <select id="layer-select" style="width:100%;margin-bottom:8px" aria-label="修正対象レイヤーID"></select>
          <label for="rev-memo">現象と修正指示メモ</label>
          <textarea id="rev-memo" placeholder="例: 動き出しを10フレーム早める / Liquid Glassのブラーを強める"></textarea>
          <button type="button" id="btn-copy" class="primary" style="margin-top:8px" aria-label="AI修正指示Markdownをクリップボードにコピー">📋 構造化修正指示をコピー</button>
        </div>
        <div>
          <label for="rev-output">出力プレビュー（AIエージェント / GitHub Issue 貼付用）</label>
          <textarea id="rev-output" readonly style="min-height:215px;font-family:monospace"></textarea>
        </div>
      </div>
    </section>
  </main>

  <script>
    const statusEl = document.getElementById('a11y-status');
    const fileSelect = document.getElementById('file-select');
    const stageEl = document.getElementById('lottie-stage');
    const seekBar = document.getElementById('seek-bar');
    const metaInfo = document.getElementById('meta-info');
    const sceneInfo = document.getElementById('scene-info');
    const layerSelect = document.getElementById('layer-select');
    const canvasW = document.getElementById('canvas-w');
    const canvasH = document.getElementById('canvas-h');
    const revMemo = document.getElementById('rev-memo');
    const revOutput = document.getElementById('rev-output');
    const markerBar = document.getElementById('marker-buttons');

    let anim = null;
    let animData = null;
    let currentFile = 'animation.json';
    let isPlaying = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function announce(msg) {
      statusEl.textContent = msg;
    }

    function currentSceneName(frame) {
      if (!animData || !Array.isArray(animData.markers) || animData.markers.length === 0) return 'scene0';
      let found = animData.markers[0].cm || 'scene0';
      for (const m of animData.markers) {
        if (frame >= m.tm) found = m.cm;
      }
      return found;
    }

    function updateRevisionMarkdown() {
      const f = anim ? Math.round(anim.currentFrame) : 0;
      const total = animData ? animData.op : 0;
      const sc = currentSceneName(f);
      const lid = layerSelect.value || '全体';
      const w = canvasW.value || 520;
      const h = canvasH.value || 140;
      const memo = revMemo.value.trim() || '（ここに具体的な修正内容を記述してください）';
      revOutput.value = [
        '### アニメーション修正指示 (' + sc + ' / ' + f + 'f付近)',
        '',
        '- **対象ファイル**: \`' + currentFile + '\`',
        '- **キャンバスサイズ**: 横幅 \`' + w + 'px\` × 縦幅 \`' + h + 'px\`',
        '- **対象シーン・フレーム**: \`' + sc + '\` (\`' + f + 'f\` / 全\`' + total + 'f\`)',
        '- **対象レイヤーID**: \`' + lid + '\`',
        '- **現象と修正内容**:',
        '  ' + memo,
        '',
        '#### 回帰防止ガード（絶対に壊してはいけない既存仕様）',
        '- [ ] \`0f\` 待機状態のレイヤーは \`opacity: 0%\`（完全透過）を維持しているか？',
        '- [ ] ガウスブラーがオブジェクト境界外にはみ出ていないか（\`clipMask: true\` 維持）？',
        '- [ ] \`#fff\` 等の不要な白座布団が出力されておらず、Day & Night 色反転で正常に見えるか？'
      ].join('\\n');
    }

    async function loadFile(file) {
      currentFile = file;
      const res = await fetch('/dist/' + encodeURIComponent(file));
      animData = await res.json();
      if (anim) anim.destroy();
      stageEl.style.width = (animData.w || 520) + 'px';
      stageEl.style.height = (animData.h || 140) + 'px';
      canvasW.value = animData.w || 520;
      canvasH.value = animData.h || 140;
      seekBar.max = Math.max(1, (animData.op || 100) - 1);

      layerSelect.innerHTML = '<option value="全体">全体</option>';
      (animData.layers || []).forEach((l) => {
        const opt = document.createElement('option');
        opt.value = l.nm;
        opt.textContent = l.nm;
        layerSelect.appendChild(opt);
      });

      markerBar.innerHTML = '';
      (animData.markers || []).forEach((m) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = m.cm + ' (' + m.tm + 'f)';
        b.addEventListener('click', () => {
          anim.goToAndStop(m.tm, true);
          isPlaying = false;
          announce(m.cm + ' へジャンプ');
        });
        markerBar.appendChild(b);
      });

      if (window.lottie) {
        anim = window.lottie.loadAnimation({
          container: stageEl,
          renderer: 'svg',
          loop: Boolean(animData.loop),
          autoplay: !reducedMotion,
          animationData: animData
        });
        isPlaying = !reducedMotion;
        anim.addEventListener('enterFrame', () => {
          const f = Math.round(anim.currentFrame);
          seekBar.value = f;
          metaInfo.textContent = 'サイズ: ' + animData.w + ' × ' + animData.h + ' px | フレーム: ' + f + ' / ' + animData.op + 'f';
          sceneInfo.textContent = '現在シーン: ' + currentSceneName(f);
          updateRevisionMarkdown();
        });
      }
      updateRevisionMarkdown();
      announce(file + ' を読み込みました');
    }

    document.getElementById('btn-play').addEventListener('click', () => {
      if (!anim) return;
      if (isPlaying) { anim.pause(); isPlaying = false; announce('一時停止'); }
      else { anim.play(); isPlaying = true; announce('再生中'); }
    });
    document.getElementById('btn-prev').addEventListener('click', () => {
      if (!anim) return;
      isPlaying = false;
      anim.goToAndStop(Math.max(0, Math.round(anim.currentFrame) - 1), true);
      announce('1フレーム戻しました');
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      if (!anim) return;
      isPlaying = false;
      anim.goToAndStop(Math.min((animData?.op || 1) - 1, Math.round(anim.currentFrame) + 1), true);
      announce('1フレーム進めました');
    });
    seekBar.addEventListener('input', () => {
      if (!anim) return;
      isPlaying = false;
      anim.goToAndStop(Number(seekBar.value), true);
    });
    document.getElementById('speed-select').addEventListener('change', (e) => {
      if (anim) anim.setSpeed(Number(e.target.value));
      announce('再生速度 ' + e.target.value + '倍');
    });
    document.getElementById('btn-dark').addEventListener('click', () => {
      document.body.classList.toggle('dark');
      announce('ダークモード切替');
    });
    document.getElementById('btn-invert').addEventListener('click', () => {
      document.body.classList.toggle('invert');
      announce('Day and Night 色反転切替');
    });
    [layerSelect, canvasW, canvasH, revMemo].forEach((el) => el.addEventListener('input', updateRevisionMarkdown));
    document.getElementById('btn-copy').addEventListener('click', async () => {
      updateRevisionMarkdown();
      if (navigator.clipboard) await navigator.clipboard.writeText(revOutput.value);
      announce('AI修正指示Markdownをコピーしました');
    });

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); document.getElementById('btn-play').click(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-prev').click(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-next').click(); }
      else if (e.code === 'Home' && anim) { e.preventDefault(); anim.goToAndStop(0, true); announce('先頭フレームへ移動'); }
    });

    fetch('/api/animations').then((r) => r.json()).then((data) => {
      (data.files || []).forEach((f) => {
        const o = document.createElement('option');
        o.value = f;
        o.textContent = f;
        fileSelect.appendChild(o);
      });
      if (data.files && data.files[0]) loadFile(data.files[0]);
    });
    fileSelect.addEventListener('change', () => loadFile(fileSelect.value));
  </script>
</body>
</html>`;
}

function isSubPath(baseDir, targetPath) {
  const rel = path.relative(baseDir, targetPath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * 検収プレビュー＆AI修正指示スタジオのリクエストハンドラを生成する
 * @param {{ rootDir?: string }} [options]
 */
export function createPreviewRequestHandler(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const distDir = path.join(rootDir, 'dist');

  return (req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(k, v);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    let decodedPathname;
    try {
      const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
      decodedPathname = decodeURIComponent(parsedUrl.pathname);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    if (decodedPathname.includes('..') || decodedPathname.includes('\0')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (decodedPathname === '/' || decodedPathname === '/preview/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildPreviewStudioHtml());
      return;
    }

    if (decodedPathname === '/api/animations') {
      let files = [];
      if (fs.existsSync(distDir)) {
        files = fs
          .readdirSync(distDir)
          .filter((f) => f.endsWith('.json'))
          .sort();
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ files }));
      return;
    }

    const candidatePath = path.resolve(rootDir, '.' + decodedPathname);
    if (!isSubPath(rootDir, candidatePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(candidatePath).toLowerCase();
    const mime =
      ext === '.json'
        ? 'application/json; charset=utf-8'
        : ext === '.svg'
          ? 'image/svg+xml; charset=utf-8'
          : 'text/plain; charset=utf-8';

    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(candidatePath));
  };
}

/**
 * 検収プレビュー＆AI修正指示スタジオ HTTP サーバーを生成する
 * @param {{ rootDir?: string }} [options]
 * @returns {import('node:http').Server}
 */
export function createPreviewServer(options = {}) {
  return http.createServer(createPreviewRequestHandler(options));
}
