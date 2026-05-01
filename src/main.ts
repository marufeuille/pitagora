import { createGame } from './game'
import { Toolbar } from './ui/Toolbar'
import { ControlBar } from './ui/ControlBar'
import { SaveMenu } from './ui/SaveMenu'
import { applyLocale } from './ui/locale'
import { CustomLevelManager } from './managers/CustomLevelManager'
import type { GameScene } from './scenes/GameScene'
import type { LevelData } from './types/LevelTypes'
import type { PartConstraints } from './types/LevelTypes'
import type { PartType } from './types/PartTypes'

applyLocale()

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

function setupLevelModal(scene: GameScene, customLevels: CustomLevelManager): void {
  const overlay = document.getElementById('level-modal-overlay')!
  const grid = document.getElementById('level-grid')!
  const customGrid = document.getElementById('custom-level-grid')!
  const customSection = document.getElementById('custom-levels-section')!
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

    // Custom levels
    const customs = customLevels.list()
    customSection.style.display = customs.length > 0 ? '' : 'none'
    customGrid.innerHTML = ''
    for (const lvl of customs) {
      const card = document.createElement('div')
      card.className = 'level-card custom'
      const diffHtml = Array.from({ length: lvl.difficulty }, () => '★').join('')
        + Array.from({ length: 5 - lvl.difficulty }, () => '☆').join('')
      card.innerHTML = `
        <div class="lc-title">${lvl.title}</div>
        <div class="lc-diff">${diffHtml}</div>
        <div class="lc-desc">${lvl.description}</div>
        <div class="lc-actions">
          <button class="lc-btn-export">↑ エクスポート</button>
          <button class="lc-btn-delete">🗑 けす</button>
        </div>
      `
      card.addEventListener('click', e => {
        if ((e.target as HTMLElement).closest('button')) return
        overlay.classList.remove('visible')
        scene.loadLevel(lvl)
      })
      card.querySelector('.lc-btn-export')!.addEventListener('click', e => {
        e.stopPropagation()
        customLevels.exportJSON(lvl)
      })
      card.querySelector('.lc-btn-delete')!.addEventListener('click', e => {
        e.stopPropagation()
        const btn = e.currentTarget as HTMLButtonElement
        if (btn.dataset.confirm !== '1') {
          btn.textContent = '本当に？'
          btn.dataset.confirm = '1'
          setTimeout(() => { btn.textContent = '🗑 けす'; btn.dataset.confirm = '' }, 2500)
          return
        }
        customLevels.delete(lvl.id)
        renderGrid()
      })
      customGrid.appendChild(card)
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

  // Import stage JSON
  document.getElementById('stage-import-file')?.addEventListener('change', e => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lvl = customLevels.importJSON(ev.target?.result as string)
      if (!lvl) { alert('JSONの読み込みに失敗しました'); return }
      lvl.id = `custom_${Date.now()}`
      customLevels.save(lvl)
      renderGrid()
    }
    reader.readAsText(file)
    ;(e.target as HTMLInputElement).value = ''
  })

  scene.game.events.on('progressUpdate', () => renderGrid())
  scene.game.events.on('customLevelsUpdate', () => renderGrid())
}

// ── Level indicator in control bar ───────────────────────────────

function setupLevelIndicator(scene: GameScene): void {
  const indicator = document.getElementById('level-indicator')!

  scene.game.events.on('levelLoaded', (level: LevelData) => {
    const idx = scene.getLevelManager().getCurrentIndex()
    indicator.textContent = idx >= 0 ? `Lv.${idx + 1} ${level.title}` : `🛠 ${level.title}`
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
  const slider = document.getElementById('gravity-slider') as HTMLInputElement
  const label  = document.getElementById('gravity-label')!

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value)
    scene.getSimManager().setGravityMultiplier(v)
    label.textContent = `×${parseFloat(v.toFixed(2))}`
  })

  scene.game.events.on('levelLoaded', () => {
    scene.getSimManager().resetGravity()
    slider.value = '1'
    label.textContent = '×1'
  })
}

// ── UI visibility per mode ────────────────────────────────────────

