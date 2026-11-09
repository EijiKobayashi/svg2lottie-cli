# AIエージェント用プロンプト集 (`docs/prompt.md`)

> **TL;DR** （このファイルの使い方）
> 誰がどのAIエージェント（Gemini / Claude / ChatGPT / Cursor 等）に投げても、または GitHub Issue に起票しても、 **100%同じ要件・同じ品質のコードとLottieアニメーション** が出力されるように設計されたプロンプトテンプレート集です。

---

## プロンプト1: `svg2lottie-cli` 本体実装・改修プロンプト

```markdown
あなたは最高峰のソフトウェアエンジニア兼テクニカルアニメーターです。
本リポジトリの以下のドキュメントをすべて読み込み、仕様に100%準拠して開発を進めてください。

1. `AGENTS.md`（開発原則・KISS・TDD・セキュア第一・a11y第二・文字コンテ駆動）
2. `docs/requirements.md`（機能要件・非機能要件・検収スタジオ・エフェクトモジュール化）
3. `docs/data-model.md`（ShootingScript・StoryboardConfig・RevisionInstruction・Lottieスキーマ）
4. `docs/api-specification.md`（CLI・文字コンテAPI・エフェクトモジュールAPI・HTTPサーバー仕様）

### 絶対厳守ルール
- **ロゴ専用ではない汎用設計**: アイコン、ヒーローイラスト、UIアニメーション、バッジ、ロゴすべてに使える汎用設計を保つこと。
- **マルチランナー対応**: `npm`, `npx`, `pnpm`, `yarn` のいずれからでも起動できる状態を維持すること。
- **後方互換・データ移行は一切行わない**: 常に最新かつ最もシンプルなKISSコードに書き換えること。
- **外部依存ゼロ**: `package.json` に外部パッケージを追加せず、Node.js (v20+) 標準モジュールのみで実装すること。
- **エフェクトのモジュール化**: キラーエフェクトは `src/effects/` 配下に1ファイル1エフェクトで分離し、随時追加可能にすること。
- **4ステップ開発サイクル**:
  1. 先に `docs/` および `README.md` を更新し、仕様矛盾がないことを確認する
  2. `node:test` を用いて `tests/` にテストを書く（TDD）
  3. テストを通す最小限のコードを `src/` に実装する
  4. 不要コードやドキュメントとの乖離がないか最終確認し、`npm test` が全件パスすることを確認する
```

---

## プロンプト2: 文字コンテ（`shooting-script.md`）＋ SVG から新規アニメーションを構築するプロンプト

```markdown
あなたは最高に優秀なLottieアニメーターです。
配置された `shooting-script.md`（文字コンテ）と SVG ファイル群を読み込み、`docs/data-model.md` の `StoryboardConfig` スキーマに準拠した `storyboard.json` を作成し、`npx svg2lottie-cli build` で Lottie JSON をビルドしてください。

### アニメーション演出の鉄則（必ず守ること）
1. **完全透過・Day & Night 反転対応**:
   - 背景レイヤーや `#fff` / `#ffffff` の白塗り座布団は一切出力しないこと。
2. **初期待機とフレーム境界**:
   - 待機状態の透過レイヤーは `0f` から明確に `opacity: 0%` を維持すること（1fだけ見える等のバグを出さないこと）。
