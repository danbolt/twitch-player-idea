
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
const PlayerStrikeStaminaCost = 0.35;
const PlayerBackstepSpeed = -600;
const PlayerBackstepDecayTime = 100;
const PlayerBackstepTime = 50;
const PlayerBackstepStaminaCost = 0.21;
const PlayerStaminaReplenishRate = 0.00025;

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
  this.data.stamina = 1.0;

  this.game.physics.enable(this, Phaser.Physics.ARCADE);
  this.anchor.set(0.5, 0.5);

  var generateStrikeStepCallback = (cost, newState, newSpeed, newTime, newDecayTime) => {
    return () => {
      if (this.data.state !== PlayerState.NORMAL) {
        return;
      }

      if (this.data.stamina < cost) {
        return;
      }

      if (this.data.burstTween !== null) {
        this.data.burstTween.stop();
        this.data.burstTween = null;
      }

      this.data.stamina -= cost;
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
  var strikeCallback = generateStrikeStepCallback(PlayerStrikeStaminaCost, PlayerState.STRIKE, PlayerStrikeSpeed, PlayerStrikeTime, PlayerStrikeDecayTime);
  var backstepCallback = generateStrikeStepCallback(PlayerBackstepStaminaCost, PlayerState.BACKSTEP, PlayerBackstepSpeed, PlayerBackstepTime, PlayerBackstepDecayTime);

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

  if (this.data.state === PlayerState.NORMAL) {
    this.tint = 0xFFFFFF;
  } else if (this.data.state === PlayerState.STRIKE) {
    this.tint = 0xFF0000;
  } else if (this.data.state === PlayerState.BACKSTEP) {
    this.tint = 0x0000FF;
  }

  this.data.stamina = Math.min((PlayerStaminaReplenishRate * this.game.time.elapsed) + this.data.stamina, 1.0);
};



const StaminaBarWidth = 96;
const StaminaBarHeight = 16;

var Gameplay = function () {
  this.player = null;
  this.ui = null;
  this.staminaBarBacking = null;
  this.staminaBar = null;
};
Gameplay.prototype.shutdown = function() {
  this.player = null;
  this.ui = null;
  this.staminaBarBacking = null;
  this.staminaBar = null;
};
Gameplay.prototype.create = function() {
  this.player = new Player(this.game, this.game.width * 0.5, this.game.height * 0.5);

  this.ui = this.game.add.group();
  this.ui.fixedToCamera = true;

  this.staminaBarBacking = this.game.add.sprite(32, 32, 'test_sheet', 17);
  this.staminaBarBacking.tint = 0x999999;
  this.staminaBarBacking.width = StaminaBarWidth;
  this.staminaBarBacking.height = StaminaBarHeight;
  this.ui.addChild(this.staminaBarBacking);
  this.staminaBar = this.game.add.sprite(34, 34, 'test_sheet', 17);
  this.staminaBar.tint = 0x00FF00;
  this.staminaBar.width = StaminaBarWidth - 4;
  this.staminaBar.height = StaminaBarHeight - 4;
  this.ui.addChild(this.staminaBar);
};
Gameplay.prototype.update = function() {
	this.staminaBar.width = (StaminaBarWidth - 4) * this.player.data.stamina;
};