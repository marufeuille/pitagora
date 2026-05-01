import { createGame } from './game'
import { Toolbar } from './ui/Toolbar'
import { ControlBar } from './ui/ControlBar'
import { SaveMenu } from './ui/SaveMenu'
import type { GameScene } from './scenes/GameScene'
import type { LevelData } from './types/LevelTypes'

// Context menu wiring
let _contextTarget: import('./parts/BasePart').BasePart | null = null

function setupContextMenu(scene: GameScene): void {
  const menu = document.getElementById('context-menu')!
  const edit = scene.getEditManager()

  document.getElementById('game-canvas')?.addEventListener('contextmenu', e => {
    e.preventDefault()
    const sel = edit.getSelectedPart()
    if (!sel) return
    _contextTarget = sel
    menu.style.left = `${e.clientX}px`
    menu.style.top  = `${e.clientY}px`
    menu.classList.add('visible')
  })

  document.addEventListener('click', () => menu.classList.remove('visible'))

  document.getElementById('ctx-rotate-cw')?.addEventListener('click', () => {
    if (_contextTarget) edit.rotatePart(_contextTarget, Math.PI / 12)
    menu.classList.remove('visible')
  })
  document.getElementById('ctx-rotate-ccw')?.addEventListener('click', () => {
    if (_contextTarget) edit.rotatePart(_contextTarget, -Math.PI / 12)
    menu.classList.remove('visible')
  })
  document.getElementById('ctx-delete')?.addEventListener('click', () => {
    if (_contextTarget && edit.getSelectedPart() === _contextTarget) {
      edit.deleteSelectedPart()
    }
    menu.classList.remove('visible')
  })
  document.getElementById('ctx-duplicate')?.addEventListener('click', () => {
    if (!_contextTarget) return
    const data = _contextTarget.serialize()
    edit.restorePart({ ...data, id: crypto.randomUUID(), x: data.x + 30, y: data.y + 30 })
    menu.classList.remove('visible')
  })
}

// ── Level select modal ────────────────────────────────────────────

function setupLevelModal(scene: GameScene): void {
  const overlay = document.getElementById('level-modal-overlay')!
  const grid = document.getElementById('level-grid')!
  const levels = scene.getLevelManager().getLevels()

  function renderGrid(): void {
    grid.innerHTML = ''
    for (let i = 0; i < levels.length; i++) {
      const lvl = levels[i]
      const prog = scene.getLevelManager().getProgress(lvl.id)
      const card = document.createElement('div')
      card.className = 'level-card'

      const starsHtml = Array.from({ length: 3 }, (_, si) =>
        si < prog.stars ? '⭐' : '☆',
      ).join('')

      const diffHtml = Array.from({ length: lvl.difficulty }, () => '★').join('')
        + Array.from({ length: 5 - lvl.difficulty }, () => '☆').join('')

      card.innerHTML = `
        <div class="lc-title">Lv.${i + 1} ${lvl.title}</div>
        <div class="lc-diff">${diffHtml}</div>
        <div class="lc-desc">${lvl.description}</div>
        <div class="lc-stars">${starsHtml}</div>
      `
      card.addEventListener('click', () => {
        overlay.classList.remove('visible')
        scene.getLevelManager().setCurrentIndex(i)
        scene.loadLevel(lvl)
      })
      grid.appendChild(card)
    }
  }

  document.getElementById('btn-levels')?.addEventListener('click', () => {
    renderGrid()
    overlay.classList.add('visible')
  })

  document.getElementById('btn-close-level-modal')?.addEventListener('click', () => {
    overlay.classList.remove('visible')
  })

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('visible')
  })

  // Re-render when progress updates
  scene.game.events.on('progressUpdate', () => renderGrid())
}

// ── Level indicator in control bar ───────────────────────────────

function setupLevelIndicator(scene: GameScene): void {
  const indicator = document.getElementById('level-indicator')!

  scene.game.events.on('levelLoaded', (level: LevelData) => {
    const idx = scene.getLevelManager().getCurrentIndex()
    indicator.textContent = `Lv.${idx + 1} ${level.title}`
    indicator.classList.add('visible')
  })

  scene.game.events.on('levelExited', () => {
    indicator.classList.remove('visible')
  })
}

// ── Clear overlay with stars ──────────────────────────────────────

