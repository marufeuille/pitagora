# ピタゴラスイッチ風ゲーム 設計プラン

## 概要

ブラウザで動作する Rube Goldberg 風サンドボックスゲーム。  
ユーザーが各種パーツを自由に配置し、ボールが連鎖反応しながら転がる様子を楽しむ。  
iPad（タッチ操作）にも対応し、作った装置のセーブ・ロードが可能。

---

## 技術スタック

| カテゴリ | 採用 | 理由 |
|--------|------|------|
| ゲームフレームワーク | **Phaser 3** | Matter.js 統合済み、iPad タッチ対応、2D ゲームの実績多数 |
| 物理エンジン | **Matter.js**（Phaser 組み込み） | 安定した 2D 物理演算、関節・複合ボディに対応 |
| 言語 | **TypeScript** | パーツ型定義など型安全が効くため |
| ビルドツール | **Vite** | 高速 HMR、シンプルな設定、TypeScript ネイティブ |
| テスト | **Vitest** | Vite と統合、ユニットテスト |
| スタイリング（UI） | **CSS Modules** | ゲーム外 UI（ツールバー等）のスタイリング |

### 3D ライクビジュアルの方針

Phaser 3 は 2D フレームワークだが、以下の手法で 3D 感を演出する：

- オブジェクトへの **影・ハイライト描画**（Canvas 2D のグラデーション活用）
- **奥行き感のある背景**（遠景レイヤー + カメラパララックス）
- テクスチャに **ベベル・立体感** を加えたスプライト
- 将来的な拡張パスとして Three.js / Babylon.js への移行も考慮（物理部分は共通化しやすい設計にする）

---

## ゲームモード

| モード | 説明 |
|------|------|
| **Edit Mode**（編集） | パーツを配置・削除・移動・回転する |
| **Play Mode**（再生） | 物理演算を有効にしてシミュレーション開始 |
| **Pause Mode**（一時停止） | シミュレーションを止めて観察 |
| *(拡張) Challenge Mode* | ゴール地点にボールを届けるパズル |

---

## パーツ仕様

### MVP パーツ

| パーツ名 | 物理的な振る舞い | Matter.js 実装 |
|--------|----------------|--------------|
| **ボール** | 重力で落下、斜面を転がる | 動的 Circle Body |
| **斜面 (Ramp)** | 静的な傾いた面 | 静的 Rectangle Body（角度あり） |
| **板 (Platform)** | 静的な水平の面 | 静的 Rectangle Body |
| **ドミノ (Domino)** | 押されると倒れ連鎖する | 動的 Rectangle Body（高い慣性設定） |
| **シーソー (Seesaw)** | 中央軸で左右に回転する | 動的 Rectangle Body + Constraint（ピン結合） |

### 将来拡張パーツ（設計上考慮するが MVP には含めない）

- バネ・ジャンプ台
- ファン（風力・力場）
- ベルトコンベア
- 滑車・ロープ（Constraint チェーン）
- トンネル・管

---

## アーキテクチャ

### ディレクトリ構成

```
pitagora/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   └── assets/
│       ├── images/        # スプライト・テクスチャ
│       └── sounds/        # 効果音（任意）
└── src/
    ├── main.ts            # エントリポイント：Phaser.Game インスタンス生成
    ├── game.ts            # Phaser.Game の設定（サイズ、物理設定等）
    ├── constants.ts       # 重力、グリッドサイズ、ズーム等の定数
    ├── scenes/
    │   ├── BootScene.ts   # アセット読み込み → GameScene へ遷移
    │   ├── MenuScene.ts   # タイトルメニュー
    │   └── GameScene.ts   # メインゲームシーン（Edit/Play を管理）
    ├── parts/
    │   ├── BasePart.ts    # 抽象基底クラス（全パーツ共通インターフェース）
    │   ├── Ball.ts
    │   ├── Ramp.ts
    │   ├── Platform.ts
    │   ├── Domino.ts
    │   └── Seesaw.ts
    ├── managers/
    │   ├── EditManager.ts        # 配置・選択・移動・回転・削除
    │   ├── SimulationManager.ts  # Play/Pause/Reset 制御
    │   └── SaveLoadManager.ts    # LocalStorage + JSON エクスポート/インポート
    ├── ui/
    │   ├── Toolbar.ts     # 左パネル：パーツ選択ボタン
    │   ├── ControlBar.ts  # 上部：Play/Pause/Reset/Clear ボタン
    │   └── SaveMenu.ts    # セーブ・ロードメニュー
    └── types/
        ├── PartTypes.ts   # PartType 列挙体、PartData インターフェース
        └── GameState.ts   # GameState インターフェース（セーブデータ形式）
```

