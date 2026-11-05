# 文字コンテ (tropical-vibes-wide / 横長ワイド 800×325px)

## キャンバスサイズ・基本設定（初期入力欄）
- 横幅 (width): 800px
- 縦幅 (height): 325px
- フレームレート (fps): 60fps
- 総フレーム数 (durationFrames): 240f
- ベースカラー (color): #27aae1

## 全体仕様・キーワード
- 元SVG（3500×1423px）をWebバナー・ヒーロー領域に最適な **800×325px（横長 2.46:1）** に自動スケーリング
- 不要な外枠フレームは一切描画せず、トロピカルなスプラッシュ形状をそのまま活かす
- 64個の水しぶきドロップレットと6つのカラフルなメインモチーフがそれぞれの中心から時間差カスケード（stagger）で弾けるように出現

## scene0 (0f〜80f: Tropical Splash & Pastel Sand)
- aqua-splash-bg: 0f〜48fで滲んだフェードイン＋横ワイプで爽やかに出現
- pastel-sand-bg: 10f〜60fで左からバウンス付きスライドイン（slide-push-pull）

## scene1 (80f〜160f: Undulating Ocean Waves & Staggered Colorful Vibes)
- ocean-waves: 20f〜75fで下から波がせり上がり、水面ウェーブ揺らぎ＆リップル波紋（water）が広がる
- tropical-droplets: 30f〜115fで64個の水しぶきが **0.7f差の連鎖（stagger）** で次々と弾ける
- colorful-beach-vibes: 28f〜105fでカラフルなメインモチーフ群（#234851 / #27aae1 / #fa667e / #fbb040 / #9b8579 / #d7df23）が **5f差の連鎖ポップイン（stagger）** ＋リキッドグラスの光沢シマーで登場

## scene2 (160f〜240f: Hold & Multi-Color Powder Scatter)
- 完成静止後、180f〜230fでトロピカルカラーのまま微細粒子となって放射飛散（powder-scatter）し完全透過へ戻る

## 絶対維持ルール（回帰防止ガード）
- [ ] 不要な四角い外枠（frame-stroke）は一切追加しないこと
- [ ] 0f待機状態のオブジェクトは必ず透過0%を維持する
- [ ] カラフルな各パスの固有色（preserveColors: true）を維持する
