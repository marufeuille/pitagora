import type { GameScene } from '../scenes/GameScene'
import { getModeLabel } from './locale'

export class ControlBar {
  private _btnPlay    = document.getElementById('btn-play')  as HTMLButtonElement
  private _btnPause   = document.getElementById('btn-pause') as HTMLButtonElement
  private _btnReset   = document.getElementById('btn-reset') as HTMLButtonElement
  private _btnClear   = document.getElementById('btn-clear') as HTMLButtonElement
  private _badge      = document.getElementById('mode-badge') as HTMLElement
  private _inLevelMode = false

  connectToScene(scene: GameScene): void {
    scene.game.events.on('levelLoaded', () => { this._inLevelMode = true })
    scene.game.events.on('levelExited', () => { this._inLevelMode = false })

    this._btnPlay.addEventListener('click', () => {
      // Goal check only in free play — in level/test-play mode goals are fixed and can't be added
      if (!this._inLevelMode && scene.getEditManager().getGoals().length === 0) {
        this._showToast('ゴールを置いてください！')
        return
      }
      scene.getSimManager().start()
    })

    this._btnPause.addEventListener('click', () => scene.getSimManager().pause())
    this._btnReset.addEventListener('click', () => scene.getSimManager().reset())

    const deleteOverlay = document.getElementById('delete-confirm-overlay')!
    this._btnClear.addEventListener('click', () => deleteOverlay.classList.add('visible'))
    document.getElementById('btn-delete-cancel')!.addEventListener('click', () => deleteOverlay.classList.remove('visible'))
    document.getElementById('btn-delete-confirm')!.addEventListener('click', () => {
      deleteOverlay.classList.remove('visible')
      scene.getSimManager().fullReset()
    })
    deleteOverlay.addEventListener('click', (e) => {
      if (e.target === deleteOverlay) deleteOverlay.classList.remove('visible')
    })

    scene.game.events.on('modeChange', (mode: string) => this._updateMode(mode))
    this._updateMode('edit')
  }

  private _showToast(msg: string): void {
    const el = document.getElementById('toast')
    if (!el) return
    el.textContent = msg
    el.classList.add('visible')
    setTimeout(() => el.classList.remove('visible'), 2200)
  }

  private _updateMode(mode: string): void {
    this._badge.textContent = getModeLabel(mode)
    this._badge.className = mode
    // Show badge only during simulation, not during editing
    this._badge.style.display = mode === 'edit' ? 'none' : ''

    this._btnPlay.style.display  = mode === 'playing' ? 'none' : 'flex'
    this._btnPause.style.display = mode === 'playing' ? 'flex' : 'none'
  }
}