---

## コアコンポーネント API 設計

### `BasePart`（抽象クラス）

```typescript
abstract class BasePart {
  abstract readonly type: PartType

  // Phaser の GameObjects（描画）と Matter.js Body（物理）を保持
  abstract gameObject: Phaser.GameObjects.GameObject
  abstract body: MatterJS.BodyType

  // シーンにパーツを生成する
  abstract create(scene: GameScene, x: number, y: number, options: PartOptions): void

  // パーツを物理世界とシーンから削除する
  destroy(): void

  // シーン上のビジュアル位置を物理ボディに同期する
  syncTransform(): void

  // セーブ用にシリアライズ
  serialize(): PartData

  // ロード用：PartData から BasePart を復元（static factory）
  static deserialize(scene: GameScene, data: PartData): BasePart
}
```

### `EditManager`

```typescript
class EditManager {
  // 配置するパーツ種類を選択（ツールバーから呼ばれる）
  selectPartType(type: PartType | null): void

  // 指定座標にパーツを配置し、Undoスタックに積む
  placePart(x: number, y: number): BasePart | null

  // クリック・タップでパーツを選択状態にする
  selectPart(part: BasePart): void

  // 現在の選択を解除する
  deselectPart(): void

  // 選択中のパーツを削除する
  deleteSelectedPart(): void

  // パーツを指定座標に移動する（ドラッグ中に呼ばれる）
  movePart(part: BasePart, x: number, y: number): void

  // パーツを指定角度だけ回転する（スナップあり：15度単位）
  rotatePart(part: BasePart, angleDelta: number): void

  // 配置済み全パーツのリストを返す
  getAllParts(): BasePart[]

  // 全パーツを削除する
  clearAll(): void

  // Undo / Redo
  undo(): void
  redo(): void
}
```

### `SimulationManager`

```typescript
class SimulationManager {
  // シミュレーション開始（物理演算 ON、静的ボディを動的に切り替え）
  start(): void

  // 一時停止（物理演算を止める）
  pause(): void

  // リセット（配置を保持したまま全パーツを初期位置・姿勢に戻す）
  reset(): void

  // 完全クリア（パーツも全部削除）
  fullReset(): void

  // 現在のモードを返す
  getMode(): 'edit' | 'playing' | 'paused'
}
```

### `SaveLoadManager`

```typescript
class SaveLoadManager {
  // LocalStorage に名前付きで保存する
  save(slotName: string): void

  // LocalStorage から読み込み、GameState を返す（存在しなければ null）
  load(slotName: string): GameState | null

  // 保存済みスロット名の一覧を返す
  listSlots(): string[]

  // 指定スロットを削除する
  deleteSlot(slotName: string): void

  // GameState を JSON ファイルとしてダウンロードさせる
  exportJSON(): void

  // JSON 文字列を受け取り GameState を返す（バリデーション含む）
  importJSON(json: string): GameState | null
}
```

---

## 型定義

```typescript
// types/PartTypes.ts
export type PartType = 'ball' | 'ramp' | 'platform' | 'domino' | 'seesaw'

export interface PartOptions {
  width?: number
  height?: number
  radius?: number
  angle?: number      // 初期角度（ラジアン）
  isStatic?: boolean
  [key: string]: unknown
}

export interface PartData {
  id: string          // UUID（各パーツのユニーク識別子）
  type: PartType
  x: number
  y: number
  angle: number       // ラジアン
  options: PartOptions
}

// types/GameState.ts
export interface GameState {
  version: '1.0'      // セーブデータのバージョン（互換性管理）
  parts: PartData[]
  camera: {
    x: number
    y: number
    zoom: number
  }
  savedAt: string     // ISO 8601 日時文字列
}

export interface SaveSlot {
  name: string
  savedAt: string
  partCount: number
}
```

---

## UI レイアウト

```
┌──────────────────────────────────────────────────────┐
│  [▶ Play]  [⏸ Pause]  [↩ Reset]  [🗑 Clear]  [💾 Save/Load] │  ← ControlBar
├────────┬─────────────────────────────────────────────┤
│ 🔵 Ball │                                             │
│ ╱ Ramp  │                                             │
│ ─ Plate │         ゲームキャンバス                    │
│ | Domino│       （物理シミュレーション）              │
│ ⚖ Seesaw│                                             │
│        │                                             │
│ ──────  │                                             │
│ 🗑 Del   │                                             │
│ ↺ Rotate│                                             │
└────────┴─────────────────────────────────────────────┘
  ↑ Toolbar（左パネル）
```

