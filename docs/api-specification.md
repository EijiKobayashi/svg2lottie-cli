# API・CLI仕様書 (`docs/api-specification.md`)

> **TL;DR（インターフェース一覧）**
> 本プロジェクトは以下の **4つのインターフェース** を提供します。
> 1. **マルチランナー対応 CLI (`src/cli.mjs`)**: `npm` / `npx` / `pnpm` / `yarn` から `init` / `build` / `preview` を実行
> 2. **コア＆文字コンテ API (`src/*.mjs`)**: SVG変換・文字コンテ解析・修正指示フォーマット生成
> 3. **キラーエフェクト・モジュール API (`src/effects/*.mjs`)**: 滲んだフェード・移動・一筆書き・粉飛散の独立モジュール群
> 4. **検収プレビュー＆AI修正指示スタジオ HTTP API (`src/preview-server.mjs`)**: `127.0.0.1` 限定の検収サーバー

---

## 1. CLI インターフェース (`src/cli.mjs`)

`package.json` の `bin` (`svg2lottie`, `svg2lottie-cli`) により、どのツールからでも起動可能です。

```mermaid
flowchart TD
  Runner["npx / npm / pnpm / yarn"] --> CLI["svg2lottie-cli (src/cli.mjs)"]
  CLI --> CmdInit["init<br/>--dir <dir>"]
  CLI --> CmdBuild["build<br/>--config <path> --out <dir>"]
  CLI --> CmdPreview["preview<br/>--dir <dir> --port <number>"]
  CLI --> CmdHelp["--help / -h"]
```

### 1.1 `init` コマンド
文字コンテ（`shooting-script.md`）、設計図（`storyboard.json`）、サンプルSVG（`svg/scene0.svg`）を生成します。

```bash
npx svg2lottie-cli init [--dir <dir>]
# または: pnpm dlx svg2lottie-cli init / yarn dlx svg2lottie-cli init / npm run init
```

| オプション | 短縮 | デフォルト値 | 説明 |
|---|---|---|---|
| `--dir` | `-d` | `.` | 雛形を生成するディレクトリパス |

### 1.2 `build` コマンド
`storyboard.json`（および紐づく `shooting-script.md`・SVG素材）を読み込み、Lottie JSON ファイルを出力します。

```bash
npx svg2lottie-cli build [--config <path>] [--out <dir>]
```

| オプション | 短縮 | デフォルト値 | 説明 |
|---|---|---|---|
| `--config` | `-c` | `storyboard.json` | ストーリーボード定義JSONファイルのパス |
| `--out` | `-o` | `dist` | 出力先ディレクトリパス |

### 1.3 `preview` コマンド
インタラクティブ検収プレビュー＆AI修正指示スタジオを起動します。

```bash
npx svg2lottie-cli preview [--dir <dir>] [--port <port>]
```

| オプション | 短縮 | デフォルト値 | 説明 |
|---|---|---|---|
| `--dir` | `-d` | `.` | 配信対象ディレクトリ（`dist/` や `shooting-script.md` を含むルート） |
| `--port` | `-p` | `4322` | 待受ポート番号（`127.0.0.1` 固定） |

---

## 2. コア＆文字コンテ API (`src/*.mjs`)

### 2.1 `src/path-parser.mjs`
| 関数シグネチャ | 説明 |
|---|---|
| `hexToLottieColor(hex: string): [number, number, number, 1]` | `#RGB` / `#RRGGBB` を Lottie 正規化 RGBA 配列（`0〜1`、小数点4桁丸め）に変換する。 |
| `parseSvgPathToLottieShapes(d: string): LottieShape[]` | SVG Path の `d` 属性文字列を解析し、サブパスごとの `{ c, v, i, o }` 配列に変換する。 |
| `computeShapesCenter(shapes: LottieShape[], fallbackX?: number, fallbackY?: number): [number, number]` | 頂点群のバウンディングボックス中心 `[cx, cy]` を算出する。 |

