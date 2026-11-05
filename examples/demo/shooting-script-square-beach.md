# 文字コンテ (beach-island-square / 正方形 600×600px)

## キャンバスサイズ・基本設定（初期入力欄）
- 横幅 (width): 600px
- 縦幅 (height): 600px
- フレームレート (fps): 60fps
- 総フレーム数 (durationFrames): 240f
- ベースカラー (color): #0093dd

## 全体仕様・キーワード
- 元SVG（3000×3000px）をWeb/UIで扱いやすい **600×600px（正方形 1:1）** に自動スケーリング
- 不要な外枠フレームは一切描画せず、イラスト本来のシルエットと透過を活かす
- 夕陽（#f68c1f / #fdb419）、海と島（#0093dd）、19個の白いヤシの葉＆波しぶき（#ffffff）をパーツごとの中心から順番にカスケード（stagger）出現させる

## scene0 (0f〜80f: Sunset Horizon)
- sunset-halo: 0f〜50fで夕陽の外輪が滲んだフェードイン＋弾性ポップインで出現し、太陽の熱粒（fire）がゆらめく
- golden-sun-rays: 12f〜64fで黄金の太陽と光線が滑らかにポップイン展開

## scene1 (80f〜160f: Ocean Wave & Staggered Palm Fronds)
- ocean-and-island: 22f〜78fで下方からせり上がり（slide-push-pull）、水面の揺らぎと波紋（water）が広がる
- palm-and-wave-foam: 36f〜115fで19個の白いヤシの葉・カモメ・波しぶきが **1パーツずつ2.2f差の連鎖（stagger）** で弾むように出現し、リキッドグラスの光沢シマーが走る

## scene2 (160f〜240f: Hold & Multi-Color Powder Scatter)
- 完成状態で静止後、180f〜230fでイラスト各部の色（オレンジ・黄金・マリンブルー・白）を保ったまま微細な砂粒となって放射飛散（powder-scatter）し、完全透過へ戻る

## 絶対維持ルール（回帰防止ガード）
- [ ] 不要な四角い外枠（frame-stroke）は一切追加しないこと
- [ ] 0f待機状態のオブジェクトは必ず透過0%を維持する
- [ ] ヤシの木や波の白いパーツ（#fff）が消えないよう keepWhitePaths: true を維持する
