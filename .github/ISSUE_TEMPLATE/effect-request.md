---
name: "✨ キラーエフェクト追加リクエスト (New Killer Effect)"
about: "src/effects/ に新しいモジュラーエフェクトを追加する提案・指示"
title: "feat(effect): [エフェクト名] エフェクトモジュールの追加"
labels: ["enhancement", "effect"]
---

### 追加したいキラーエフェクトの概要

- **エフェクト識別名** (`effectName`): 例 `ripple-wave`
- **モジュールファイル名**: `src/effects/<effect-name>.mjs`
- **対象ユースケース**: （アイコン / イラスト / ロゴ / ローディング 等）

### `storyboard.json` での設定イメージ（`effects` 配列）

```json
{
  "effects": [
    {
      "type": "new-effect-name",
      "start": 0,
      "end": 60
    }
  ]
}
```

> **現在標準搭載されている17種のエフェクトモジュール** （`src/effects/`）:
> `cross-dissolve`, `bleed-fade`, `wipe`, `slide-push-pull`, `pop-in`, `trim-stroke`, `zoom-slide-spin`, `transform`, `speed-control`, `color-grade`, `mask`, `ultra-key`, `echo-glow-neon`, `liquid-glass`, `glass-crack`, `fire`, `water`, `powder-scatter`

### 期待するLottie出力仕様（キーフレーム・エフェクト）

- 操作するLottieプロパティ（`ks.o`, `ks.s`, `ks.p`, `ef`, `shapes` 等）:
- 完了条件（TDDテスト項目）:
  - [ ] `docs/` 3ファイル（`requirements.md`, `data-model.md`, `api-specification.md`）の更新
  - [ ] `tests/` への単体テスト追加（`node --test`）
  - [ ] `src/effects/` への最小KISS実装と `EFFECT_REGISTRY` 登録
