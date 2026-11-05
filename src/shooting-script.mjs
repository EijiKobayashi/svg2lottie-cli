/**
 * 文字コンテ(shooting-script.md)解析・テンプレート生成・AI修正指示整形モジュール
 */

/**
 * 文字コンテ Markdown を解析し構造化オブジェクト（縦横サイズ等の初期設定含む）を返す
 * @param {string} markdownText
 */
export function parseShootingScript(markdownText) {
  const lines = String(markdownText || '').split(/\r?\n/);
  let title = 'Animation Shooting Script';
  let width = 520;
  let height = 140;
  let fps = 60;
  let durationFrames = 180;
  let color = '#264f74';
  const keywords = [];
  const guards = [];
  const scenes = [];

  let currentSection = '';
  let currentScene = null;
  let inRevisions = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
      continue;
    }

    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim();
      inRevisions = false;
      if (/^scene\d+/i.test(heading)) {
        const sceneId = heading.split(/\s+/)[0];
        currentScene = { id: sceneId, directions: [], revisions: [] };
        scenes.push(currentScene);
        currentSection = 'scene';
      } else if (heading.includes('サイズ') || heading.includes('基本設定') || heading.includes('初期入力')) {
        currentSection = 'dimensions';
        currentScene = null;
      } else if (heading.includes('キーワード') || heading.includes('全体仕様')) {
        currentSection = 'keywords';
        currentScene = null;
      } else if (heading.includes('絶対維持') || heading.includes('回帰防止')) {
        currentSection = 'guards';
        currentScene = null;
      } else {
        currentSection = 'other';
        currentScene = null;
      }
      continue;
    }

    if (line.startsWith('### ')) {
      const sub = line.slice(4).trim();
      inRevisions = sub.includes('修正');
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const item = line.slice(2).replace(/^\[[ xX]\]\s*/, '').trim();

      // 縦横サイズ・基本設定のパース（どのセクションにあっても認識可能）
      const widthMatch = item.match(/(?:横幅|width)[^:\d]*[:：]\s*(\d+(?:\.\d+)?)/i);
      if (widthMatch) {
        width = Number.parseFloat(widthMatch[1]);
        continue;
      }
      const heightMatch = item.match(/(?:縦幅|高さ|height)[^:\d]*[:：]\s*(\d+(?:\.\d+)?)/i);
      if (heightMatch) {
        height = Number.parseFloat(heightMatch[1]);
        continue;
      }
      const fpsMatch = item.match(/(?:フレームレート|fps)[^:\d]*[:：]\s*(\d+(?:\.\d+)?)/i);
      if (fpsMatch) {
        fps = Number.parseFloat(fpsMatch[1]);
        continue;
      }
      const durMatch = item.match(/(?:総フレーム数|durationFrames)[^:\d]*[:：]\s*(\d+)/i);
      if (durMatch) {
        durationFrames = Number.parseInt(durMatch[1], 10);
        continue;
      }
      const colorMatch = item.match(/(?:ベースカラー|color)[^#]*?(#[0-9a-fA-F]{3,6})/i);
      if (colorMatch) {
        color = colorMatch[1];
        continue;
      }

      if (currentSection === 'keywords') {
        keywords.push(item);
      } else if (currentSection === 'guards') {
        guards.push(item);
      } else if (currentSection === 'scene' && currentScene) {
        if (inRevisions) {
          currentScene.revisions.push(item);
        } else {
          currentScene.directions.push(item);
        }
      }
    }
  }

  return {
    title,
    width,
    height,
    fps,
    durationFrames,
    color,
    keywords,
    guards,
    scenes,
  };
}

/**
 * init コマンド用の文字コンテ Markdown テンプレートを生成する（冒頭に縦横サイズ初期入力欄付き）
 * @param {string} [name='sample-animation']
 * @param {{ width?: number, height?: number, fps?: number, durationFrames?: number, color?: string }} [options]
 * @returns {string}
 */
export function createDefaultShootingScript(name = 'sample-animation', options = {}) {
  const {
    width = 520,
    height = 140,
    fps = 60,
    durationFrames = 180,
    color = '#264f74',
  } = options;

  return `# 文字コンテ (${name})

## キャンバスサイズ・基本設定（初期入力欄）
- 横幅 (width): ${width}px
- 縦幅 (height): ${height}px
- フレームレート (fps): ${fps}fps
- 総フレーム数 (durationFrames): ${durationFrames}f
- ベースカラー (color): ${color}

## 全体仕様・キーワード
- 滲んだようなフェードイン・フェードアウト（ガウスブラー＋センター全方位拡縮）
- 背景は完全透過とし、Day & Night の色反転でも美しく見える単色または透過構成にする
- ガウス効果がオブジェクト境界外にはみ出ないよう加算マスク（clipMask: true）を適用する

## scene0 (0f〜90f)
- main-icon: 0f〜20fまで中央で透過0%待機、20f〜70fで滲んだフェードイン＋ポップインで出現
- frame-line: 0f〜60fで右上から反時計回りに一筆書き枠線（trim-stroke）を描画

### 修正履歴
- 0f〜20fの待機時は必ず透過0%を維持すること

## 絶対維持ルール（回帰防止ガード）
- [ ] 0f待機状態のオブジェクトは必ず透過0%を維持する（1f目だけ見えるバグを防ぐ）
- [ ] 背景レイヤーや #fff の白座布団は出力しない
- [ ] ガウスブラーがオブジェクト境界外にはみ出ないこと（clipMask: true 維持）
`;
}

/**
 * 検収プレビュー等で入力された修正情報を、AIエージェント／GitHub Issue 用の構造化 Markdown に整形する
 * @param {{
 *   fileName: string,
 *   scene: string,
 *   frame: number,
 *   totalFrames?: number,
 *   layerId: string,
 *   instruction: string,
 *   guards?: string[]
 * }} revision
 * @returns {string}
 */
export function formatRevisionInstruction(revision) {
  const {
    fileName = 'animation.json',
    scene = 'scene0',
    frame = 0,
    totalFrames = 560,
    layerId = '全体',
    instruction = '',
    guards = [
      '`0f` 待機状態のレイヤーは `opacity: 0%`（完全透過）を維持しているか？',
      'ガウスブラーがオブジェクト境界外にはみ出ていないか（`clipMask: true` 維持）？',
      '`#fff` 等の不要な白座布団が出力されておらず、Day & Night 色反転で正常に見えるか？',
      '指摘箇所以外のシーンのテンポ・イージング・座標を変更していないか？',
    ],
  } = revision || {};

  const guardLines = guards.map((g) => `- [ ] ${g}`).join('\n');

  return `### アニメーション修正指示 (${scene} / ${frame}f付近)

- **対象ファイル**: \`${fileName}\`
- **対象シーン・フレーム**: \`${scene}\` (\`${frame}f\` / 全\`${totalFrames}f\`)
- **対象レイヤーID**: \`${layerId}\`
- **現象と修正内容**:
  ${instruction.trim() || '（ここに具体的な修正内容を記述してください）'}

#### 回帰防止ガード（絶対に壊してはいけない既存仕様）
${guardLines}
`;
}
