# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run test       # run tests once (Vitest, no browser needed)
npm run test:watch # tests in watch mode
```

Single test file: `npx vitest run src/tests/EditManager.test.ts`

## Architecture

**Pitagora** is a browser-based Rube Goldberg (ピタゴラスイッチ) physics puzzle built with Phaser 3 + Matter.js, TypeScript, and Vite.

### Hybrid UI model

The game combines a Phaser canvas (physics world) with DOM elements for all overlay UI. The split:
- **Phaser canvas** (`#game-canvas`): physics simulation, part graphics, ghost preview, rotation handle
- **DOM**: toolbar buttons, control bar (play/pause/reset), save/load menu, level select modal, clear overlay, context menu

`src/main.ts` bootstraps everything: creates the Phaser game, instantiates DOM UI classes, and wires them to `GameScene` once it emits `gameSceneReady`.

### GameScene is the hub

`GameScene` owns all five managers and exposes them via getters. Input handling (click, drag, pan, pinch, keyboard) lives entirely in `GameScene._setupInput()`. The scene update loop calls `part.syncTransform()` on every part each frame.

### Managers

| Class | Responsibility |
|---|---|
| `EditManager` | Part list, tool selection, placement, selection, undo/redo, level constraint tracking |
| `SimulationManager` | `edit`/`playing`/`paused` state machine; collision event → sound routing; spring impulse; goal detection |
| `LevelManager` | Level list, current level index, progress (stars) persisted to `localStorage` |
| `SaveLoadManager` | Serialize/deserialize all parts to/from JSON string |
| `SoundManager` | Web Audio API procedural sounds + BGM oscillator loops |

### Parts

All physics objects extend `BasePart` (`src/parts/`). Concrete types: `ball`, `ramp`, `platform`, `domino`, `seesaw`, `goal`, `spring`, `bell`.

Each part must implement:
- `create(scene, x, y, options)` — add Matter.js body + Phaser Graphics, store initial state
- `_redraw()` — repaint graphics (called on select/deselect)
- `_serializeOptions()` — return `PartOptions` for save/restore
- `onStartSimulation(scene)` — switch body to dynamic when simulation starts (Ball, Domino, Seesaw)
- `onReset()` — the base implementation restores position/angle/velocity from `_initX/Y/Angle`

**Important**: call `part.saveInitialState()` after any committed move/rotation so `onReset()` snaps back to the right position.

Matter.js body labels drive collision logic in `SimulationManager`: `'ball'`, `'domino'`, `'spring'`, `'bell'`, `'goal-wall'`.

### Event bus

Cross-component communication uses `scene.game.events` (Phaser global event emitter):

| Event | Payload | Meaning |
|---|---|---|
| `gameSceneReady` | `GameScene` | scene is ready; wire DOM UI |
| `modeChange` | `'edit' \| 'playing' \| 'paused'` | simulation mode changed |
| `partsUpdate` | — | part list changed (redraw constraint badges) |
| `constraintUpdate` | — | constraint counts changed |
| `selectionChange` | `BasePart \| null` | selection changed |
| `levelLoaded` | `LevelData` | level loaded; show indicator |
| `levelExited` | — | free-play mode |
| `goalCleared` | `{ elapsedSec, partsPlaced }` | ball entered goal |
| `progressUpdate` | — | star progress saved; re-render level grid |
| `undoRedoUpdate` | — | undo/redo stack changed; update button state |

### Level mode

Levels are defined in `src/levels/levelData.ts` as `LevelData[]`. Each level has `constraints: PartConstraints` (max per part type), `parParts` (threshold for 3-star rating), and `parts: PartData[]` for fixed pre-placed parts.

When a level loads, `EditManager.setLevelMode(true, constraints)` is called. Fixed parts (from the level definition) have `isFixed = true` and cannot be selected or deleted by the player. `EditManager.canPlace(type)` gates placement against remaining quota.

### Testing

Tests live in `src/tests/`. Phaser requires a browser DOM, so tests mock it with `vi.mock('phaser', ...)` and use a `makeScene()` stub. Tests run in Node via Vitest and should not import any module that calls Phaser without mocking it first.

### Global debug handles

`window.__pGame` and `window.__pScene` are set in `main.ts` for browser console debugging.
