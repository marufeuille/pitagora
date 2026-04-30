# レベル解答集

各レベルの想定解答と物理シミュレーションで確認済みの有効範囲。  
テスト時は `sim.start()` + 手動 `M.Engine.update(engine, 16.67, 1)` で再現可能。

---

## Level 1 — 転がれ！ボール

**固定パーツ**
| ID | type | x | y | angle |
|----|------|---|---|-------|
| l1_ball | ball | 400 | 80 | 0 |
| l1_ramp | ramp | 460 | 400 | 0.5 |
| l1_goal | goal | 950 | 820 | 0 |

**最小解（1パーツ、3つ星）**

| type | x | y | angle | 幅 |
|------|---|---|-------|----|
| platform | 700〜750 | 490〜510 | 0 | 300 |

ボールはランプ(y=400)を転がって右方向へ飛び出す。  
板をゴール(x=950)手前に置くと、板上を転がりゴールへ落下する。

**不可能ケース**  
ユーザーパーツなし → ボールはx≈860付近の地面に落下（ゴール未到達）。

---

## Level 2 — ドミノ連鎖

**固定パーツ**
| ID | type | x | y | 備考 |
|----|------|---|---|------|
| l2_ball | ball | 400 | 80 | — |
| l2_ramp | ramp | 460 | 200 | angle=0.5 |
| l2_table | platform | 750 | 500 | w=600 |
| l2_ball2 | ball | 1020 | 470 | frictionStatic=0.02 |
| l2_goal | goal | 1100 | 820 | — |

**最小解（1パーツ、3つ星）**

| type | x | y | 備考 |
|------|---|---|------|
| domino | 920〜960 | テーブル上 | ball2 の直前 |

ball1 がドミノを倒す → ドミノが ball2 を押す → ball2 がテーブル右端(x=1050)から落下 →  
ゴール(x=1100, y=820)へ入る。

**有効ドミノ配置**  
x=920〜960（ball2 重心 x=1020 から 60〜100px 手前）。  
x=900 以下では ball1 到達時にドミノが倒れない。  
ドミノ2個以上のチェーンは ball1 のエネルギーが不足し失敗。

**不可能ケース**  
ユーザーパーツなし → ball2 は24px程度しか動かずテーブルから落ちない。

---

## Level 3 — 二段構え

**固定パーツ**
| ID | type | x | y | 備考 |
|----|------|---|---|------|
| l3_ball | ball | 400 | 80 | — |
| l3_ramp | ramp | 460 | 200 | angle=0.5 |
| l3_p1 | platform | 700 | 500 | w=200 |
| l3_p2 | platform | 1100 | 680 | w=150 |
| l3_goal | goal | 1280 | 820 | — |

**ボール軌道（ユーザーパーツなし）**

| step | x | y | 備考 |
|------|---|---|------|
| 80 | 714 | 457 | P1 着地 |
| 100 | 813 | 474 | P1 右端を出る (vx≈4.6) |
| 130 | 948 | 878 | 地面に落下 |

**最小解（1パーツ、3つ星）**

| type | x | y | w |
|------|---|---|---|
| platform（橋板） | 880〜940 | 570 | 200 |

橋板を P1 右端(x=800)〜P2 左端(x=1025)の間に置くと：  
P1 → 橋板 → P2 → ゴール(1280, 820)へ自然落下。

**有効橋板範囲（y=570 固定）**  
x=900, 920, 940〜960 が安定 OK（テスト済み）。  
x=880 はやや不安定、x=970以降は橋板に届かず失敗。

**不可能ケース**  
ユーザーパーツなし → ball は x≈1227, y=878 で停止（ゴール未到達）。

---

## Level 4 — シーソーで飛ばせ！

**固定パーツ**
| ID | type | x | y | 備考 |
|----|------|---|---|------|
| l4_ball | ball | 400 | 80 | — |
| l4_ramp | ramp | 460 | 200 | angle=0.5 |
| l4_p1 | platform | 700 | 500 | w=200 |
| l4_seesaw | seesaw | 1050 | 680 | w=240（デフォルト） |
| l4_goal | goal | 1220 | 820 | — |

**シーソー動作**  
シーソー(x=810〜1170)にボールが乗ると右寄りに着地(x≈1125、中心より75px右)。  
シーソーが右端を下げる方向に傾き、ボールは右端(x=1170)から落下 → ゴールへ。

**最小解（1パーツ、3つ星）**

| type | x | y | w |
|------|---|---|---|
| platform（橋板） | 870〜960 | 570 | 200 |

