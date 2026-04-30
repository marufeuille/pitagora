import type { GameScene } from '../scenes/GameScene'

export class ControlBar {
  private _btnPlay  = document.getElementById('btn-play')  as HTMLButtonElement
  private _btnPause = document.getElementById('btn-pause') as HTMLButtonElement
  private _btnReset = document.getElementById('btn-reset') as HTMLButtonElement
  private _btnClear = document.getElementById('btn-clear') as HTMLButtonElement
  private _badge    = document.getElementById('mode-badge') as HTMLElement

  connectToScene(scene: GameScene): void {
    this._btnPlay.addEventListener('click', () => scene.getSimManager().start())
    this._btnPause.addEventListener('click', () => scene.getSimManager().pause())
    this._btnReset.addEventListener('click', () => scene.getSimManager().reset())
    this._btnClear.addEventListener('click', () => {
      if (confirm('全パーツを削除しますか？')) scene.getSimManager().fullReset()
    })

    scene.game.events.on('modeChange', (mode: string) => this._updateMode(mode))
    this._updateMode('edit')
  }

  private _updateMode(mode: string): void {
    this._badge.textContent = mode.toUpperCase()
    this._badge.className = mode === 'edit' ? '' : mode
    this._badge.classList.add('mode-badge-base')

    this._btnPlay.style.display  = mode === 'playing' ? 'none' : 'flex'
    this._btnPause.style.display = mode === 'playing' ? 'flex' : 'none'
  }
}
