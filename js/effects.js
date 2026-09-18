export class Effects {
  constructor() {
    this.particles = [];
    this.floatingText = [];
  }

  burst(x, y, color, count = 7) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 100;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: .28 + Math.random() * .25,
        maxLife: .53,
        color,
        radius: 2 + Math.random() * 3
      });
    }
  }

  money(x, y, amount) {
    this.floatingText.push({ x, y, text: `+$${amount}`, life: .95, maxLife: .95 });
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
      item.y -= 24 * dt;
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
      ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
      ctx.fillStyle = '#ffe991';
      ctx.strokeStyle = 'rgba(52,74,48,.72)';
      ctx.lineWidth = 4;
      ctx.font = '900 18px system-ui';
      ctx.textAlign = 'center';
      ctx.strokeText(item.text, item.x, item.y);
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }
}
