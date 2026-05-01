import { isAdultMode } from '../config'

export function applyLocale(): void {
  if (!isAdultMode()) return
  document.querySelectorAll<HTMLElement>('[data-en]').forEach(el => {
    el.textContent = el.dataset.en!
  })
}

export function getModeLabel(mode: string): string {
  if (isAdultMode()) return mode.toUpperCase()
  const map: Record<string, string> = {
    edit: 'へんしゅう',
    playing: 'さいせいちゅう',
    paused: 'ていし',
  }
  return map[mode] ?? mode.toUpperCase()
}