3. **17種のモジュラー・キラーエフェクトの活用** （`src/effects/`）:
   `storyboard.json` の各レイヤーに `"effects": [{ "type": "<effect-name>", ... }]` を記述するだけで、以下の17種のエフェクトを自在に組み合わせられます：
   - **トランジション・出現**: `cross-dissolve`（ディゾルブ）、`bleed-fade`（滲んだフェードIn/Out＋センター全方位拡縮＋`clipMask: true` 加算マスク）、`wipe`（上下左右・円形ワイプ）、`slide-push-pull`（スライド・Push/Pull）、`pop-in`（弾性ポップイン）、`trim-stroke`（一筆書き枠線、70%描画時点で内部要素のフェードインを重ねると好テンポ）。
   - **モーション・時間制御**: `zoom-slide-spin`（ズーム・スライド・スピン）、`transform`（位置・拡縮・回転・スキュー）、`speed-control`（倍速・スローモーション・フリーズ）。
   - **カラー・マスク・キーイング**: `color-grade`（色調補正・グレーディング）、`mask`（加算/減算/交差マスク）、`ultra-key`（グリーンスクリーン等の特定色自動透過）。
   - **光学・Apple的UI質感**: `echo-glow-neon`（残像エコー・発光グロー・ネオン管）、`liquid-glass`（すりガラス・グラスプレート・Apple風リキッドグラス屈折ハイライト）。
   - **物理・自然・破壊シミュレーション**: `glass-crack`（ガラスひび割れ＆破片）、`fire`（炎揺らぎ＆火の粉）、`water`（水波紋リップル＆スプラッシュ）、`powder-scatter`（粉飛散エンディング `"powderEnding": { "enabled": true }`）。
```

---

## プロンプト3: 検収プレビューからの構造化修正指示（または GitHub Issue）テンプレート

検収プレビュー画面（`http://127.0.0.1:4322`）の「AI修正指示ジェネレーター」から自動出力されるフォーマットです。AIチャットまたは GitHub Issue にそのまま貼り付けて使用します。

現在の標準フローでは、検収中の気づきを変更Inboxへ保存し、変更契約を人間が承認した後にだけAgent向け指示を出力します。下書き・確認待ち・保留・不明点ありのカードから実装を開始してはいけません。

```markdown
### アニメーション修正指示

- **対象ファイル**: `<fileName>.json`
- **対象シーン・フレーム**: `<scene>` (`<frame>f` / 全`<totalFrames>f`)
- **対象レイヤーID**: `<layerId>`
- **現象と修正内容**:
  <ここに具体的な修正指示（例：動き出しを10フレーム早める / スケールを0%〜100%にする 等）>

#### 回帰防止ガード（絶対に壊してはいけない既存仕様）
- [ ] `0f` 待機状態のレイヤーは `opacity: 0%`（完全透過）を維持しているか？
- [ ] ガウスブラーがオブジェクト境界外にはみ出ていないか（`clipMask: true` 維持）？
- [ ] `#fff` 等の不要な白座布団が出力されておらず、Day & Night 色反転で正常に見えるか？
- [ ] 指摘箇所以外のシーンのテンポ・イージング・座標を変更していないか？
```

Agentは承認済み変更契約の「変更対象」に限って編集し、変更禁止範囲、対象外シーン、対象外レイヤー、対象外プロパティを変更してはいけません。曖昧な箇所を推測したり、ついでのリファクタリングを行ったりせず、不明点があれば作業を停止して確認します。

---

## プロンプト4: 新規キラーエフェクト追加プロンプト（モジュール拡張用）

```markdown
`src/effects/` に新しいキラーエフェクト `<effect-name>.mjs` を追加してください。

### 手順（4ステップ開発サイクル厳守）
1. `docs/requirements.md`、`docs/data-model.md`、`docs/api-specification.md` に新エフェクトのスキーマと仕様を追記する。
2. `tests/effects.test.mjs` に新エフェクトの単体テストを追加し、`npm test` で Red を確認する。
3. `src/effects/<effect-name>.mjs` を純粋関数として最小実装し、`src/effects/index.mjs` の `EFFECT_REGISTRY` に登録する。
4. `npm test` が全件パスし、不要コードやドキュメント矛盾がないことを確認する。
```
---

## プロンプト5: インタラクション設定（ホバー・クリック）とWebサイト埋め込みプロンプト

```markdown
作成したLottieアニメーションに、Webサイト組み込み用のインタラクション（ホバー連動・クリック遷移）を設定してください。

