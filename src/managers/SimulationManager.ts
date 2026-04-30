import Phaser from 'phaser'
import type { PhysicsScene } from '../parts/BasePart'
import type { EditManager } from './EditManager'
import { Ball } from '../parts/Ball'
import { Domino } from '../parts/Domino'
import { Seesaw } from '../parts/Seesaw'
import { Bell } from '../parts/Bell'
import type { SoundManager } from './SoundManager'

type Mode = 'edit' | 'playing' | 'paused'

// Minimal collision event shape from Matter.js
type CollisionEvent = {
  pairs: Array<{
    bodyA: MatterJS.BodyType
    bodyB: MatterJS.BodyType
    collision: { depth: number }
  }>
}

export class SimulationManager {
  private _mode: Mode = 'edit'
  private _goalCleared = false

  // Timing for star evaluation
  private _playStartTime = 0

  // Seesaw angular velocity tracking for creak sound
  private _seesawPrevAngVel = 0

  // Spring throttle: track bodies that recently bounced
  private _springBounced = new Set<MatterJS.BodyType>()

  constructor(
    private readonly _scene: PhysicsScene,
    private readonly _editManager: EditManager,
    private readonly _sound?: SoundManager,
  ) {}

  getMode(): Mode { return this._mode }

  start(): void {
    if (this._mode === 'playing') return
    if (this._mode === 'edit') {
      this._goalCleared = false
      this._springBounced.clear()
      for (const part of this._editManager.getAllParts()) {
        part.onStartSimulation(this._scene)
      }
      this._setupCollisionListener()
      this._playStartTime = Date.now()
      this._sound?.switchBGM('play')
    }
    this._scene.matter.world.resume()
    this._mode = 'playing'
    this._scene.game.events.emit('modeChange', this._mode)
  }

  pause(): void {
    if (this._mode !== 'playing') return
    this._scene.matter.world.pause()
    this._mode = 'paused'
    this._scene.game.events.emit('modeChange', this._mode)
  }

  reset(): void {
    this._scene.matter.world.pause()
    this._scene.matter.world.off('collisionstart')
    this._editManager.resetAll()
    this._goalCleared = false
    this._springBounced.clear()
    this._mode = 'edit'
    this._sound?.switchBGM('edit')
    this._scene.game.events.emit('modeChange', this._mode)
  }

  fullReset(): void {
    this._scene.matter.world.pause()
    this._scene.matter.world.off('collisionstart')
    this._editManager.clearAll()
    this._goalCleared = false
    this._springBounced.clear()
    this._mode = 'edit'
    this._sound?.switchBGM('edit')
    this._scene.game.events.emit('modeChange', this._mode)
  }

  checkGoals(): void {
    if (this._mode !== 'playing' || this._goalCleared) return

    const goals = this._editManager.getGoals()
    if (goals.length === 0) return

    const balls = this._editManager.getAllParts().filter(p => p instanceof Ball)
    for (const goal of goals) {
      for (const ball of balls) {
        const pos = ball.body.position
        if (goal.containsPoint(pos.x, pos.y)) {
          this._goalCleared = true
          goal.triggerFlagAnimation()
          this._sound?.playClear()
          const elapsedSec = (Date.now() - this._playStartTime) / 1000
          const partsPlaced = this._editManager.getTotalUserPlaced()
          this._scene.game.events.emit('goalCleared', { elapsedSec, partsPlaced })
          return
        }
      }
    }

    // Seesaw creak: monitor angular velocity changes
    this._checkSeesawCreak()
  }

  // ── Collision event listener ─────────────────────────────────────

  private _setupCollisionListener(): void {
    this._scene.matter.world.on('collisionstart', (event: CollisionEvent) => {
      for (const pair of event.pairs) {
        this._handleCollisionPair(pair.bodyA, pair.bodyB, pair.collision.depth)
      }
    })
  }

  private _handleCollisionPair(
    bodyA: MatterJS.BodyType,
    bodyB: MatterJS.BodyType,
    depth: number,
  ): void {
    const labelA = bodyA.label ?? ''
    const labelB = bodyB.label ?? ''

    // Determine which is ball and which is the other body
    const ballBody = labelA === 'ball' ? bodyA : (labelB === 'ball' ? bodyB : null)
    const otherBody = ballBody === bodyA ? bodyB : bodyA
    const otherLabel = otherBody?.label ?? ''

    if (ballBody) {
      const speed = Math.sqrt(ballBody.velocity.x ** 2 + ballBody.velocity.y ** 2)

      if (otherLabel === 'bell' || otherLabel === 'goal-wall') {
        if (otherLabel === 'bell') {
          const bell = this._editManager.getBells().find(b => b.body === otherBody)
          if (bell && !bell.hasRung) {
            bell.ring()
            this._sound?.playBell()
          }
        } else {
          this._sound?.playBallHit(speed)
        }
      } else if (otherLabel === 'spring') {
        if (!this._springBounced.has(ballBody)) {
          this._springBounced.add(ballBody)
          const M = Phaser.Physics.Matter.Matter
          const bouncePow = Math.max(16, speed * 1.4)
          M.Body.setVelocity(ballBody, { x: ballBody.velocity.x * 0.4, y: -bouncePow })
          this._sound?.playSpringBoing()
          // Allow re-bounce after ball has left
          this._scene.time.delayedCall(400, () => this._springBounced.delete(ballBody))
        }
      } else if (otherLabel === 'domino') {
        // Play thud only if ball hits domino with enough speed
        if (depth > 0.5) {
          this._sound?.playDominoTip()
        }
        this._sound?.playBallHit(speed * 0.5)
      } else {
        // floor, wall, ramp, platform, seesaw
        this._sound?.playBallHit(speed)
      }
    } else {
      // Domino hitting another domino (chain reaction)
      if (labelA === 'domino' && labelB === 'domino' && depth > 0.3) {
        this._sound?.playDominoTip()
      }
    }
  }

  private _checkSeesawCreak(): void {
    const seesaws = this._editManager.getAllParts().filter(p => p instanceof Seesaw)
    for (const s of seesaws) {
      const av = Math.abs(s.body.angularVelocity ?? 0)
      if (av > 0.04 && Math.abs(av - this._seesawPrevAngVel) > 0.015) {
        this._sound?.playSeesawCreak()
        break
      }
      this._seesawPrevAngVel = av
    }
  }
}