function setupUIVisibility(scene: GameScene): void {
  const freePlayOnly = ['btn-clear', 'btn-preset', 'btn-save', 'gravity-control', 'btn-stage-edit', 'btn-levels']
  const levelOnly    = ['btn-exit-level']

  function applyMode(isLevel: boolean): void {
    freePlayOnly.forEach(id => document.getElementById(id)?.classList.toggle('hidden', isLevel))
    levelOnly.forEach(id => document.getElementById(id)?.classList.toggle('hidden', !isLevel))
  }

  applyMode(false)

  scene.game.events.on('levelLoaded', () => applyMode(true))
  scene.game.events.on('levelExited', () => applyMode(false))

  document.getElementById('btn-exit-level')?.addEventListener('click', () => {
    if (scene.getSimManager().getMode() !== 'edit') scene.getSimManager().reset()
    scene.exitLevelMode()
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

  scene.game.events.on('modeChange', (mode: string) => {
    if (!bgmOn) return
    scene.getSoundManager().switchBGM(mode === 'playing' ? 'play' : 'edit')
  })
}

// ── Stage editor ──────────────────────────────────────────────────

function setupStageEditor(scene: GameScene, customLevels: CustomLevelManager): void {
  const btnStageEdit   = document.getElementById('btn-stage-edit')!
  const btnTestPlay    = document.getElementById('btn-test-play')!
  const btnSaveStage   = document.getElementById('btn-save-stage')!
  const btnExitTest    = document.getElementById('btn-exit-test')!
  const editorIndicator = document.getElementById('editor-indicator')!
  const stageSaveModal = document.getElementById('stage-save-modal-overlay')!

  let editorMode = false
  let testPlaySnapshot: ReturnType<typeof scene.captureEditorState> = []
  let testPlayConstraints: PartConstraints = {}

  // ── Editor mode toggle ──

  function enterEditorMode(): void {
    editorMode = true
    scene.setStageEditorMode(true)
    btnStageEdit.classList.add('active')
    btnTestPlay.classList.remove('hidden')
    btnSaveStage.classList.remove('hidden')
    editorIndicator.classList.add('visible')
  }

  function exitEditorMode(): void {
    editorMode = false
    scene.setStageEditorMode(false)
    btnStageEdit.classList.remove('active')
    btnTestPlay.classList.add('hidden')
    btnSaveStage.classList.add('hidden')
    editorIndicator.classList.remove('visible')
  }

  btnStageEdit.addEventListener('click', () => {
    if (editorMode) {
      exitEditorMode()
    } else {
      enterEditorMode()
    }
  })

  // Exit editor mode when a regular level is loaded
  scene.game.events.on('levelLoaded', () => {
    if (editorMode && testPlaySnapshot.length === 0) exitEditorMode()
  })

  // ── Test play ──

  btnTestPlay.addEventListener('click', () => {
    if (scene.getEditManager().getGoals().length === 0) {
      showToast('ゴールを置いてください！')
      return
    }

    if (scene.getSimManager().getMode() !== 'edit') scene.getSimManager().reset()

    testPlaySnapshot = scene.captureEditorState()
    // All editor parts become fixed obstacles in the level
    const fixedParts = testPlaySnapshot.map(p => ({ ...p, isFixed: true }))

    testPlayConstraints = readConstraintsFromForm()

    const testLevel: LevelData = {
      id: `test_${Date.now()}`,
      title: 'テストプレイ',
      description: '',
      difficulty: 1,
      parParts: 999,
      constraints: testPlayConstraints,
      parts: fixedParts,
    }

    scene.loadLevel(testLevel)

    // Override the normal level UI: hide exit-level, show exit-test
    document.getElementById('btn-exit-level')?.classList.add('hidden')
    btnExitTest.classList.remove('hidden')
  })

  btnExitTest.addEventListener('click', () => {
    if (scene.getSimManager().getMode() !== 'edit') scene.getSimManager().reset()
    scene.restoreEditorState(testPlaySnapshot)
    testPlaySnapshot = []
    btnExitTest.classList.add('hidden')
    enterEditorMode()
  })

  // ── Stage save modal ──

  // Difficulty picker
  const diffPicker = document.getElementById('diff-picker')!
  let selectedDiff: 1 | 2 | 3 | 4 | 5 = 3
  diffPicker.querySelectorAll<HTMLButtonElement>('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDiff = parseInt(btn.dataset.diff ?? '3') as 1 | 2 | 3 | 4 | 5
      diffPicker.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
    })
  })

  btnSaveStage.addEventListener('click', () => {
    stageSaveModal.classList.add('visible')
  })

  document.getElementById('btn-cancel-save-stage')?.addEventListener('click', () => {
    stageSaveModal.classList.remove('visible')
  })

  stageSaveModal.addEventListener('click', e => {
    if (e.target === stageSaveModal) stageSaveModal.classList.remove('visible')
  })

  document.getElementById('btn-do-save-stage')?.addEventListener('click', () => {
    const title = (document.getElementById('stage-title-input') as HTMLInputElement).value.trim()
    if (!title) { showToast('タイトルを入力してください'); return }

    const desc = (document.getElementById('stage-desc-input') as HTMLTextAreaElement).value.trim()
    const parParts = parseInt((document.getElementById('stage-par-input') as HTMLInputElement).value) || 5
    const constraints = readConstraintsFromForm()
    const allParts = scene.captureEditorState()
    // All editor parts become fixed obstacles in the saved level
    const fixedParts = allParts.map(p => ({ ...p, isFixed: true }))

    const level: LevelData = {
      id: `custom_${Date.now()}`,
      title,
      description: desc,
      difficulty: selectedDiff,
      parParts,
      constraints,
      parts: fixedParts,
    }

    customLevels.save(level)
    scene.game.events.emit('customLevelsUpdate')
    stageSaveModal.classList.remove('visible')
    showToast(`「${title}」を保存しました！`)
  })
}

function showToast(msg: string): void {
  const el = document.getElementById('toast')!
  el.textContent = msg
  el.classList.add('visible')
  setTimeout(() => el.classList.remove('visible'), 2200)
}

function readConstraintsFromForm(): PartConstraints {
  const types: PartType[] = ['ball', 'ramp', 'platform', 'domino', 'seesaw', 'spring', 'bell', 'goal']
  const constraints: PartConstraints = {}
  for (const t of types) {
    const el = document.getElementById(`c-${t}`) as HTMLInputElement | null
    if (!el || el.value === '') continue
    constraints[t] = parseInt(el.value)
  }
  return constraints
}

// ── Bootstrap ─────────────────────────────────────────────────────

const toolbar    = new Toolbar()
const controlBar = new ControlBar()
const saveMenu   = new SaveMenu()
const customLevels = new CustomLevelManager()

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
    if (scene.getSimManager().getMode() !== 'edit') scene.getSimManager().reset()
    scene.loadPreset()
  })

  setupLevelModal(scene, customLevels)
  setupLevelIndicator(scene)
  setupClearOverlay(scene)
  setupBGM(scene)
  setupSE(scene)
  setupGravityControl(scene)
  setupUIVisibility(scene)
  setupStageEditor(scene, customLevels)
})
