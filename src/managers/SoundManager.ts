/** Procedural sound effects and BGM via Web Audio API (no audio files needed) */
export class SoundManager {
  private _ctx: AudioContext | null = null

  // BGM state
  private _bgmRunning = false
  private _bgmMode: 'edit' | 'play' = 'edit'
  private _bgmStep = 0
  private _bgmNextTime = 0
  private _bgmTimeout: ReturnType<typeof setTimeout> | null = null

  // Per-sound throttle timestamps
  private _lastHitTime = 0
  private _lastDominoTime = 0
  private _lastSeesawTime = 0

  private _getCtx(): AudioContext {
    if (!this._ctx) this._ctx = new AudioContext()
    return this._ctx
  }

  // ── Collision sounds ──────────────────────────────────────────

  /** Ball hitting floor, wall or static part */
  playBallHit(speed: number): void {
    if (speed < 1.5) return
    const ctx = this._getCtx()
    const now = ctx.currentTime
    if (now - this._lastHitTime < 0.1) return
    this._lastHitTime = now

    const vol = Math.min(0.35, speed * 0.045)
    const baseFreq = 500 + speed * 18
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08)
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    osc.start(now)
    osc.stop(now + 0.1)
  }

  /** Domino starting to fall – low wooden thud */
  playDominoTip(): void {
    const ctx = this._getCtx()
    const now = ctx.currentTime
    if (now - this._lastDominoTime < 0.07) return
    this._lastDominoTime = now

    const sr = ctx.sampleRate
    const len = Math.floor(sr * 0.11)
    const buf = ctx.createBuffer(1, len, sr)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28))
    }
    const src = ctx.createBufferSource()
    const flt = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    flt.type = 'lowpass'; flt.frequency.value = 380; flt.Q.value = 1.8
    src.buffer = buf
    src.connect(flt); flt.connect(gain); gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.28, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13)
    src.start(now)
  }

  /** Seesaw starting to tip – wooden creak */
  playSeesawCreak(): void {
    const ctx = this._getCtx()
    const now = ctx.currentTime
    if (now - this._lastSeesawTime < 0.32) return
    this._lastSeesawTime = now

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(190, now)
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.24)
    gain.gain.setValueAtTime(0.06, now)
    gain.gain.linearRampToValueAtTime(0.02, now + 0.18)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27)
    osc.start(now)
    osc.stop(now + 0.27)
  }

  /** Bell ringing – bright overtone chord */
  playBell(): void {
    const ctx = this._getCtx()
    const freqs = [1397, 1760, 2093]
    freqs.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.04
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, t)
      gain.gain.setValueAtTime(0.17, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
      osc.start(t)
      osc.stop(t + 1.0)
    })
  }

  /** Spring boing when bouncing a ball */
  playSpringBoing(): void {
    const ctx = this._getCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(260, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.05)
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22)
    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26)
    osc.start(now)
    osc.stop(now + 0.26)
  }

  /** Short click/tick sound */
  playTick(volume = 0.25): void {
    const ctx = this._getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.08)
  }

  /** Clear/goal jingle: ascending arpeggio */
  playClear(): void {
    const ctx = this._getCtx()
    const notes = [523, 659, 784, 1047, 1319]
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.1
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.start(t)
      osc.stop(t + 0.35)
    })
  }

  /** Ball rolling soft hum (short burst) */
  playRoll(): void {
    const ctx = this._getCtx()
    const bufLen = ctx.sampleRate * 0.06
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.15
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'; filter.frequency.value = 120; filter.Q.value = 2
    src.buffer = buf
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
    src.start()
  }

  // ── BGM ───────────────────────────────────────────────────────

  /** Start BGM in the given mode */
  startBGM(mode: 'edit' | 'play'): void {
    this._bgmMode = mode
    if (this._bgmRunning) return
    this._bgmRunning = true
    this._bgmStep = 0
    const ctx = this._getCtx()
    this._bgmNextTime = ctx.currentTime + 0.15
    this._scheduleBGM()
  }

  /** Stop BGM */
  stopBGM(): void {
    this._bgmRunning = false
    if (this._bgmTimeout !== null) {
      clearTimeout(this._bgmTimeout)
      this._bgmTimeout = null
    }
  }

  /** Switch BGM mode without interrupting */
  switchBGM(mode: 'edit' | 'play'): void {
    if (this._bgmMode === mode && this._bgmRunning) return
    this._bgmMode = mode
    if (!this._bgmRunning) this.startBGM(mode)
  }

  private _scheduleBGM(): void {
    if (!this._bgmRunning) return
    const ctx = this._getCtx()
    const now = ctx.currentTime
    const schedAhead = 0.28

    // Pentatonic scale (C D E G A) in two octaves
    const editSeq  = [523, 659, 784, 880, 523, 659, 784, 1047]  // slow ambient
    const playSeq  = [523, 784, 659, 1047, 880, 659, 784, 523]  // upbeat arpeggio

    const isPlay   = this._bgmMode === 'play'
    const beatDur  = isPlay ? 0.22 : 0.44
    const seq      = isPlay ? playSeq : editSeq
    const volBase  = isPlay ? 0.06 : 0.04

    while (this._bgmNextTime < now + schedAhead) {
      const step = this._bgmStep % seq.length
      // Edit mode: play every other step for a sparser texture
      if (isPlay || step % 2 === 0) {
        const freq = seq[step]
        const t = this._bgmNextTime
        const dur = isPlay ? 0.14 : 0.28

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(volBase, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
        osc.start(t)
        osc.stop(t + dur)
      }

      this._bgmNextTime += beatDur
      this._bgmStep++
    }

    const delay = Math.max(50, (this._bgmNextTime - now - schedAhead) * 1000)
    this._bgmTimeout = setTimeout(() => this._scheduleBGM(), delay)
  }
}
