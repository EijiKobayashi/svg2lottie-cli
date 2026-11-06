/**
 * 検収プレビュー＆AI修正指示生成スタジオ付きローカルHTTPサーバー
 * （正方形 1:1 / 横長ワイド対応 Auto-Fit・ズーム・十字/三分割ガイド・レイヤー別ON/OFF・127.0.0.1限定・CSP・a11y完全対応）
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildLottieFromStoryboard,
  appendPowderEnding,
} from './lottie-builder.mjs';
import { parseShootingScript } from './shooting-script.mjs';

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
});

function buildPreviewStudioHtml() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>svg2lottie-cli — 高精度検収プレビュー＆AI修正指示スタジオ</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js" crossorigin="anonymous"></script>
  <style>
    :root {
      --bg: #f1f5f9;
      --card: #ffffff;
      --text: #0f172a;
      --sub: #475569;
      --border: #cbd5e1;
      --accent: #0284c7;
      --accent-fg: #ffffff;
      --checker-a: #e2e8f0;
      --checker-b: #f8fafc;
    }
    body.dark {
      --bg: #0b1120;
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
      padding: 18px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header, main {
      max-width: 1280px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
    }
    h1 { font-size: 1.2rem; margin: 0; }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 14px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      max-width: 1280px;
      margin: 0 auto 14px;
    }
    .step {
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--card);
      font-weight: 700;
      text-align: center;
    }
    .step.current { border-color: var(--accent); color: var(--accent); }
    .resume-banner {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      max-width: 1280px;
      margin: 0 auto 14px;
      padding: 12px 14px;
      border: 1px solid var(--accent);
      border-radius: 10px;
      background: var(--card);
    }
    .resume-banner.visible { display: flex; }
    details.options {
      max-width: 1280px;
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 12px;
      background: var(--card);
    }
    details.options summary { cursor: pointer; font-weight: 700; }
    details.options .toolbar { margin-top: 10px; }
    .progress-bar { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; margin: 10px 0; }
    .progress-bar > div { min-width: 180px; }
    .progress-summary { color: var(--sub); font-size: 0.88rem; font-weight: 700; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    button, select, input, textarea {
      font: inherit;
      font-size: 0.88rem;
      color: var(--text);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 11px;
    }
    button { cursor: pointer; font-weight: 600; }
    button.primary {
      background: var(--accent);
      color: var(--accent-fg);
      border-color: var(--accent);
    }
    button.active {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.35);
    }
    button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
    }
    .badge {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      background: #e0f2fe;
      color: #0369a1;
    }
    body.dark .badge {
      background: #0c4a6e;
      color: #7dd3fc;
    }
    .stage-viewport {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 360px;
      max-height: 620px;
      overflow: auto;
      border-radius: 10px;
      border: 1px solid var(--border);
      padding: 20px;
      margin: 12px 0;
      background-image:
        linear-gradient(45deg, var(--checker-a) 25%, transparent 25%),
        linear-gradient(-45deg, var(--checker-a) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--checker-a) 75%),
        linear-gradient(-45deg, transparent 75%, var(--checker-a) 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0;
    }
    .stage-viewport.bg-dark { background: #0f172a; }
    .stage-viewport.bg-white { background: #ffffff; }
    .stage-viewport.bg-ocean { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); }
    .canvas-box {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: width 0.15s, height 0.15s;
    }
    #lottie-stage {
      width: 100%;
      height: 100%;
    }
    body.invert #lottie-stage {
      filter: invert(1) brightness(2);
    }
    /* 精密検収ガイドオーバーレイ（センター十字・三分割グリッド・セーフ枠） */
    .guide-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: none;
      border: 1.5px solid rgba(244, 63, 94, 0.8);
    }
    .guide-overlay.visible {
      display: block;
      background-image:
        linear-gradient(to right, rgba(56, 189, 248, 0.35) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(56, 189, 248, 0.35) 1px, transparent 1px);
      background-size: 33.333% 33.333%;
    }
    .guide-overlay::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      border-left: 1px dashed rgba(244, 63, 94, 0.85);
    }
    .guide-overlay::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      border-top: 1px dashed rgba(244, 63, 94, 0.85);
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      font-size: 0.88rem;
      color: var(--sub);
      gap: 8px;
    }
    .layer-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
    }
    .layer-chip {
      font-size: 0.78rem;
      padding: 4px 10px;
      border-radius: 999px;
    }
    .layer-chip.muted {
      opacity: 0.45;
      text-decoration: line-through;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
    }
    label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      margin-bottom: 4px;
    }
    textarea { width: 100%; min-height: 110px; }
    .revision-list { display: grid; gap: 8px; margin-top: 12px; }
    .revision-card { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: var(--bg); }
    .revision-card header { margin: 0 0 8px; }
    .revision-card p { margin: 4px 0; font-size: 0.84rem; }
    .revision-card[aria-current="true"] { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(56,189,248,.2); }
    .contract-note { color: var(--sub); font-size: .84rem; margin: 0 0 10px; }
    .field-error { color: #b91c1c; font-size: .84rem; font-weight: 700; }
    .sr-status {
      display: inline-block;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--accent);
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  </style>
</head>
<body>
  <nav class="steps" aria-label="検収手順">
    <div class="step current">1. 選択</div>
    <div class="step">2. 確認</div>
    <div class="step">3. 修正指示</div>
  </nav>
  <aside id="resume-banner" class="resume-banner" aria-live="polite">
    <span id="resume-text">前回の続きがあります。</span>
    <button type="button" id="btn-resume" class="primary">前回の続きから再開</button>
  </aside>
  <header>
    <div>
      <h1>🔍 svg2lottie-cli — 高精度検収プレビュー＆AI修正指示スタジオ</h1>
      <output id="a11y-status" class="sr-status" aria-live="polite">スタジオ準備完了</output>
    </div>
    <div class="toolbar">
      <label for="file-select" style="margin:0">対象JSON:</label>
      <select id="file-select" aria-label="検収対象のLottie JSONファイル選択"></select>
    </div>
    <details id="display-options" class="options">
      <summary>表示オプション</summary>
      <div class="toolbar">
      <label for="zoom-select" style="margin:0">表示倍率:</label>
      <select id="zoom-select" aria-label="ステージ表示倍率切替">
        <option value="fit" selected>Auto-Fit (自動最適)</option>
        <option value="0.5">50%</option>
        <option value="0.75">75%</option>
        <option value="1">100%</option>
        <option value="1.5">150%</option>
      </select>
      <label for="bg-select" style="margin:0">背景:</label>
      <select id="bg-select" aria-label="検収ステージ背景切替">
        <option value="checker" selected>透過チェッカー</option>
        <option value="bg-dark">ダーク (#0f172a / 白要素検収用)</option>
        <option value="bg-ocean">オーシャン濃紺</option>
        <option value="bg-white">純白 (#ffffff)</option>
      </select>
      <button type="button" id="btn-guide" aria-label="センター十字・三分割ガイド枠切替">📐 ガイド枠</button>
      <button type="button" id="btn-dark" aria-label="ダークモード切替">🌙 Dark</button>
      <button type="button" id="btn-invert" aria-label="Day and Night 色反転切替">🔄 Day&amp;Night反転</button>
      </div>
    </details>
  </header>

  <main>
    <section class="panel" aria-label="アニメーション再生・コマ送り検収パネル">
      <h2 style="font-size:1.02rem;margin-top:0">2. 確認</h2>
      <div class="progress-bar">
        <div>
          <label for="review-status">このアニメーションの状態</label>
          <select id="review-status">
            <option value="unreviewed">未確認</option>
            <option value="reviewing">確認中</option>
            <option value="needs-fix">要修正</option>
            <option value="approved">確認済み</option>
          </select>
        </div>
        <button type="button" id="btn-next-incomplete">次の未完了へ</button>
        <output id="progress-summary" class="progress-summary">進捗: 0 / 0 確認済み</output>
      </div>
      <div class="meta-bar">
        <div>
          <span id="aspect-badge" class="badge">比率判定中</span>
          <span id="meta-info" style="margin-left:6px">サイズ: - × - px | フレーム: 0 / 0f (0.00s)</span>
        </div>
        <span id="scene-info" style="font-weight:700">現在シーン: scene0</span>
      </div>

      <div class="stage-viewport" id="stage-viewport">
        <div class="canvas-box" id="canvas-box">
          <div id="lottie-stage" role="img" aria-label="Lottieアニメーション描画ステージ"></div>
          <div id="guide-overlay" class="guide-overlay" aria-hidden="true"></div>
        </div>
      </div>

      <div class="toolbar">
        <button type="button" id="btn-play" class="primary" aria-label="再生または一時停止 (Space)">⏯ 再生 / 停止</button>
        <button type="button" id="btn-prev" aria-label="1フレーム戻る (左矢印)">◀ 1f</button>
        <button type="button" id="btn-next" aria-label="1フレーム進む (右矢印)">1f ▶</button>
        <label for="seek-bar" style="margin:0">シーク:</label>
        <input type="range" id="seek-bar" min="0" max="100" value="0" style="flex:1" aria-label="フレームシークバー" />
        <label for="speed-select" style="margin:0">速度:</label>
        <select id="speed-select" aria-label="再生速度切替">
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1" selected>1.0x</option>
          <option value="1.5">1.5x</option>
        </select>
      </div>
      <div class="toolbar" id="marker-buttons" style="margin-top:10px" aria-label="シーンジャンプボタン群"></div>
      <div class="layer-chips" id="layer-chips" aria-label="レイヤー別表示切替および選択バー"></div>
    </section>

    <section class="panel" aria-label="変更Inboxおよび承認ゲート">
      <h2 style="font-size:1.02rem;margin-top:0">3. 変更Inbox</h2>
      <p class="contract-note">気づきをカードとして保存し、変更対象と禁止範囲を確認してから承認します。承認済みのカードだけがAgent向け指示に含まれます。</p>
      <div class="grid-2">
        <div>
          <p class="contract-note">横幅 (width px)・縦幅 (height px)・対象シーン・フレームは現在のLottieから自動記録します。</p>
          <label for="layer-select">修正対象レイヤーID（上のレイヤーチップをクリックでも選択可）</label>
          <select id="layer-select" style="width:100%;margin-bottom:8px" aria-label="修正対象レイヤーID"></select>
          <label for="revision-priority">優先度</label>
          <select id="revision-priority" style="width:100%;margin-bottom:8px">
            <option value="hold" selected>保留（まだ判断しない）</option>
            <option value="required">必須（必ず直す）</option>
            <option value="optional">任意（できれば直す）</option>
          </select>
          <label for="revision-observation">現状・気になったこと</label>
          <textarea id="revision-observation" placeholder="例: 148fでロゴの出現が早く見える"></textarea>
          <label for="revision-expected">期待結果</label>
          <textarea id="revision-expected" placeholder="例: 前の要素を読み終えてから自然に出現する"></textarea>
          <label for="revision-allowed">変更対象（変更してよい範囲）</label>
          <textarea id="revision-allowed" placeholder="例: scene2 / 144f〜164f / logo / opacity開始時刻のみ"></textarea>
          <label for="revision-forbidden">変更禁止範囲</label>
          <textarea id="revision-forbidden" placeholder="例: 総尺、位置、サイズ、色、他シーン、他レイヤー"></textarea>
          <label for="revision-acceptance">完了条件</label>
          <textarea id="revision-acceptance" placeholder="例: 154fまで透明、既存の尺とイージングを維持してフェードする"></textarea>
          <label for="revision-questions">不明点（残っている間は承認不可）</label>
          <textarea id="revision-questions" placeholder="不明点がなければ空欄"></textarea>
          <output id="revision-errors" class="field-error" aria-live="polite"></output>
          <div class="toolbar" style="margin-top:8px">
            <button type="button" id="btn-save-revision" class="primary">変更Inboxへ保存</button>
            <button type="button" id="btn-new-revision">新規入力</button>
          </div>
        </div>
        <div>
          <div class="toolbar">
            <strong>保存した変更契約</strong>
            <button type="button" id="btn-copy-approved" class="primary">承認済みを一括コピー</button>
          </div>
          <div id="revision-list" class="revision-list" aria-live="polite"></div>
        </div>
      </div>
    </section>
  </main>

  <script>
    const statusEl = document.getElementById('a11y-status');
    const fileSelect = document.getElementById('file-select');
    const zoomSelect = document.getElementById('zoom-select');
    const bgSelect = document.getElementById('bg-select');
    const viewportEl = document.getElementById('stage-viewport');
    const canvasBox = document.getElementById('canvas-box');
    const stageEl = document.getElementById('lottie-stage');
    const guideOverlay = document.getElementById('guide-overlay');
    const aspectBadge = document.getElementById('aspect-badge');
    const seekBar = document.getElementById('seek-bar');
    const metaInfo = document.getElementById('meta-info');
    const sceneInfo = document.getElementById('scene-info');
    const layerSelect = document.getElementById('layer-select');
    const layerChips = document.getElementById('layer-chips');
    const markerBar = document.getElementById('marker-buttons');
    const reviewStatus = document.getElementById('review-status');
    const progressSummary = document.getElementById('progress-summary');
    const resumeBanner = document.getElementById('resume-banner');
    const resumeText = document.getElementById('resume-text');
    const revisionList = document.getElementById('revision-list');
    const revisionErrors = document.getElementById('revision-errors');
    const revisionFields = {
      observation: document.getElementById('revision-observation'),
      expectedResult: document.getElementById('revision-expected'),
      allowedChanges: document.getElementById('revision-allowed'),
      forbiddenChanges: document.getElementById('revision-forbidden'),
      acceptanceCriteria: document.getElementById('revision-acceptance'),
      openQuestions: document.getElementById('revision-questions'),
      priority: document.getElementById('revision-priority')
    };

    const STORAGE_KEY = 'svg2lottie.preview.v1';
    const defaultState = () => ({
      currentFile: '', frameByFile: {}, progressByFile: {}, layerByFile: {}, speed: '1', zoom: 'fit',
      background: 'checker', savedAt: '', revisionItems: []
    });
    let workspaceState = defaultState();
    let availableFiles = [];
    let resumeRequested = false;
    let reloadToken = null;

    let anim = null;
    let animData = null;
    let currentFile = 'animation.json';
    let isPlaying = false;
    let editingRevisionId = '';

    function readState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (parsed && typeof parsed === 'object') workspaceState = { ...defaultState(), ...parsed };
      } catch { workspaceState = defaultState(); }
    }

    function saveState() {
      workspaceState.currentFile = currentFile;
      workspaceState.speed = document.getElementById('speed-select').value;
      workspaceState.zoom = zoomSelect.value;
      workspaceState.background = bgSelect.value;
      workspaceState.savedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceState));
    }

    function updateProgress() {
      const approved = availableFiles.filter((file) => workspaceState.progressByFile[file] === 'approved').length;
      const needsFix = availableFiles.filter((file) => workspaceState.progressByFile[file] === 'needs-fix').length;
      progressSummary.textContent = '進捗: ' + approved + ' / ' + availableFiles.length + ' 確認済み' + (needsFix ? '・要修正 ' + needsFix : '');
    }

    function markReviewing() {
      if (!workspaceState.progressByFile[currentFile] || workspaceState.progressByFile[currentFile] === 'unreviewed') {
        workspaceState.progressByFile[currentFile] = 'reviewing';
        reviewStatus.value = 'reviewing';
      }
    }

    function announce(msg) {
      statusEl.textContent = msg;
    }

    function classifyAspect(w, h) {
      const ratio = w / (h || 1);
      if (Math.abs(ratio - 1) <= 0.08) return '📐 正方形 (1:1)';
      if (ratio > 1.08) return '🖼️ 横長ワイド (' + ratio.toFixed(2) + ':1)';
      return '📱 縦長 (' + ratio.toFixed(2) + ':1)';
    }

    function applyStageSizing() {
      if (!animData) return;
      const w = animData.w || 520;
      const h = animData.h || 140;
      aspectBadge.textContent = classifyAspect(w, h);

      const maxW = Math.min(window.innerWidth - 96, 1140);
      const maxH = 440;
      const fitScale = Math.min(maxW / w, maxH / h);
      const mode = zoomSelect.value;
      const factor = mode === 'fit' ? fitScale : fitScale * Number(mode);

      canvasBox.style.width = Math.max(120, Math.round(w * factor)) + 'px';
      canvasBox.style.height = Math.max(80, Math.round(h * factor)) + 'px';
    }

    function currentSceneName(frame) {
      if (!animData || !Array.isArray(animData.markers) || animData.markers.length === 0) return 'scene0';
      let found = animData.markers[0].cm || 'scene0';
      for (const m of animData.markers) {
        if (frame >= m.tm) found = m.cm;
      }
      return found;
    }

    function revisionValidation(item) {
      const labels = {
        observation: '現状', expectedResult: '期待結果', allowedChanges: '変更対象',
        forbiddenChanges: '変更禁止範囲', acceptanceCriteria: '完了条件'
      };
      const errors = Object.entries(labels).filter(([key]) => !String(item[key] || '').trim()).map(([, label]) => label + 'を入力してください');
      if (String(item.openQuestions || '').trim()) errors.push('不明点が残っています');
      if (item.priority === 'hold') errors.push('優先度が保留です');
      return errors;
    }

    function clearRevisionForm() {
      editingRevisionId = '';
      Object.entries(revisionFields).forEach(([key, field]) => { field.value = key === 'priority' ? 'hold' : ''; });
      revisionErrors.textContent = '';
    }

    function readRevisionForm(existing = {}) {
      const frame = anim ? Math.round(anim.currentFrame) : 0;
      const now = new Date().toISOString();
      return {
        ...existing,
        id: existing.id || 'revision-' + Date.now(),
        fileName: existing.fileName || currentFile,
        scene: existing.scene || currentSceneName(frame),
        frame: Number.isFinite(existing.frame) ? existing.frame : frame,
        totalFrames: existing.totalFrames || (animData ? animData.op : 0),
        layerId: existing.layerId || layerSelect.value || '全体',
        observation: revisionFields.observation.value.trim(),
        expectedResult: revisionFields.expectedResult.value.trim(),
        allowedChanges: revisionFields.allowedChanges.value.trim(),
        forbiddenChanges: revisionFields.forbiddenChanges.value.trim(),
        acceptanceCriteria: revisionFields.acceptanceCriteria.value.trim(),
        openQuestions: revisionFields.openQuestions.value.trim(),
        priority: revisionFields.priority.value,
        status: existing.status || 'draft',
        createdAt: existing.createdAt || now,
        updatedAt: now
      };
    }

    function editRevision(id) {
      const item = workspaceState.revisionItems.find((entry) => entry.id === id);
      if (!item) return;
      editingRevisionId = id;
      Object.keys(revisionFields).forEach((key) => { revisionFields[key].value = item[key] || (key === 'priority' ? 'hold' : ''); });
      revisionErrors.textContent = '';
      announce('変更契約を編集中');
    }

    function setRevisionStatus(id, nextStatus) {
      const index = workspaceState.revisionItems.findIndex((entry) => entry.id === id);
      if (index < 0) return;
      const item = workspaceState.revisionItems[index];
      const allowed = { draft: ['review'], review: ['draft', 'approved'], approved: ['review', 'recheck'], recheck: ['approved', 'done'], done: ['recheck'] };
      if (!(allowed[item.status] || []).includes(nextStatus)) return;
      if (nextStatus === 'approved') {
        const errors = revisionValidation(item);
        if (errors.length) { revisionErrors.textContent = errors.join(' / '); announce('承認できません'); return; }
      }
      workspaceState.revisionItems[index] = { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
      saveState(); renderRevisionList();
      announce('変更契約の状態を更新しました');
    }

    function renderRevisionList() {
      revisionList.innerHTML = '';
      const statusLabel = { draft: '下書き', review: '確認待ち', approved: '承認済み', recheck: '再検収', done: '完了' };
      const items = workspaceState.revisionItems.filter((item) => item.fileName === currentFile);
      if (!items.length) { revisionList.textContent = 'このファイルの指摘はまだありません。'; return; }
      items.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'revision-card';
        card.setAttribute('aria-current', String(editingRevisionId === item.id));
        const title = document.createElement('strong');
        title.textContent = statusLabel[item.status] + '・' + item.scene + ' / ' + item.frame + 'f / ' + item.layerId;
        const summary = document.createElement('p');
        summary.textContent = item.observation || '現状未入力';
        const actions = document.createElement('div');
        actions.className = 'toolbar';
        const buttons = [['編集', () => editRevision(item.id)]];
        if (item.status === 'draft') buttons.push(['確認待ちへ', () => setRevisionStatus(item.id, 'review')]);
        if (item.status === 'review') buttons.push(['下書きへ戻す', () => setRevisionStatus(item.id, 'draft')], ['承認する', () => setRevisionStatus(item.id, 'approved')]);
        if (item.status === 'approved') buttons.push(['承認を戻す', () => setRevisionStatus(item.id, 'review')], ['再検収へ', () => setRevisionStatus(item.id, 'recheck')]);
        if (item.status === 'recheck') buttons.push(['承認済みへ戻す', () => setRevisionStatus(item.id, 'approved')], ['完了', () => setRevisionStatus(item.id, 'done')]);
        if (item.status === 'done') buttons.push(['再検収へ戻す', () => setRevisionStatus(item.id, 'recheck')]);
        buttons.forEach(([label, handler]) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', handler); actions.appendChild(button); });
        card.append(title, summary, actions);
        revisionList.appendChild(card);
      });
    }

    function approvedMarkdown() {
      const items = workspaceState.revisionItems.filter((item) => item.status === 'approved');
      if (!items.length) throw new Error('承認済みの変更契約がありません');
      const rules = ['# 承認済みアニメーション変更契約', '', '## 実装時の絶対ルール', '', '- 記載されていない意図を推測して変更しない。', '- 変更対象に記載された範囲以外を変更しない。', '- 変更禁止範囲には触れない。', '- 対象外のリファクタリングを行わない。', '- 不明点や矛盾を発見した場合は実装を停止して確認する。'];
      items.forEach((item, index) => rules.push('', '## 変更契約 ' + (index + 1) + ': ' + item.id, '', '- **対象ファイル**: \`' + item.fileName + '\`', '- **対象シーン・フレーム**: \`' + item.scene + '\` / \`' + item.frame + 'f\`', '- **対象レイヤーID**: \`' + item.layerId + '\`', '- **現状**: ' + item.observation, '- **期待結果**: ' + item.expectedResult, '- **変更対象**: ' + item.allowedChanges, '- **変更禁止範囲**: ' + item.forbiddenChanges, '- **完了条件**: ' + item.acceptanceCriteria));
      return rules.join('\\n');
    }

    async function loadFile(file, options = {}) {
      const prevFrame = anim ? Math.round(anim.currentFrame) : 0;
      currentFile = file;
      const res = await fetch('/dist/' + encodeURIComponent(file) + '?t=' + Date.now());
      animData = await res.json();
      if (anim) anim.destroy();
      seekBar.max = Math.max(1, (animData.op || 100) - 1);
      applyStageSizing();

      layerSelect.innerHTML = '<option value="全体">全体</option>';
      layerChips.innerHTML = '<span style="font-size:0.78rem;color:var(--sub);align-self:center">レイヤー検収(クリックで対象選択 / 👁️表示切替):</span>';

      (animData.layers || []).forEach((l, idx) => {
        const opt = document.createElement('option');
        opt.value = l.nm;
        opt.textContent = l.nm;
        layerSelect.appendChild(opt);

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'layer-chip';
        chip.textContent = '👁️ ' + l.nm;
        chip.addEventListener('click', () => {
          layerSelect.value = l.nm;
          const svgGroups = stageEl.querySelectorAll('svg > g > g');
          const targetG = svgGroups[svgGroups.length - 1 - idx];
          if (targetG) {
            const hidden = targetG.style.display === 'none';
            targetG.style.display = hidden ? '' : 'none';
            chip.classList.toggle('muted', !hidden);
          }
          announce('レイヤー ' + l.nm + ' を選択');
        });
        layerChips.appendChild(chip);
      });

      markerBar.innerHTML = '';
      (animData.markers || []).forEach((m) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = '📍 ' + m.cm + ' (' + m.tm + 'f)';
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
          autoplay: false,
          animationData: animData
        });
        isPlaying = false;
        const targetFrame = options.keepFrame
          ? prevFrame
          : resumeRequested
            ? Number(workspaceState.frameByFile[file] || 0)
            : 0;
        anim.goToAndStop(Math.min(targetFrame, Math.max(0, (animData.op || 1) - 1)), true);
        anim.addEventListener('enterFrame', () => {
          const f = Math.round(anim.currentFrame);
          const fps = animData.fr || 60;
          const sec = (f / fps).toFixed(2);
          seekBar.value = f;
          metaInfo.textContent =
            'サイズ: ' + animData.w + ' × ' + animData.h + ' px | フレーム: ' + f + ' / ' + animData.op + 'f (' + sec + 's)';
          sceneInfo.textContent = '現在シーン: ' + currentSceneName(f);
          workspaceState.frameByFile[currentFile] = f;
          saveState();
        });
      }
      const savedLayer = workspaceState.layerByFile[file];
      if (savedLayer && [...layerSelect.options].some((option) => option.value === savedLayer)) layerSelect.value = savedLayer;
      reviewStatus.value = workspaceState.progressByFile[file] || 'unreviewed';
      markReviewing();
      updateProgress();
      saveState();
      clearRevisionForm();
      renderRevisionList();
      announce(file + ' を読み込みました');
    }

    zoomSelect.addEventListener('change', () => { applyStageSizing(); saveState(); });
    window.addEventListener('resize', applyStageSizing);
    bgSelect.addEventListener('change', () => {
      viewportEl.className = 'stage-viewport ' + (bgSelect.value === 'checker' ? '' : bgSelect.value);
      saveState();
    });
    document.getElementById('btn-guide').addEventListener('click', (e) => {
      guideOverlay.classList.toggle('visible');
      e.currentTarget.classList.toggle('active');
      announce('検収ガイド枠を切替');
    });
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
      saveState();
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
    layerSelect.addEventListener('change', () => {
      workspaceState.layerByFile[currentFile] = layerSelect.value;
      saveState();
    });
    reviewStatus.addEventListener('change', () => {
      workspaceState.progressByFile[currentFile] = reviewStatus.value;
      saveState(); updateProgress();
      announce('検収状態を' + reviewStatus.options[reviewStatus.selectedIndex].text + 'に変更');
    });
    document.getElementById('btn-next-incomplete').addEventListener('click', () => {
      const next = availableFiles.find((file) => !['approved', 'needs-fix'].includes(workspaceState.progressByFile[file]));
      if (!next) { announce('未完了のアニメーションはありません'); return; }
      fileSelect.value = next; loadFile(next);
    });
    document.getElementById('btn-resume').addEventListener('click', () => {
      resumeRequested = true;
      resumeBanner.classList.remove('visible');
      zoomSelect.value = workspaceState.zoom || 'fit';
      bgSelect.value = workspaceState.background || 'checker';
      document.getElementById('speed-select').value = workspaceState.speed || '1';
      if (availableFiles.includes(workspaceState.currentFile)) fileSelect.value = workspaceState.currentFile;
      loadFile(fileSelect.value);
      announce('前回の続きから再開しました');
    });
    document.getElementById('btn-save-revision').addEventListener('click', () => {
      const index = workspaceState.revisionItems.findIndex((item) => item.id === editingRevisionId);
      const existing = index >= 0 ? workspaceState.revisionItems[index] : {};
      const item = readRevisionForm(existing);
      if (index >= 0 && existing.status !== 'draft') item.status = 'draft';
      if (index >= 0) workspaceState.revisionItems[index] = item;
      else workspaceState.revisionItems.push(item);
      saveState(); clearRevisionForm(); renderRevisionList();
      announce('変更Inboxへ保存しました');
    });
    document.getElementById('btn-new-revision').addEventListener('click', clearRevisionForm);
    document.getElementById('btn-copy-approved').addEventListener('click', async () => {
      try {
        const markdown = approvedMarkdown();
        if (navigator.clipboard) await navigator.clipboard.writeText(markdown);
        announce('承認済み変更契約をコピーしました');
      } catch (error) {
        revisionErrors.textContent = error.message;
        announce(error.message);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); document.getElementById('btn-play').click(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-prev').click(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-next').click(); }
      else if (e.code === 'Home' && anim) { e.preventDefault(); anim.goToAndStop(0, true); announce('先頭フレームへ移動'); }
    });

    readState();
    fetch('/api/animations').then((r) => r.json()).then((data) => {
      availableFiles = data.files || [];
      (data.files || []).forEach((f) => {
        const o = document.createElement('option');
        o.value = f;
        o.textContent = f;
        fileSelect.appendChild(o);
      });
      updateProgress();
      if (workspaceState.currentFile && availableFiles.includes(workspaceState.currentFile)) {
        const saved = new Date(workspaceState.savedAt);
        resumeText.textContent = '前回は ' + workspaceState.currentFile + ' の ' + (workspaceState.frameByFile[workspaceState.currentFile] || 0) + 'f を確認していました（' + saved.toLocaleString() + '）';
        resumeBanner.classList.add('visible');
      }
      if (data.files && data.files[0]) loadFile(data.files[0]);
    });

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (window.EventSource) {
      const sse = new EventSource('/api/live-reload');
      sse.addEventListener('reload', () => {
        if (currentFile) {
          loadFile(currentFile, { keepFrame: true });
          announce('ファイルを最新状態に自動更新しました');
        }
      });
      sse.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'reload' && currentFile) {
            loadFile(currentFile, { keepFrame: true });
            announce('ファイルを最新状態に自動更新しました');
          }
        } catch {}
      };
    }

    setInterval(async () => {
      try {
        const response = await fetch('/api/reload-token', { cache: 'no-store' });
        const data = await response.json();
        if (reloadToken === null) reloadToken = data.token;
        else if (data.token !== reloadToken) {
          reloadToken = data.token;
          if (currentFile) {
            loadFile(currentFile, { keepFrame: true });
            announce('ファイルを最新状態に自動更新しました');
          }
        }
      } catch { /* 次の確認で再試行 */ }
    }, 1000);
    fileSelect.addEventListener('change', () => loadFile(fileSelect.value));
  </script>
