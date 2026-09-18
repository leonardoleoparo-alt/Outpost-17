import { clamp } from './utils.js';

export const ENEMY_TYPES = Object.freeze({
  grunt: Object.freeze({
    name: 'Grunt', maxHp: 85, speed: 58, baseDamage: 10, reward: 14, radius: 19,
    isFlying: false, isInvisible: false
  }),
  runner: Object.freeze({
    name: 'Runner', maxHp: 52, speed: 98, baseDamage: 8, reward: 12, radius: 15,
    isFlying: false, isInvisible: false
  }),
  brute: Object.freeze({
    name: 'Brute', maxHp: 270, speed: 37, baseDamage: 24, reward: 40, radius: 27,
    isFlying: false, isInvisible: false
  }),
  glider: Object.freeze({
    name: 'Glider', maxHp: 96, speed: 74, baseDamage: 12, reward: 20, radius: 18,
    isFlying: true, isInvisible: false
  }),
  shade: Object.freeze({
    name: 'Shade', maxHp: 78, speed: 76, baseDamage: 14, reward: 24, radius: 18,
    isFlying: false, isInvisible: true
  }),
  phantom: Object.freeze({
    name: 'Phantom', maxHp: 118, speed: 80, baseDamage: 18, reward: 34, radius: 19,
    isFlying: true, isInvisible: true
  })
});

export class Enemy {
  constructor(type, route, offset = 0) {
    const definition = ENEMY_TYPES[type];
    if (!definition) throw new Error(`Unknown enemy type: ${type}`);
    this.type = type;
    this.route = route;
    this.distance = offset;
    this.maxHp = definition.maxHp;
    this.hp = definition.maxHp;
    this.speed = definition.speed;
    this.baseDamage = definition.baseDamage;
    this.reward = definition.reward;
    this.radius = definition.radius;
    this.isFlying = definition.isFlying;
    this.isInvisible = definition.isInvisible;
    this.isRevealed = false;
    this.alive = true;
    this.active = true;
    this.reachedEnd = false;
    this.hitFlash = 0;
    this.angle = 0;
    this.pathProgress = 0;
    this.bobPhase = (offset * .017 + type.length) % (Math.PI * 2);
    this.pathX = 0;
    this.pathY = 0;
    this.updatePosition();
  }

  update(dt) {
    if (!this.alive) return;
    this.distance += this.speed * dt;
    if (this.distance >= this.route.totalLength) {
      this.distance = this.route.totalLength;
      this.reachedEnd = true;
      this.alive = false;
      this.active = false;
    }
    this.bobPhase += dt * (this.type === 'shade' ? 4.2 : this.type === 'phantom' ? 4.8 : 3.4);
    this.updatePosition();
    this.hitFlash = Math.max(0, this.hitFlash - dt);
  }

  updatePosition() {
    const position = this.route.positionAt(this.distance);
    this.pathX = position.x;
    this.pathY = position.y;
    this.angle = position.angle;
    this.pathProgress = this.route.totalLength > 0 ? this.distance / this.route.totalLength : 0;
    if (this.isFlying) {
      const lateral = Math.sin(this.distance * .012) * 9;
      this.x = position.x - Math.sin(position.angle) * lateral;
      this.y = position.y + Math.cos(position.angle) * lateral - 28 - Math.sin(this.bobPhase) * 5;
    } else if (this.type === 'shade') {
      const drift = Math.sin(this.bobPhase) * 2.5;
      this.x = position.x - Math.sin(position.angle) * drift;
      this.y = position.y + Math.cos(position.angle) * drift;
    } else {
      this.x = position.x;
      this.y = position.y;
    }
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp = clamp(this.hp - amount, 0, this.maxHp);
    this.hitFlash = .1;
    if (this.hp <= 0) {
      this.alive = false;
      this.active = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.isFlying) this.drawFlyingShadow(ctx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.isInvisible) ctx.globalAlpha = this.isRevealed ? .78 : .5;

    if (this.type === 'runner') this.drawRunner(ctx);
    else if (this.type === 'brute') this.drawBrute(ctx);
    else if (this.type === 'glider') this.drawGlider(ctx);
    else if (this.type === 'shade') this.drawShade(ctx);
    else if (this.type === 'phantom') this.drawPhantom(ctx);
    else this.drawGrunt(ctx);

    ctx.restore();
    if (this.hp < this.maxHp) this.drawHealthBar(ctx);
    if (this.isInvisible && this.isRevealed) this.drawRevealMarker(ctx);
  }