### 要件
1. `docs/data-model.md` の `InteractionConfig` に従い、`storyboard.json` のルートに `interaction` オブジェクトを追加する。
2. ホバー動作 (`hover`: `"play" | "reverse" | "loop" | "pause"`)、クリック動作 (`click`: `"toggle" | "seek" | "url"`) を指定する。
3. `click: "url"` 時の遷移先URLは、`javascript:` や未許可スキームを排除し、安全なURL（`https://` または相対パス）に限定する。
4. `src/interaction.mjs` を通じて、Webサイトへ1行で貼り付け可能なセキュアなHTML埋め込みコード（`buildEmbedSnippet`）を生成する。
```

---

## プロンプト6: Lottie ネイティブ・シェイプレイヤー基本機能（Trim, Offset, Merge, Repeater, Round Corners, Gradients）活用プロンプト

```markdown
あなたはLottie/Bodymovinの仕様を熟知したベクターアニメーションエンジニアです。
After Effectsの「エフェクト」メニューではなく、シェイプレイヤー内の「追加（Add）」メニューに直結するLottieネイティブ機能群を使って、軽量・高速・完全ベクターなアニメーションを構築してください。

### 対象モディファイアと指定方法 (`storyboard.json` レイヤー内)
1. **パスのトリミング (`trim`)**:
   - 線が伸びるアニメーション（開始 `start`: 0〜100, 終了 `end`: 0〜100, `startFrame`, `endFrame`）
   - 出力Lottie: `{ "ty": "tm", "s": {...}, "e": {...}, "o": {...}, "m": 1 }`
2. **パスのオフセット (`offsetPaths`)**:
   - パスを太らせる/細める肉付け（`amount`: 正負のpx, `lineJoin`: "round"|"miter"|"bevel"）
   - 出力Lottie: `{ "ty": "op", "a": {...}, "lj": 2, "ml": 4 }`
3. **パスの結合 (`mergePaths`)**:
   - ブーリアン演算（`mode`: "merge" | "add" | "subtract" | "intersect" | "exclude"）
   - 出力Lottie: `{ "ty": "mm", "mm": 1..5 }` ※Web完全対応、ネイティブ注意
4. **リピーター (`repeater`)**:
   - 配列複製と弾ける演出（`copies`: 数量, `rotation`: 複製ごとの角度, `scale`: 拡大縮小）
   - 出力Lottie: `{ "ty": "rp", "c": {...}, "o": {...}, "tr": {...} }`
5. **角を丸くする (`roundCorners`)**:
   - 動的角丸半径（`radius`: 角丸px, `startFrame`, `endFrame`）
   - 出力Lottie: `{ "ty": "rd", "r": {...} }`
6. **グラデーション塗り (`gradientFill`) & グラデーション線 (`gradientStroke`)**:
   - 線形/放射状（`type`: "linear" | "radial", `start`: [x, y], `end`: [x, y], `stops`: [{ offset, color }]）
   - 出力Lottie: `{ "ty": "gf" | "gs", "t": 1 | 2, "s": {...}, "e": {...}, "g": {...} }`

### 回帰防止ガード（厳守）
- [ ] 0f待機状態のレイヤーは `opacity: 0%` を維持しているか？
- [ ] 白座布団（#fff）を出力せず、透過チェッカー・Dark Modeで正常に映えるか？
- [ ] 外部依存ライブラリを一切追加せず、Node.js標準機能だけで動作するか？
```
1. `storyboard.json` のルートに `interaction` 設定を付与する：
   - ホバー再生（`hover: "play"` または `"reverse"` / `"loop"`）
   - クリック挙動（`click: "toggle"` または `"seek"` / `"url"`）
2. 安全なURL検証（`https://` または許可された相対パスのみ）。
3. 検収スタジオ（`docs/index.html`）で動作確認を行い、1行埋め込みHTMLコード（`<script>` + `<div id="lottie-...">`）を出力する。
```

# 季節演出テンプレート

- 冬・クリスマス素材では雪片グループだけを独立レイヤーにし、`snowfall-loop` の `end` を総フレーム数へ合わせる。
- タイトル文字は単語または文字グループ単位で開始フレームをずらし、ポップインと暖色グローを組み合わせる。
- 背景、建物、文字、雪の順にレイヤーを分離し、元SVGの配色は `preserveColors: true` で維持する。