</body>
</html>`;
}

function isSubPath(baseDir, targetPath) {
  const rel = path.relative(baseDir, targetPath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function resolveDistDirs(rootDir) {
  return [
    path.join(rootDir, 'dist'),
    path.join(rootDir, 'examples', 'demo', 'dist'),
    path.join(rootDir, 'demo', 'dist'),
  ];
}

export function rebuildIfStoryboardExists(rootDir) {
  const storyboardPath = path.join(rootDir, 'storyboard.json');
  if (!fs.existsSync(storyboardPath)) return false;
  try {
    const raw = fs.readFileSync(storyboardPath, 'utf8');
    const config = JSON.parse(raw);
    if (config.shootingScript) {
      const scriptFull = path.resolve(rootDir, config.shootingScript);
      const rel = path.relative(rootDir, scriptFull);
      if (!rel.startsWith('..') && !path.isAbsolute(rel) && fs.existsSync(scriptFull)) {
        const parsed = parseShootingScript(fs.readFileSync(scriptFull, 'utf8'));
        if (!config.width && parsed.width) config.width = parsed.width;
        if (!config.height && parsed.height) config.height = parsed.height;
      }
    }
    const svgResolver = (relSvgPath) => {
      const fullSvgPath = path.resolve(rootDir, relSvgPath);
      const rel = path.relative(rootDir, fullSvgPath);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Path traversal detected: ${relSvgPath}`);
      }
      return fs.readFileSync(fullSvgPath, 'utf8');
    };
    const baseLottie = buildLottieFromStoryboard(config, svgResolver);
    const outDir = path.join(rootDir, 'dist');
    fs.mkdirSync(outDir, { recursive: true });
    const baseOutPath = path.join(outDir, `${config.name || 'animation'}.json`);
    fs.writeFileSync(baseOutPath, JSON.stringify(baseLottie), 'utf8');
    if (config.powderEnding && config.powderEnding.enabled) {
      const powderLottie = appendPowderEnding(baseLottie, config);
      const powderOutPath = path.join(outDir, `${config.name || 'animation'}-powder.json`);
      fs.writeFileSync(powderOutPath, JSON.stringify(powderLottie), 'utf8');
    }
    return true;
  } catch {
    return false;
  }
}

