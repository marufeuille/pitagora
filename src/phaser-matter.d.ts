// Augments Phaser.Physics.Matter.Matter to expose the bundled Matter.js static API
declare namespace Phaser.Physics.Matter {
  namespace Matter {
    class Body extends MatterJS.Body {}
    class Bounds extends MatterJS.Bounds {}
    class World extends MatterJS.World {}
    class Constraint extends MatterJS.Constraint {}
    class Composite extends MatterJS.Composite {}
    class Engine extends MatterJS.Engine {}
  }
}