P1 右端からシーソー左端までの橋渡し。

**有効橋板範囲（y=570 固定）**  
x=870〜960 の 90px 幅で安定クリア（13点中10点が OK）。

**不可能ケース**  
ユーザーパーツなし → ball は x≈1227, y=878 で停止。

---

## Level 5 — 究極の試練

**固定パーツ**
| ID | type | x | y | 備考 |
|----|------|---|---|------|
| l5_ball | ball | 400 | 80 | — |
| l5_ramp | ramp | 460 | 200 | angle=0.5 |
| l5_p1 | platform | 700 | 500 | w=200 |
| l5_spring | spring | 1100 | 650 | 固定 |
| l5_goal | goal | 1120 | 500 | **空中ゴール**（y=500） |

**スプリング動作**  
SimulationManager の `collisionstart` で発火：  
```
bouncePow = max(16, speed × 1.4)
vy_after  = -bouncePow  （上方向）
vx_after  = vx_before × 0.4
```
ボールが橋板経由でスプリングに衝突 → 上方ゴール(y=500)へ弾き上げられる。

**最小解（1パーツ、3つ星）**

| type | x | y | w |
|------|---|---|---|
| platform（橋板） | 900〜960 | 570 | 200 |

P1 → 橋板 → スプリング → ゴール(1120, 500) に下から進入。

**有効橋板範囲（y=570 固定）**  
x=900〜960 の 60px 幅で安定クリア（テスト済み）。  
x=860〜880 はスプリングが強く弾きすぎてゴール通過失敗。

**不可能ケース**  
ユーザーパーツなし → ball は x≈1227, y=878 で停止（スプリング未到達）。

---

## テスト用スニペット

### 橋板1枚で解を検証する汎用コード

```javascript
const gs = window.__pGame.scene.getScene('GameScene');
const M = Phaser.Physics.Matter.Matter;
const em = gs.getEditManager();
const sim = gs.getSimManager();

// levelId: 'level_03'〜'level_05'
// bridgeX: 橋板の x 座標
function testBridge(levelId, bridgeX, goalX, goalY) {
  const lm = gs.getLevelManager();
  const level = lm.getLevels().find(l => l.id === levelId);
  const parts = [...level.parts,
    { id: 'test_bridge', type: 'platform', x: bridgeX, y: 570,
      angle: 0, options: { width: 200, height: 16 }, isFixed: false }
  ];
  gs.loadLevel({ ...level, parts });
  sim.start();
  gs.matter.world.pause();
  const ball = em.getAllParts().find(p => p.type === 'ball' && p._initX === 400);
  const engine = gs.matter.world.engine;
  for (let i = 0; i < 600; i++) {
    M.Engine.update(engine, 16.67, 1);
    const { x, y } = ball._body.position;
    if (Math.abs(x - goalX) < 70 && Math.abs(y - goalY) < 50) {
      gs.matter.world.resume();
      return 'CLEAR at step ' + i;
    }
  }
  gs.matter.world.resume();
  return 'FAIL';
}

// 例
testBridge('level_03', 920, 1280, 820);  // → 'CLEAR at step ...'
testBridge('level_04', 920, 1220, 820);  // → 'CLEAR at step ...'
testBridge('level_05', 930, 1120, 500);  // → 'CLEAR at step ...'
```

### Level 2 ドミノ検証

```javascript
function testDomino(dominoX) {
  const gs = window.__pGame.scene.getScene('GameScene');
  const M = Phaser.Physics.Matter.Matter;
  const em = gs.getEditManager();
  const lm = gs.getLevelManager();
  const level = lm.getLevels().find(l => l.id === 'level_02');
  const parts = [...level.parts,
    { id: 'test_domino', type: 'domino', x: dominoX, y: 484,
      angle: 0, options: {}, isFixed: false }
  ];
  gs.loadLevel({ ...level, parts });
  gs.getSimManager().start();
  gs.matter.world.pause();
  const ball2 = em.getAllParts().find(p => p.id === 'l2_ball2');
  const engine = gs.matter.world.engine;
  for (let i = 0; i < 400; i++) {
    M.Engine.update(engine, 16.67, 1);
    const { x, y } = ball2._body.position;
    if (Math.abs(x - 1100) < 70 && Math.abs(y - 820) < 50) {
      gs.matter.world.resume();
      return 'CLEAR at step ' + i;
    }
  }
  gs.matter.world.resume();
  return 'FAIL';
}

testDomino(930);  // → 'CLEAR at step ...'
```