function setupLiveReloadWatcher(rootDir, broadcast) {
  let timer = null;
  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      rebuildIfStoryboardExists(rootDir);
      broadcast();
    }, 150);
  };

  const watchers = [];
  const safeWatch = (targetPath) => {
    if (fs.existsSync(targetPath)) {
      try {
        const w = fs.watch(targetPath, trigger);
        if (typeof w.unref === 'function') w.unref();
        watchers.push(w);
      } catch {}
    }
  };

  safeWatch(rootDir);
  safeWatch(path.join(rootDir, 'svg'));
  safeWatch(path.join(rootDir, 'dist'));

  return {
    close() {
      if (timer) clearTimeout(timer);
      for (const w of watchers) {
        try { w.close(); } catch {}
      }
    },
  };
}

/**
 * 検収プレビュー＆AI修正指示スタジオのリクエストハンドラを生成する
 * @param {{ rootDir?: string, sseClients?: Set<any>, getReloadToken?: () => string }} [options]
 */
export function createPreviewRequestHandler(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const distDirs = resolveDistDirs(rootDir);
  const sseClients = options.sseClients || new Set();
  const getReloadToken = options.getReloadToken || (() => 'default-token');

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

    if (decodedPathname === '/effects' || decodedPathname === '/effects.html') {
      const effectsHtmlPath = path.join(rootDir, 'docs/effects.html');
      if (fs.existsSync(effectsHtmlPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(effectsHtmlPath));
        return;
      }
    }

    if (decodedPathname.startsWith('/dist/effects/')) {
      const effectFileName = path.basename(decodedPathname);
      const candidate = path.join(rootDir, 'docs/dist/effects', effectFileName);
      if (isSubPath(rootDir, candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const cType = effectFileName.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8';
        res.writeHead(200, { 'Content-Type': cType });
        res.end(fs.readFileSync(candidate));
        return;
      }
    }

    if (decodedPathname === '/api/live-reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      });
      if (typeof res.write === 'function') {
        res.write(': connected\n\n');
      }
      if (typeof req.on === 'function') {
        sseClients.add(res);
        req.on('close', () => {
          sseClients.delete(res);
        });
      } else {
        if (typeof res.end === 'function') res.end();
      }
      return;
    }

    if (decodedPathname === '/api/reload-token') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ token: getReloadToken() }));
      return;
    }

    if (decodedPathname === '/api/animations') {
      const fileSet = new Set();
      for (const d of distDirs) {
        if (fs.existsSync(d)) {
          for (const f of fs.readdirSync(d)) {
            if (f.endsWith('.json')) fileSet.add(f);
          }
        }
      }
      const files = [...fileSet].sort();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ files }));
      return;
    }

    if (decodedPathname.startsWith('/dist/')) {
      const fileName = path.basename(decodedPathname);
      for (const d of distDirs) {
        const candidate = path.join(d, fileName);
        if (isSubPath(rootDir, candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(fs.readFileSync(candidate));
          return;
        }
      }
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
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const sseClients = new Set();
  let reloadToken = Date.now().toString(36);

  const broadcast = () => {
    reloadToken = Date.now().toString(36);
    const payload = `data: ${JSON.stringify({ type: 'reload', timestamp: Date.now() })}\n\n`;
    for (const client of sseClients) {
      try {
        if (typeof client.write === 'function') {
          client.write(payload);
        }
      } catch {
        sseClients.delete(client);
      }
    }
  };

  const watcher = setupLiveReloadWatcher(rootDir, broadcast);
  const handler = createPreviewRequestHandler({
    ...options,
    sseClients,
    getReloadToken: () => reloadToken,
  });

  const server = http.createServer(handler);
  const originalClose = server.close.bind(server);
  server.close = (callback) => {
    watcher.close();
    for (const client of sseClients) {
      try {
        if (typeof client.end === 'function') client.end();
      } catch {}
    }
    sseClients.clear();
    return originalClose(callback);
  };

  return server;
}
