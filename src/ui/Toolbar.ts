import type { GameScene } from '../scenes/GameScene'
import type { PartType } from '../types/PartTypes'

type Tool = PartType | 'cursor'

export class Toolbar {
  private _scene: GameScene | null = null
  private _buttons: Map<string, HTMLButtonElement> = new Map()

  constructor() {
    document.querySelectorAll<HTMLButtonElement>('.tool-btn[data-tool]').forEach(btn => {
      const tool = btn.dataset.tool!
      this._buttons.set(tool, btn)
      btn.addEventListener('click', () => this._onToolClick(tool as Tool))
    })

    const rotateBtn = document.getElementById('btn-rotate-part') as HTMLButtonElement
    rotateBtn?.addEventListener('click', () => {
      const sel = this._scene?.getEditManager().getSelectedPart()
      if (sel) {
        this._scene!.getEditManager().rotatePart(sel, Math.PI / 12)
      }
    })

    const deleteBtn = document.getElementById('btn-delete-part') as HTMLButtonElement
    deleteBtn?.addEventListener('click', () => {
      this._scene?.getEditManager().deleteSelectedPart()
    })

    const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement
    undoBtn?.addEventListener('click', () => {
      this._scene?.getEditManager().undo()
    })

    const redoBtn = document.getElementById('btn-redo') as HTMLButtonElement
    redoBtn?.addEventListener('click', () => {
      this._scene?.getEditManager().redo()
    })
  }

  connectToScene(scene: GameScene): void {
    this._scene = scene
    this._setActive('cursor')

    scene.game.events.on('modeChange', (mode: string) => {
      const isEdit = mode === 'edit'
      this._buttons.forEach(btn => { btn.disabled = !isEdit })
      document.getElementById('btn-rotate-part')?.toggleAttribute('disabled', !isEdit)
      document.getElementById('btn-delete-part')?.toggleAttribute('disabled', !isEdit)
      if (!isEdit) {
        ;(document.getElementById('btn-undo') as HTMLButtonElement).disabled = true
        ;(document.getElementById('btn-redo') as HTMLButtonElement).disabled = true
      } else {
        this._syncUndoRedo()
      }
    })

    scene.game.events.on('undoRedoUpdate', () => this._syncUndoRedo())
    scene.game.events.on('partsUpdate', () => this._syncUndoRedo())
  }

  private _syncUndoRedo(): void {
    if (!this._scene) return
    if (this._scene.getSimManager().getMode() !== 'edit') return
    const edit = this._scene.getEditManager()
    ;(document.getElementById('btn-undo') as HTMLButtonElement).disabled = !edit.canUndo()
    ;(document.getElementById('btn-redo') as HTMLButtonElement).disabled = !edit.canRedo()
  }

  private _onToolClick(tool: Tool): void {
    if (!this._scene) return
    if (this._scene.getSimManager().getMode() !== 'edit') return
    this._scene.getEditManager().selectTool(tool)
    this._setActive(tool)
  }

  private _setActive(tool: string): void {
    this._buttons.forEach((btn, key) => btn.classList.toggle('active', key === tool))
  }
}
