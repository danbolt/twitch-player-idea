
const PlayerMoveSpeed = 210.0;
const PlayerBurstSpeed = 270.0;
const PlayerBurstDecayTime = 230;

const Epsilon = 0.0001;

var Player = function(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'test_sheet', 17);
  this.game.add.existing(this);

  this.data.prevMoveDirection = new Phaser.Point(0, 0);
  this.data.moveDirection = new Phaser.Point(0, 0);
  this.data.moveSpeed = PlayerMoveSpeed;
  this.data.burstTween = null;

  this.game.physics.enable(this, Phaser.Physics.ARCADE);
  this.anchor.set(0.5, 0.5);
}
Player.prototype = Object.create(Phaser.Sprite.prototype);
Player.prototype.constructor = Player;
Player.prototype.updateDirectionFromInput = function() {
  this.data.prevMoveDirection.x = this.data.moveDirection.x;
  this.data.prevMoveDirection.y = this.data.moveDirection.y;

  // keyboard
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

  this.data.moveDirection.normalize();
};
Player.prototype.updateVelocityFromDirection = function() {
  const prevDirectionLengthSqr = this.data.prevMoveDirection.getMagnitudeSq();
  const currentDirectionLengthSqr = this.data.moveDirection.getMagnitudeSq();

  // Dash a bit when movement starts from a standstill
  if ((prevDirectionLengthSqr <= Epsilon) && (currentDirectionLengthSqr > prevDirectionLengthSqr) && (this.data.burstTween === null)) {
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
    this.rotation = Phaser.Math.linear(this.rotation, targetRotation, 0.4);
    this.rotation = Phaser.Math.wrapAngle(this.rotation, true);
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