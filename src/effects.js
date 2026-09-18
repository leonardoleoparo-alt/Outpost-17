export class Effects {
  constructor() {
    this.particles = [];
    this.floatingText = [];
    this.reducedMotion = false;
    this.showDamageNumbers = true;
  }

  burst(x, y, color, count = 7) {
    const particleCount = this.reducedMotion ? Math.max(2, Math.ceil(count * .35)) : count;
    for (let i = 0; i < particleCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (this.reducedMotion ? 30 : 45) + Math.random() * (this.reducedMotion ? 55 : 100);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: (this.reducedMotion ? .18 : .28) + Math.random() * (this.reducedMotion ? .12 : .25),
        maxLife: this.reducedMotion ? .30 : .53,
        color,
        radius: 2 + Math.random() * 3
      });
    }
  }

  money(x, y, amount) {
    this.floatingText.push({ x, y, text: `+$${amount}`, life: .95, maxLife: .95, kind: 'money' });
  }

  damage(x, y, amount) {
    if (!this.showDamageNumbers) return;
    this.floatingText.push({
      x: x + (Math.random() - .5) * 8,
      y: y - 8,
      text: `-${Math.round(amount)}`,
      life: this.reducedMotion ? .48 : .7,
      maxLife: this.reducedMotion ? .48 : .7,
      kind: 'damage'
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= .94;
      particle.vy *= .94;
      if (particle.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingText.length - 1; i >= 0; i -= 1) {
      const item = this.floatingText[i];
      item.life -= dt;
      item.y -= (item.kind === 'damage' ? 18 : 24) * dt;
      if (item.life <= 0) this.floatingText.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const item of this.floatingText) {
      const ratio = Math.max(0, item.life / item.maxLife);
      ctx.globalAlpha = Math.min(1, ratio * 1.3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = item.kind === 'damage' ? '900 13px system-ui' : '900 14px system-ui';
      ctx.lineWidth = 3;
      ctx.strokeStyle = item.kind === 'damage' ? 'rgba(84,38,32,.72)' : 'rgba(44,63,38,.68)';
      ctx.strokeText(item.text, item.x, item.y);
      ctx.fillStyle = item.kind === 'damage' ? '#fff2c9' : '#f8e58a';
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }
}