function setupClearOverlay(scene: GameScene): void {
  const clearOverlay = document.getElementById('clear-overlay')!
  const starsEl = document.getElementById('clear-stars-display')!
  const subEl = document.getElementById('clear-sub-text')!
  const nextBtn = document.getElementById('btn-next-level') as HTMLButtonElement

  scene.game.events.on('goalCleared', (data: { elapsedSec: number; partsPlaced: number }) => {
    const lvlMgr = scene.getLevelManager()
    const level = lvlMgr.getCurrentLevel()

    let stars = 1
    let subText = `ボールがゴールに入った！（${Math.round(data.elapsedSec)}秒）`

    if (level) {
      const partsPlaced = data.partsPlaced
      if (partsPlaced <= level.parParts) {
        stars = 3
      } else if (partsPlaced <= level.parParts + 2) {
        stars = 2
      } else {
        stars = 1
      }
      subText = `クリアタイム: ${Math.round(data.elapsedSec)}秒　使用パーツ: ${partsPlaced}個`
      lvlMgr.saveProgress(level.id, stars, partsPlaced)
      scene.game.events.emit('progressUpdate')

      nextBtn.style.display = lvlMgr.hasNextLevel() ? 'inline-block' : 'none'
    } else {
      nextBtn.style.display = 'none'
    }

    const starStr = Array.from({ length: 3 }, (_, i) => i < stars ? '⭐' : '☆').join('')
    starsEl.textContent = starStr
    subEl.textContent = subText
    clearOverlay.classList.add('visible')
  })

  document.getElementById('btn-clear-reset')?.addEventListener('click', () => {
    clearOverlay.classList.remove('visible')
    scene.getSimManager().reset()
  })

  nextBtn.addEventListener('click', () => {
    clearOverlay.classList.remove('visible')
    const lvlMgr = scene.getLevelManager()
    if (!lvlMgr.hasNextLevel()) return
    const nextIdx = lvlMgr.getNextIndex()
    lvlMgr.setCurrentIndex(nextIdx)
    const nextLevel = lvlMgr.getLevels()[nextIdx]
    scene.loadLevel(nextLevel)
  })
}

// ── Gravity control (free play only) ─────────────────────────────

function setupGravityControl(scene: GameScene): void {
  const control = document.getElementById('gravity-control')!
  const slider  = document.getElementById('gravity-slider') as HTMLInputElement
  const label   = document.getElementById('gravity-label')!

  function formatMult(v: number): string {
    return `×${parseFloat(v.toFixed(2))}`
  }

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value)
    scene.getSimManager().setGravityMultiplier(v)
    label.textContent = formatMult(v)
  })

  scene.game.events.on('levelLoaded', () => {
    control.classList.add('hidden')
    scene.getSimManager().resetGravity()
    slider.value = '1'
    label.textContent = '×1'
  })

  scene.game.events.on('levelExited', () => {
    control.classList.remove('hidden')
  })
}

// ── SE toggle ─────────────────────────────────────────────────────

function setupSE(scene: GameScene): void {
  const btn = document.getElementById('btn-se')!
  let seOn = true
  btn.classList.add('on')

  btn.addEventListener('click', () => {
    seOn = !seOn
    btn.classList.toggle('on', seOn)
    scene.getSoundManager().setSEMuted(!seOn)
  })
}

// ── BGM toggle ────────────────────────────────────────────────────

function setupBGM(scene: GameScene): void {
  const btn = document.getElementById('btn-bgm')!
  let bgmOn = false

  btn.addEventListener('click', () => {
    bgmOn = !bgmOn
    btn.classList.toggle('on', bgmOn)
    const sound = scene.getSoundManager()
    if (bgmOn) {
      const mode = scene.getSimManager().getMode() === 'playing' ? 'play' : 'edit'
      sound.startBGM(mode)
    } else {
      sound.stopBGM()
    }
  })

  // Keep BGM mode in sync
  scene.game.events.on('modeChange', (mode: string) => {
    if (!bgmOn) return
    scene.getSoundManager().switchBGM(mode === 'playing' ? 'play' : 'edit')
  })
}

// ── Bootstrap ─────────────────────────────────────────────────────

const toolbar    = new Toolbar()
const controlBar = new ControlBar()
const saveMenu   = new SaveMenu()

const game = createGame()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).__pGame = game

game.events.once('gameSceneReady', (scene: GameScene) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__pScene = scene
  toolbar.connectToScene(scene)
  controlBar.connectToScene(scene)
  saveMenu.connectToScene(scene)
  setupContextMenu(scene)

  document.getElementById('btn-preset')?.addEventListener('click', () => {
    if (scene.getSimManager().getMode() !== 'edit') {
      scene.getSimManager().reset()
    }
    scene.exitLevelMode()
    scene.loadPreset()
  })

  setupLevelModal(scene)
  setupLevelIndicator(scene)
  setupClearOverlay(scene)
  setupBGM(scene)
  setupSE(scene)
  setupGravityControl(scene)
})