  drawFlyingShadow(ctx) {
    ctx.save();
    ctx.globalAlpha = .2;
    ctx.fillStyle = '#264631';
    ctx.beginPath();
    ctx.ellipse(this.pathX, this.pathY + 7, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawGrunt(ctx) {
    ctx.globalAlpha *= .2;
    ctx.fillStyle = '#274b31';
    ctx.beginPath();
    ctx.ellipse(-2, 15, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = this.isInvisible ? (this.isRevealed ? .78 : .5) : 1;

    ctx.fillStyle = this.hitFlash > 0 ? '#fff0cf' : '#bf5b43';
    ctx.strokeStyle = '#77382f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e79b5d';
    ctx.beginPath();
    ctx.arc(13, -1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#77382f';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#2f3029';
    ctx.beginPath();
    ctx.arc(16, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#79392f';
    ctx.lineWidth = 4;
    for (const y of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.lineTo(-20, y + 6);
      ctx.stroke();
    }
  }

  drawRunner(ctx) {
    ctx.fillStyle = this.hitFlash > 0 ? '#fff4d4' : '#e08a47';
    ctx.strokeStyle = '#87512d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0ba63';
    ctx.beginPath();
    ctx.moveTo(11, -7);
    ctx.lineTo(24, 0);
    ctx.lineTo(11, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#73442b';
    ctx.lineWidth = 3;
    for (const y of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(-8, y);
      ctx.lineTo(-22, y + (y < 0 ? -4 : 4));
      ctx.stroke();
    }
  }

  drawBrute(ctx) {
    ctx.fillStyle = this.hitFlash > 0 ? '#fff0cf' : '#8c5b50';
    ctx.strokeStyle = '#543a34';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b87859';
    ctx.beginPath();
    ctx.arc(19, -1, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4a403a';
    ctx.fillRect(-17, -16, 13, 32);
    ctx.fillStyle = '#d9a45d';
    ctx.fillRect(-14, -13, 7, 26);
  }

  drawGlider(ctx) {
    ctx.rotate(-this.angle);
    ctx.fillStyle = this.hitFlash > 0 ? '#f5fbff' : '#6aa8bd';
    ctx.strokeStyle = '#3b6879';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(19, 4);
    ctx.lineTo(7, 13);
    ctx.lineTo(0, 7);
    ctx.lineTo(-7, 13);
    ctx.lineTo(-19, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d9eef4';
    ctx.beginPath();
    ctx.arc(0, 1, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5b65b';
    ctx.beginPath();
    ctx.arc(0, 1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#96d6e7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, 2);
    ctx.lineTo(-29, 7);
    ctx.moveTo(20, 2);
    ctx.lineTo(29, 7);
    ctx.stroke();
  }

  drawShade(ctx) {
    ctx.save();
    ctx.rotate(-this.angle);
    const pulse = .5 + Math.sin(this.bobPhase * 1.7) * .5;

    ctx.globalAlpha *= .24;
    ctx.fillStyle = '#2f5360';
    ctx.beginPath();
    ctx.ellipse(0, 14, 21, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = this.isRevealed ? .78 : .5;

    ctx.fillStyle = this.hitFlash > 0 ? '#eefbff' : '#6b86a7';
    ctx.strokeStyle = this.isRevealed ? '#d7f4e7' : '#b7cde1';
    ctx.lineWidth = this.isRevealed ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(-17, 9);
    ctx.quadraticCurveTo(-19, -12, -7, -18);
    ctx.quadraticCurveTo(0, -24, 7, -18);
    ctx.quadraticCurveTo(19, -12, 17, 9);
    ctx.quadraticCurveTo(8, 16, 0, 11);
    ctx.quadraticCurveTo(-8, 16, -17, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha *= .7;
    ctx.strokeStyle = '#b8e4ef';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -2, 22 + pulse * 3, .25, Math.PI * 1.6);
    ctx.stroke();

    ctx.globalAlpha = this.isRevealed ? .92 : .7;
    ctx.fillStyle = '#d9f4ff';
    ctx.beginPath();
    ctx.arc(-6, -6, 2.3, 0, Math.PI * 2);
    ctx.arc(6, -6, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }


  drawPhantom(ctx) {
    ctx.save();
    ctx.rotate(-this.angle);
    const pulse = .5 + Math.sin(this.bobPhase * 1.35) * .5;

    ctx.globalAlpha *= .24;
    ctx.strokeStyle = this.isRevealed ? '#dff4cf' : '#9ccde2';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 2, 30 + pulse * 4, 19 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = this.isRevealed ? .84 : .52;
    ctx.fillStyle = this.hitFlash > 0 ? '#f8feff' : '#6f8eaa';
    ctx.strokeStyle = this.isRevealed ? '#e3f6c7' : '#c4dded';
    ctx.lineWidth = this.isRevealed ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(15, -10, 27, 5);
    ctx.lineTo(12, 2);
    ctx.quadraticCurveTo(4, 15, 0, 18);
    ctx.quadraticCurveTo(-4, 15, -12, 2);
    ctx.lineTo(-27, 5);
    ctx.quadraticCurveTo(-15, -10, 0, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha *= .85;
    ctx.fillStyle = '#c8f3ff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#edfbd6';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha *= .6;
    ctx.strokeStyle = '#c9e8f4';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 25 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawRevealMarker(ctx) {
    ctx.save();
    const pulse = 1 + Math.sin(this.bobPhase * 2) * .08;
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = .62;
    ctx.strokeStyle = '#dff5a8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, (this.radius + 8) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(223,245,168,.88)';
    ctx.beginPath();
    ctx.arc(0, -this.radius - 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHealthBar(ctx) {
    const ratio = this.hp / this.maxHp;
    const width = this.type === 'brute' ? 54 : 42;
    const x = this.x - width / 2;
    const y = this.y - (this.isFlying ? 30 : this.radius + 15);
    ctx.save();
    ctx.globalAlpha = this.isInvisible && !this.isRevealed ? .62 : 1;
    ctx.fillStyle = 'rgba(40,55,44,.55)';
    ctx.fillRect(x, y, width, 5);
    ctx.fillStyle = ratio > .45 ? '#d8e76f' : '#e5765e';
    ctx.fillRect(x, y, width * ratio, 5);
    ctx.restore();
  }
}
