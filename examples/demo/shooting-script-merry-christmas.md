# 文字コンテ (merry-christmas-house / 800×450px)

## キャンバスサイズ・基本設定（初期入力欄）
- 横幅 (width): 800px
- 縦幅 (height): 450px
- フレームレート (fps): 60fps
- 総フレーム数 (durationFrames): 240f
- ベースカラー (color): #f6dda5

## 全体仕様・キーワード
- 元SVG（4000×2250px）から背景座布団（night-sky）を完全に除外して完全透過化
- Web/UIに最適な **800×450px（16:9）** に自動スケーリング
- Day & Night 反転（CSS `invert`）やダークモード、透過チェッカーボードのいずれでも美しく映える設計
- 聖夜の星空、煙突の煙、雪の積もった屋根と家、暖かく灯る窓、舞い散る雪片（snowfall-loop）、そして「MERRY CHRISTMAS」の文字がリズミカルにポップイン

## scene0 (0f〜60f: Starry Sky & Silent Snow)
- sky-stars: 0f〜45fで星々が柔らかくポップイン出現
- snow-ground: 10f〜58fで雪原が下方からすっと浮上
- sky-snowflakes: 0f〜240fを通して途切れなく上から下へ舞い落ちる（snowfall-loop）

## scene1 (50f〜130f: Christmas House & Warm Windows)
- house-body: 22f〜72fで家本体が出現
- house-roof-snow: 32f〜76fで屋根の雪がふんわりと重なる
- chimney-smoke: 40f〜90fで煙突から煙がふわりと立ち昇る
- warm-windows: 52f〜92fで窓に温かな光が灯る（ポップイン）

## scene2 (90f〜170f: Merry Christmas Staggered Lettering)
- merry-letters: 72f〜110fで「M-E-R-R-Y」が1文字ずつ時間差（stagger: 4f）でポンポンポンと出現
- christmas-letters: 94f〜130fで「C-H-R-I-S-T-M-A-S」が1文字ずつ時間差（stagger: 3.2f）で軽快にステップ出現

## scene3 (170f〜240f: Peaceful Winter Landscape)
- 全体が美しく調和した状態で雪が静かに降り続ける見せ場

## 絶対維持ルール（回帰防止ガード）
- [ ] 背景レイヤー（night-sky 四角形）は出力しない（Day & Night 反転・透過表示を壊さないため）
- [ ] 不要な外枠フレームは描画しないこと
- [ ] 0f待機状態のオブジェクトは透過0%を維持すること
