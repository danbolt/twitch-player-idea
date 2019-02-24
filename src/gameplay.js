
// angleLerp taken from:
// https://gist.github.com/shaunlebron/8832585
function shortAngleDist(a0,a1) {
    var max = Math.PI*2;
    var da = (a1 - a0) % max;
    return 2*da % max - da;
};
function angleLerp(a0,a1,t) {
    return a0 + shortAngleDist(a0,a1)*t;
};

const PlayerMoveSpeed = 210.0;
const PlayerBurstSpeed = 270.0;
const PlayerBurstDecayTime = 230;
const PlayerStrikeSpeed = 800;
const PlayerStrikeDecayTime = 40;
const PlayerStrikeTime = 70;
const PlayerBackstepSpeed = -600;
const PlayerBackstepDecayTime = 100;
const PlayerBackstepTime = 50;

const Epsilon = 0.0001;

var PlayerState = {
  NORMAL: 0,
  STRIKE: 1,
  BACKSTEP: 2,
  DAMAGED: 3
};

var Player = function(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'test_sheet', 17);
  this.game.add.existing(this);

  this.data.prevMoveDirection = new Phaser.Point(0, 0);
  this.data.moveDirection = new Phaser.Point(0, 0);
  this.data.damagedDirection = new Phaser.Point(1, 0);
  this.data.moveSpeed = PlayerMoveSpeed;
  this.data.burstTween = null;
  this.data.movementTween = null;
  this.data.state = PlayerState.NORMAL;

  this.game.physics.enable(this, Phaser.Physics.ARCADE);
  this.anchor.set(0.5, 0.5);

  /*
  this.game.input.gamepad.pad1.onAxisCallback = (pad) => {
    this.data.moveDirection.x = pad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X);
    this.data.moveDirection.y = pad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y);
  };
  */

  var generateStrikeStepCallback = (newState, newSpeed, newTime, newDecayTime) => {
    return () => {
      if (this.data.state !== PlayerState.NORMAL) {
        return;
      }

      if (this.data.burstTween !== null) {
        this.data.burstTween.stop();
        this.data.burstTween = null;
      }

      this.data.state = newState;
      this.data.moveSpeed = newSpeed;
      this.data.movementTween = this.game.add.tween(this.data);
      this.data.movementTween.to({ moveSpeed: PlayerMoveSpeed }, newDecayTime, Phaser.Easing.Cubic.In, false, newTime);
      this.data.movementTween.onComplete.add(() => {
        this.data.state = PlayerState.NORMAL;
        this.data.movementTween = null;
      });
      this.data.movementTween.start();

      this.data.prevMoveDirection.x = this.data.moveDirection.x;
      this.data.prevMoveDirection.y = this.data.moveDirection.y;
      this.data.moveDirection.x = Math.cos(this.rotation);
      this.data.moveDirection.y = Math.sin(this.rotation);
    };
  };
  var strikeCallback = generateStrikeStepCallback(PlayerState.STRIKE, PlayerStrikeSpeed, PlayerStrikeTime, PlayerStrikeDecayTime);
  var backstepCallback = generateStrikeStepCallback(PlayerState.BACKSTEP, PlayerBackstepSpeed, PlayerBackstepTime, PlayerBackstepDecayTime);

  this.game.input.keyboard.addKey(Phaser.KeyCode.X).onDown.add(strikeCallback);
  this.game.input.keyboard.addKey(Phaser.KeyCode.C).onDown.add(backstepCallback);
}
Player.prototype = Object.create(Phaser.Sprite.prototype);
Player.prototype.constructor = Player;
Player.prototype.updateDirectionFromInput = function() {
  this.data.prevMoveDirection.x = this.data.moveDirection.x;
  this.data.prevMoveDirection.y = this.data.moveDirection.y;

  // keyboard
  if (this.data.state === PlayerState.NORMAL) {
    if (this.game.input.keyboard.isDown(Phaser.KeyCode.RIGHT)) {
      this.data.moveDirection.x = 1.0;
    } else if (this.game.input.keyboard.isDown(Phaser.KeyCode.LEFT)) {
      this.data.moveDirection.x = -1.0;
    } else {
      this.data.moveDirection.x = 0.0;
    }
    if (this.game.input.keyboard.isDown(Phaser.KeyCode.DOWN)) {
      this.data.moveDirection.y = 1.0;
    } else if (this.game.input.keyboard.isDown(Phaser.KeyCode.UP)) {
      this.data.moveDirection.y = -1.0;
    } else {
      this.data.moveDirection.y = 0.0;
    }
  }

  this.data.moveDirection.normalize();
};
Player.prototype.updateVelocityFromDirection = function() {
  const prevDirectionLengthSqr = this.data.prevMoveDirection.getMagnitudeSq();
  const currentDirectionLengthSqr = this.data.moveDirection.getMagnitudeSq();

  // Dash a bit when movement starts from a standstill
  if ((prevDirectionLengthSqr <= Epsilon) && (currentDirectionLengthSqr > prevDirectionLengthSqr) && (this.data.burstTween === null) && (this.data.state === PlayerState.NORMAL)) {
    this.data.moveSpeed = PlayerBurstSpeed;
    this.data.burstTween = this.game.add.tween(this.data);
    this.data.burstTween.to( { moveSpeed: PlayerMoveSpeed }, PlayerBurstDecayTime, Phaser.Easing.Cubic.Out);
    this.data.burstTween.onComplete.add(function () {
      this.data.burstTween = null;
    }, this);
    this.data.burstTween.start();
  }

  if (currentDirectionLengthSqr > Epsilon) {
    const targetRotation = Math.atan2(this.data.moveDirection.y, this.data.moveDirection.x);
    this.rotation = angleLerp(this.rotation, targetRotation, 0.18);
  }

  this.body.velocity.x = this.data.moveSpeed * this.data.moveDirection.x;
  this.body.velocity.y = this.data.moveSpeed * this.data.moveDirection.y;
};
Player.prototype.update = function() {
  this.updateDirectionFromInput();
  this.updateVelocityFromDirection();

};

var Gameplay = function () {
  this.player = null;
};
Gameplay.prototype.shutdown = function() {
  this.player = null;
};
Gameplay.prototype.create = function() {
  this.player = new Player(this.game, 100, 100);
};
Gameplay.prototype.update = function() {
	//
};