- **Toolbar**：パーツを選択するボタン群（選択中はハイライト）
- **ControlBar**：上部固定バー、Play/Pause/Reset/Clear/Save
- **キャンバス**：Phaser が描画するゲームエリア（スクロール・ズーム可能）
- **コンテキストメニュー**（パーツ右クリック/長押し）：削除・回転・複製

### iPad タッチ操作

| 操作 | アクション |
|------|----------|
| タップ | パーツ選択／配置 |
| ドラッグ | パーツ移動 / カメラパン（パーツ未選択時） |
| ピンチ | カメラズーム |
| 2 本指回転 | 選択パーツの回転 |
| 長押し | コンテキストメニュー |

---

## 実装フェーズ

### Phase 1: 基盤構築
- [ ] Vite + TypeScript + Phaser 3 プロジェクトセットアップ
- [ ] `GameScene` 実装（Matter.js 物理演算、床・壁の静的ボディ）
- [ ] ボールを手動配置して物理挙動を確認
- [ ] カメラパン・ズームの実装

### Phase 2: パーツシステム
- [ ] `BasePart` 抽象クラス実装
- [ ] `Ball`、`Ramp`、`Platform` の実装
- [ ] `Domino`、`Seesaw` の実装（Constraint 活用）
- [ ] `EditManager` の実装（配置・削除・移動・回転）

### Phase 3: UI
- [ ] `Toolbar` コンポーネント（パーツ選択パネル）
- [ ] `ControlBar` コンポーネント（Play/Pause/Reset）
- [ ] iPad タッチ操作対応
- [ ] パーツ選択時のハイライト表示・ガイドライン

### Phase 4: セーブ・ロード
- [ ] `GameState` シリアライズ・デシリアライズ
- [ ] `SaveLoadManager` の実装（LocalStorage）
- [ ] `SaveMenu` UI（保存スロット一覧、JSON エクスポート）

### Phase 5: ビジュアル改善
- [ ] パーツのテクスチャ・スプライト適用
- [ ] 影・ハイライト効果で立体感を演出
- [ ] 背景レイヤー（奥行き感）
- [ ] BGM・効果音（任意）

---

## テスト方針

### 物理系（ブラウザ上での動作確認）

| テストケース | 期待結果 |
|------------|--------|
| ボールを斜面の上に置いて Play | 重力で斜面を滑り下りる |
| ドミノを一列に並べて隣に押す | 順番に倒れて連鎖する |
| シーソーの片側にボールを落とす | 反対側が跳ね上がる |
| パーツ同士が重なった状態で Play | 互いに衝突して弾ける |
| Reset ボタン | ボールが初期位置に戻り、ドミノが元の角度に戻る |

### UI・操作性テスト

| テストケース | 期待結果 |
|------------|--------|
| パーツをドラッグして移動 | 物理ボディとスプライトが連動して動く |
| 回転操作 | 15 度スナップで回転する |
| Save → ページリロード → Load | 同じレイアウトが復元される |
| iPad タッチでパーツ配置 | タップした座標にパーツが生成される |
| ピンチイン/アウト | カメラがズームする |

### ユニットテスト（Vitest）

| テスト対象 | 内容 |
|---------|------|
| `SaveLoadManager.serialize` | PartData 配列を GameState JSON に正しく変換できる |
| `SaveLoadManager.deserialize` | JSON → PartData 配列への逆変換が整合する |
| `GameState` バリデーション | `version` フィールドが不正な場合に null を返す |
| `PartData` バリデーション | 必須フィールド欠損時に適切なエラーを返す |
| `EditManager.undo/redo` | 操作履歴が正しくスタックされ、巻き戻しが機能する |

---

## 拡張性に関する考慮

- `BasePart` を継承するだけで新パーツを追加できる設計
- `PartType` の型を拡張すると TypeScript が未処理の分岐を検出してくれる
- `SaveLoadManager` の `version` フィールドでセーブデータの後方互換性を管理
- 将来 Three.js / Babylon.js に移行する場合、物理部分（Matter.js の Body）と描画部分（Phaser GameObjects）が分離されているため、描画層のみ差し替えが可能

---

## 参考ライブラリ・リソース

- [Phaser 3 公式ドキュメント](https://phaser.io/phaser3)
- [Matter.js 公式ドキュメント](https://brm.io/matter-js/)
- [Phaser 3 + Matter.js サンプル](https://phaser.io/examples/v3/category/physics/matterjs)
- Rube Goldberg ゲームの参考実例: "The Incredible Machine", "Contraption Maker", "World of Goo"
