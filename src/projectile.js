import { distance } from './utils.js';

export class Projectile {
  constructor(x, y, target, damage, visual = {}) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = visual.speed ?? 720;
    this.radius = visual.radius ?? 4;
    this.color = visual.color ?? '#ffef9a';
    this.glow = visual.glow ?? '#f0be47';
    this.alive = true;
    this.life = 2.2;
    this.prevX = x;
    this.prevY = y;
  }

  update(dt) {
    if (!this.alive) return null;
    this.prevX = this.x;
    this.prevY = this.y;
    this.life -= dt;
    if (this.life <= 0 || !this.target?.alive) {
      this.alive = false;
      return null;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = distance(this.x, this.y, this.target.x, this.target.y);
    const travel = this.speed * dt;

    if (dist <= travel + this.target.radius) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.alive = false;
      const killed = this.target.takeDamage(this.damage);
      return { hit: true, killed, target: this.target, damage: this.damage, x: this.x, y: this.y };
    }

    if (dist > 0) {
      this.x += dx / dist * travel;
      this.y += dy / dist * travel;
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = this.glow;
    ctx.globalAlpha = .42;
    ctx.lineWidth = Math.max(2, this.radius * 1.25);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.glow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