### 2.2 `src/svg-extractor.mjs`
| 関数シグネチャ | 説明 |
|---|---|
| `validateSafeSvg(svgText: string): void` | `<script>` タグ、`<!ENTITY`、`on*` イベント属性、サイズ超過（10MB超）を拒否する。 |
| `extractPathDsById(svgText: string, targetId?: string): string[]` | 安全性を検証した上で、指定 `id` を持つ要素から `d` 属性配列を抽出する（白座布団 `#fff` は除外）。 |
| `extractViewBox(svgText: string): { width: number, height: number }` | SVG の `viewBox` または `width`/`height` からサイズを抽出する。 |

### 2.3 `src/shooting-script.mjs`（文字コンテ＆修正指示モジュール）
| 関数シグネチャ | 説明 |
|---|---|
| `parseShootingScript(markdownText: string): ParsedShootingScript` | `shooting-script.md` からタイトル、キーワード、回帰防止ガード、シーン別演出・修正履歴を抽出する。 |
| `createDefaultShootingScript(name?: string): string` | `init` コマンドで出力する文字コンテ Markdown テンプレートを生成する。 |
| `formatRevisionInstruction(revision: RevisionInstruction): string` | 検収プレビュー等で入力された修正情報を、AIエージェント／GitHub Issue 貼り付け用の構造化 Markdown に整形する。 |

### 2.4 `src/lottie-builder.mjs`
| 関数シグネチャ | 説明 |
|---|---|
| `buildLottieFromStoryboard(config: StoryboardConfig, svgResolver: (svgPath: string) => string): LottieAnimation` | `StoryboardConfig` と `src/effects/` モジュール群を組み合わせて Lottie JSON を生成する。 |
| `appendPowderEnding(baseLottie: LottieAnimation, config: StoryboardConfig, svgResolver: (svgPath: string) => string): LottieAnimation` | `powder-scatter.mjs` を呼び出し、粉飛散エンディング付きの派生 Lottie JSON を返す。 |

---

## 3. キラーエフェクト・モジュール API (`src/effects/*.mjs`)

新しいエフェクトを追加する場合は `src/effects/<effect-name>.mjs` を作成し、`src/effects/index.mjs` の `EFFECT_REGISTRY` に登録します。

| モジュール | エクスポート関数 | 責務 |
|---|---|---|
| `src/effects/index.mjs` | `EFFECT_REGISTRY`, `listEffects()` | 登録済みキラーエフェクトの一覧取得とディスパッチ |
| `src/effects/bleed-fade.mjs` | `buildBleedFadeProps(options)` | 不透明度 (`o`)、全方位スケール (`s`)、Gaussian Blur (`ty: 29`)、加算マスク (`masksProperties` `mode: 'a'`) の構築 |
| `src/effects/move-slide.mjs` | `buildMoveKeyframes(options)` | 初期オフセット `[cx + dx, cy + dy]` から `[cx, cy]` へのイージング移動キーフレーム構築 |
| `src/effects/trim-stroke.mjs` | `buildTrimStrokeLayer(options)` | 頂点配列・線幅・開始終了フレームから Trim Paths (`ty: 'tm'`) レイヤーを構築 |
| `src/effects/powder-scatter.mjs` | `applyPowderScatter(baseLottie, options)` | 頂点サンプリングから粒子レイヤー群を生成し、本体・外枠と同期して枠内飛散＆完全透過させる |

---

## 4. HTTP プレビューサーバー仕様 (`src/preview-server.mjs`)

| メソッド | パス | レスポンス | 説明 |
|---|---|---|---|
| `GET` | `/` または `/preview/index.html` | `200 text/html; charset=utf-8` | 検収プレビュー＆AI修正指示スタジオ HTML |
| `GET` | `/api/animations` | `200 application/json` | `dist/` 内の `.json` ファイル一覧 `{ "files": ["..."] }` |
| `GET` | `/dist/<name>.json` | `200 application/json` | 生成された Lottie JSON ファイル |
| `GET` | `/../...` (ディレクトリ外) | `403 text/plain` | パストラバーサル攻撃をブロック (`Forbidden`) |
| `GET` | 存在しないパス | `404 text/plain` | `Not Found` |
