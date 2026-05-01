export function isAdultMode(): boolean {
  return localStorage.getItem('pitagora_adult_mode') === 'true'
}
