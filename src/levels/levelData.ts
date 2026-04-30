import type { LevelData } from '../types/LevelTypes'

export const LEVELS: LevelData[] = [
  // ── Level 1 ─────────────────────────────────────────────────────
  // ボールが固定ランプ(y=400)で右方向へ。プレイヤーが板(x≈700-750,y≈500)を置いて
  // ゴール(950,820)へ誘導。パーツなしでは届かない。
  {
    id: 'level_01',
    title: '転がれ！ボール',
    description: 'ランプを置いてボールをゴールへ導こう',
    difficulty: 1,
    parParts: 2,
    constraints: { ramp: 3, platform: 2 },
    parts: [
      { id: 'l1_ball',  type: 'ball', x: 400,  y: 80,  angle: 0,   options: {}, isFixed: true },
      { id: 'l1_ramp',  type: 'ramp', x: 460,  y: 400, angle: 0.5, options: {}, isFixed: true },
      { id: 'l1_goal',  type: 'goal', x: 950,  y: 820, angle: 0,   options: {}, isFixed: true },
    ],
  },

  // ── Level 2 ─────────────────────────────────────────────────────
  // テーブル幅600。ball2はx=1020(端まで30px)でfrictionStatic=0.02。
  // ドミノ1個をball2の直前(x≈920-960)に置くと、ball1がドミノを倒し
  // ドミノがball2を押してテーブルから落下→ゴールへ。
  {
    id: 'level_02',
    title: 'ドミノ連鎖',
    description: 'ドミノを置いてボール2をゴールへ落とそう！',
    difficulty: 2,
    parParts: 2,
    constraints: { domino: 5 },
    parts: [
      { id: 'l2_ball',  type: 'ball',     x: 400,  y: 80,  angle: 0,   options: {}, isFixed: true },
      { id: 'l2_ramp',  type: 'ramp',     x: 460,  y: 200, angle: 0.5, options: {}, isFixed: true },
      { id: 'l2_table', type: 'platform', x: 750,  y: 500, angle: 0,   options: { width: 600, height: 16 }, isFixed: true },
      { id: 'l2_ball2', type: 'ball',     x: 1020, y: 470, angle: 0,   options: { friction: 0.05, frictionStatic: 0.02 }, isFixed: true },
      { id: 'l2_goal',  type: 'goal',     x: 1100, y: 820, angle: 0,   options: {}, isFixed: true },
    ],
  },

  // ── Level 3 ─────────────────────────────────────────────────────
  // ボールがp1(700,500)に自然着地。p1→p2(1100,680)の間に橋板を1枚置くと
  // p2からゴール(1280,820)へ自然落下。パーツなしではp2に届かない。
  {
    id: 'level_03',
    title: '二段構え',
    description: '２つの台を経由してゴールを目指せ！',
    difficulty: 3,
    parParts: 4,
    constraints: { ramp: 4, platform: 2, domino: 2 },
    parts: [
      { id: 'l3_ball',  type: 'ball',     x: 400,  y: 80,  angle: 0,   options: {}, isFixed: true },
      { id: 'l3_ramp',  type: 'ramp',     x: 460,  y: 200, angle: 0.5, options: {}, isFixed: true },
      { id: 'l3_p1',    type: 'platform', x: 700,  y: 500, angle: 0,   options: { width: 200, height: 16 }, isFixed: true },
      { id: 'l3_p2',    type: 'platform', x: 1100, y: 680, angle: 0,   options: { width: 150, height: 16 }, isFixed: true },
      { id: 'l3_goal',  type: 'goal',     x: 1280, y: 820, angle: 0,   options: {}, isFixed: true },
    ],
  },

  // ── Level 4 ─────────────────────────────────────────────────────
  // p1(700,500)に自然着地→橋板1枚でシーソー(1050,680)へ→
  // シーソー右端からゴール(1220,820)へ自然落下。橋板x=870-960が有効範囲。
  {
    id: 'level_04',
    title: 'シーソーで飛ばせ！',
    description: 'シーソーに乗ってバランスを崩して先へ進もう',
    difficulty: 4,
    parParts: 4,
    constraints: { ramp: 3, platform: 2, domino: 2, seesaw: 1 },
    parts: [
      { id: 'l4_ball',   type: 'ball',     x: 400,  y: 80,  angle: 0,   options: {}, isFixed: true },
      { id: 'l4_ramp',   type: 'ramp',     x: 460,  y: 200, angle: 0.5, options: {}, isFixed: true },
      { id: 'l4_p1',     type: 'platform', x: 700,  y: 500, angle: 0,   options: { width: 200, height: 16 }, isFixed: true },
      { id: 'l4_seesaw', type: 'seesaw',   x: 1050, y: 680, angle: 0,   options: {}, isFixed: true },
      { id: 'l4_goal',   type: 'goal',     x: 1220, y: 820, angle: 0,   options: {}, isFixed: true },
    ],
  },

  // ── Level 5 ─────────────────────────────────────────────────────
  // p1(700,500)自然着地→橋板1枚でスプリング(1100,650)へ→
  // スプリングがボールを上方ゴール(1120,500)へ弾き上げる。橋板x=900-960が有効範囲。
  {
    id: 'level_05',
    title: '究極の試練',
    description: 'バネでボールを跳ね上げてゴールへ！',
    difficulty: 5,
    parParts: 4,
    constraints: { ramp: 2, platform: 2, domino: 3, spring: 1, bell: 1 },
    parts: [
      { id: 'l5_ball',   type: 'ball',     x: 400,  y: 80,  angle: 0,   options: {}, isFixed: true },
      { id: 'l5_ramp',   type: 'ramp',     x: 460,  y: 200, angle: 0.5, options: {}, isFixed: true },
      { id: 'l5_p1',     type: 'platform', x: 700,  y: 500, angle: 0,   options: { width: 200, height: 16 }, isFixed: true },
      { id: 'l5_spring', type: 'spring',   x: 1100, y: 650, angle: 0,   options: {}, isFixed: true },
      { id: 'l5_goal',   type: 'goal',     x: 1120, y: 500, angle: 0,   options: {}, isFixed: true },
    ],
  },
]
