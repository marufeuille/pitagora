import type { GameScene } from '../scenes/GameScene'
import type { SaveSlot } from '../types/GameState'

export class SaveMenu {
  private _scene: GameScene | null = null
  private _overlay = document.getElementById('save-modal-overlay') as HTMLElement
  private _slotList = document.getElementById('slot-list') as HTMLElement
  private _nameInput = document.getElementById('save-name-input') as HTMLInputElement

  constructor() {
    document.getElementById('btn-save')?.addEventListener('click', () => this._open())
    document.getElementById('btn-close-modal')?.addEventListener('click', () => this._close())
    document.getElementById('btn-do-save')?.addEventListener('click', () => this._doSave())
    document.getElementById('btn-export-json')?.addEventListener('click', () => this._doExport())
    this._overlay.addEventListener('click', e => { if (e.target === this._overlay) this._close() })

    const fileInput = document.getElementById('import-file-input') as HTMLInputElement
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const json = e.target?.result as string
        this._doImport(json)
      }
      reader.readAsText(file)
      fileInput.value = ''
    })
  }

  connectToScene(scene: GameScene): void {
    this._scene = scene
  }

  private _open(): void {
    this._renderSlots()
    this._overlay.classList.add('visible')
  }

  private _close(): void {
    this._overlay.classList.remove('visible')
  }

  private _doSave(): void {
    const name = this._nameInput.value.trim()
    if (!name || !this._scene) return
    const cam = this._scene.getCameraState()
    this._scene.getSaveManager().save(name, cam.x, cam.y, cam.zoom)
    this._renderSlots()
    this._nameInput.value = ''
  }

  private _doExport(): void {
    if (!this._scene) return
    const cam = this._scene.getCameraState()
    this._scene.getSaveManager().exportJSON(cam.x, cam.y, cam.zoom)
  }

  private _doImport(json: string): void {
    if (!this._scene) return
    const state = this._scene.getSaveManager().importJSON(json)
    if (!state) { alert('インポートに失敗しました（フォーマットが不正です）'); return }
    this._scene.getSimManager().fullReset()
    for (const data of state.parts) this._scene.getEditManager().restorePart(data)
    this._scene.restoreCameraState(state.camera.x, state.camera.y, state.camera.zoom)
    this._close()
  }

  private _loadSlot(slot: SaveSlot): void {
    if (!this._scene) return
    const state = this._scene.getSaveManager().load(slot.name)
    if (!state) { alert('読み込みに失敗しました'); return }
    this._scene.getSimManager().fullReset()
    for (const data of state.parts) this._scene.getEditManager().restorePart(data)
    this._scene.restoreCameraState(state.camera.x, state.camera.y, state.camera.zoom)
    this._close()
  }

  private _deleteSlot(name: string): void {
    if (!this._scene) return
    if (!confirm(`「${name}」を削除しますか？`)) return
    this._scene.getSaveManager().deleteSlot(name)
    this._renderSlots()
  }

  private _renderSlots(): void {
    if (!this._scene) return
    const slots = this._scene.getSaveManager().listSlots()
    this._slotList.innerHTML = ''

    if (slots.length === 0) {
      this._slotList.innerHTML = '<div style="color:#666;font-size:12px;text-align:center;padding:12px;">保存データがありません</div>'
      return
    }

    for (const slot of slots) {
      const item = document.createElement('div')
      item.className = 'slot-item'
      const date = new Date(slot.savedAt).toLocaleString('ja-JP', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
      item.innerHTML = `
        <div>
          <div class="slot-name">${slot.name}</div>
          <div class="slot-date">${date} · ${slot.partCount}パーツ</div>
        </div>
        <button class="btn-load">読込</button>
        <button class="btn-del">削除</button>
      `
      item.querySelector('.btn-load')?.addEventListener('click', () => this._loadSlot(slot))
      item.querySelector('.btn-del')?.addEventListener('click', () => this._deleteSlot(slot.name))
      this._slotList.appendChild(item)
    }
  }
}
