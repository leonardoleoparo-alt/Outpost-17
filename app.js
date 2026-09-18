(() => {
'use strict';

// utils.js
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const distanceSq = (ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};
const distance = (ax, ay, bx, by) => Math.sqrt(distanceSq(ax, ay, bx, by));

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq === 0) return distance(px, py, ax, ay);
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
  return distance(px, py, ax + abx * t, ay + aby * t);
}

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function formatMoney(value) {
  return `$${Math.floor(value).toLocaleString('en-US')}`;
}

function drawRoundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circlesOverlap(a, b, padding = 0) {
  const radius = a.radius + b.radius + padding;
  return distanceSq(a.x, a.y, b.x, b.y) < radius * radius;
}


// path.js
const PATH_POINTS = Object.freeze([
  { x: -70, y: 170 },
  { x: 300, y: 170 },
  { x: 300, y: 380 },
  { x: 620, y: 380 },
  { x: 620, y: 165 },
  { x: 1000, y: 165 },
  { x: 1000, y: 560 },
  { x: 1260, y: 560 },
  { x: 1260, y: 335 },
  { x: 1462, y: 335 }
]);

class PathRoute {
  constructor(points = PATH_POINTS, width = 104) {
    this.points = points.map((point) => ({ ...point }));
    this.width = width;
    this.segments = [];
    this.totalLength = 0;
    this.buildSegments();
  }

  buildSegments() {
    this.segments.length = 0;
    this.totalLength = 0;
    for (let i = 0; i < this.points.length - 1; i += 1) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      this.segments.push({ a, b, length, start: this.totalLength });
      this.totalLength += length;
    }
  }

  positionAt(distanceAlong) {
    const d = clamp(distanceAlong, 0, this.totalLength);
    const segment = this.segments.find((item) => d <= item.start + item.length) ?? this.segments.at(-1);
    const t = segment.length === 0 ? 0 : (d - segment.start) / segment.length;
    return {
      x: lerp(segment.a.x, segment.b.x, t),
      y: lerp(segment.a.y, segment.b.y, t),
      angle: Math.atan2(segment.b.y - segment.a.y, segment.b.x - segment.a.x)
    };
  }

  distanceFromPoint(x, y) {
    let best = Infinity;
    for (const segment of this.segments) {
      best = Math.min(best, pointToSegmentDistance(x, y, segment.a.x, segment.a.y, segment.b.x, segment.b.y));
    }
    return best;
  }

  containsPoint(x, y, padding = 0) {
    return this.distanceFromPoint(x, y) <= this.width / 2 + padding;
  }

  draw(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.stroke(ctx, this.width + 30, '#4f7348');
    this.stroke(ctx, this.width + 18, '#8f7048');
    this.stroke(ctx, this.width + 8, '#c79a61');
    this.stroke(ctx, this.width, '#d9b278');
    this.stroke(ctx, this.width - 18, '#e1bf87');

    ctx.globalAlpha = .22;
    ctx.setLineDash([4, 13]);
    this.stroke(ctx, this.width - 36, '#b78955');
    ctx.setLineDash([]);

    ctx.globalAlpha = .34;
    ctx.setLineDash([7, 20]);
    this.stroke(ctx, 3, '#8d683e');
    ctx.setLineDash([]);
    ctx.restore();
  }

  stroke(ctx, width, color) {
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i += 1) ctx.lineTo(this.points[i].x, this.points[i].y);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}


// map.js
const GRASS_COLORS = ['#78b861', '#72af5b', '#82bd68', '#6eaa58'];
const FLOWER_COLORS = ['#f4d76c', '#f49f80', '#f7f0d2', '#a9d2ee'];

class Outpost {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 72;
    this.maxHp = 100;
    this.hp = 100;
    this.hitFlash = 0;
  }

  damage(amount) {
    const before = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = .18;
    return before - this.hp;
  }

  update(dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.globalAlpha = .18;
    ctx.fillStyle = '#214a37';
    ctx.beginPath();
    ctx.ellipse(7, 48, 87, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#d7d0b4';
    drawRoundedRect(ctx, -69, -49, 138, 98, 18);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#567568';
    ctx.stroke();

    ctx.fillStyle = this.hitFlash > 0 ? '#e98c7f' : '#5f96c2';
    drawRoundedRect(ctx, -50, -35, 100, 70, 12);
    ctx.fill();

    ctx.fillStyle = '#e8f0dc';
    ctx.fillRect(-34, -18, 68, 36);
    ctx.fillStyle = '#2d5c4a';
    ctx.fillRect(-4, -18, 8, 36);
    ctx.fillRect(-34, -4, 68, 8);

    ctx.fillStyle = '#d76f53';
    ctx.beginPath();
    ctx.moveTo(-58, -49);
    ctx.lineTo(0, -79);
    ctx.lineTo(58, -49);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#9e4d3d';
    ctx.stroke();

    const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const barWidth = 148;
    const barHeight = 24;
    const barX = -barWidth / 2;
    const barY = -122;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#244b3b';
    ctx.font = '900 17px system-ui';
    ctx.fillText('OUTPOST 17', 0, barY - 14);

    ctx.fillStyle = 'rgba(255,250,240,.96)';
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 8);
    ctx.fill();
    ctx.lineWidth = this.hitFlash > 0 ? 4 : 3;
    ctx.strokeStyle = this.hitFlash > 0 ? '#d75d52' : '#557262';
    ctx.stroke();

    const fillWidth = (barWidth - 6) * hpRatio;
    if (fillWidth > 0) {
      ctx.fillStyle = hpRatio > .6 ? '#4d9d5d' : hpRatio > .3 ? '#e1a348' : '#d75d52';
      drawRoundedRect(ctx, barX + 3, barY + 3, fillWidth, barHeight - 6, 5);
      ctx.fill();
    }

    ctx.fillStyle = '#173d30';
    ctx.font = '900 13px system-ui';
    ctx.fillText(`HP ${Math.ceil(this.hp)} / ${this.maxHp}`, 0, barY + barHeight / 2 + .5);

    ctx.restore();
  }
}

class ForestMap {
  constructor(width = 1600, height = 900) {
    this.width = width;
    this.height = height;
    this.path = new PathRoute();
    this.outpost = new Outpost(1520, 335);
    this.decorations = [];
    this.grassDetails = [];
    this.blockers = [];
    this.buildDecoration();
    this.buildStaticLayer();
  }

  update(dt) {
    this.outpost.update(dt);
  }

  buildDecoration() {
    const random = seededRandom(17017);
    const items = [];

    for (let i = 0; i < 150; i += 1) {
      const x = 30 + random() * (this.width - 60);
      const y = 30 + random() * (this.height - 60);
      const distanceToPath = this.path.distanceFromPoint(x, y);
      const outpostGap = Math.sqrt(distanceSq(x, y, this.outpost.x, this.outpost.y));
      if (distanceToPath < this.path.width / 2 + 42 || outpostGap < 135) continue;

      const roll = random();
      if (roll < .24) {
        const radius = 22 + random() * 14;
        items.push({ type: 'tree', x, y, radius, shade: random() });
        if (random() < .72) this.blockers.push({ x, y, radius: radius * .68, type: 'tree' });
      } else if (roll < .38) {
        const radius = 13 + random() * 10;
        items.push({ type: 'rock', x, y, radius, shade: random() });
        if (random() < .6) this.blockers.push({ x, y, radius: radius * .8, type: 'rock' });
      } else if (roll < .66) {
        items.push({ type: 'bush', x, y, radius: 10 + random() * 8, shade: random() });
      } else if (roll < .88) {
        items.push({ type: 'flowers', x, y, radius: 7 + random() * 5, shade: random() });
      } else {
        items.push({ type: 'dirt', x, y, radius: 17 + random() * 22, shade: random() });
      }
    }

    for (let i = 0; i < 210; i += 1) {
      const x = 18 + random() * (this.width - 36);
      const y = 18 + random() * (this.height - 36);
      if (this.path.distanceFromPoint(x, y) < this.path.width / 2 + 16) continue;
      this.grassDetails.push({ x, y, angle: random() * Math.PI, size: 2 + random() * 4, alpha: .08 + random() * .12 });
    }

    this.decorations = items;
  }

  buildStaticLayer() {
    if (typeof document === 'undefined') {
      this.staticLayer = null;
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    this.drawStatic(ctx);
    this.staticLayer = canvas;
  }

  isInsideBuildArea(x, y, radius = 24) {
    return x - radius >= 18 && y - radius >= 18 && x + radius <= this.width - 18 && y + radius <= this.height - 18;
  }

  isBlocked(x, y, radius = 24) {
    if (this.path.containsPoint(x, y, radius + 5)) return { blocked: true, reason: 'PATH' };
    const outpostDistance = Math.sqrt(distanceSq(x, y, this.outpost.x, this.outpost.y));
    if (outpostDistance < this.outpost.radius + radius + 24) return { blocked: true, reason: 'OUTPOST' };
    for (const blocker of this.blockers) {
      const min = blocker.radius + radius + 5;
      if (distanceSq(x, y, blocker.x, blocker.y) < min * min) return { blocked: true, reason: 'DECORATION' };
    }
    return { blocked: false, reason: '' };
  }

  draw(ctx) {
    if (this.staticLayer) ctx.drawImage(this.staticLayer, 0, 0);
    else this.drawStatic(ctx);
    this.outpost.draw(ctx);
  }

  drawStatic(ctx) {
    ctx.save();
    ctx.fillStyle = '#78b861';
    ctx.fillRect(0, 0, this.width, this.height);

    const tile = 80;
    for (let y = 0; y < this.height; y += tile) {
      for (let x = 0; x < this.width; x += tile) {
        const index = ((x / tile) + (y / tile) * 3) % GRASS_COLORS.length;
        ctx.globalAlpha = .16;
        ctx.fillStyle = GRASS_COLORS[index];
        ctx.fillRect(x, y, tile, tile);
      }
    }

    for (const detail of this.grassDetails) {
      ctx.save();
      ctx.translate(detail.x, detail.y);
      ctx.rotate(detail.angle);
      ctx.globalAlpha = detail.alpha;
      ctx.strokeStyle = '#2e7243';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-detail.size, detail.size);
      ctx.lineTo(0, -detail.size);
      ctx.lineTo(detail.size, detail.size);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const item of this.decorations) {
      if (item.type === 'dirt') this.drawDirt(ctx, item);
    }

    this.path.draw(ctx);
    this.drawEntry(ctx);

    for (const item of this.decorations) {
      if (item.type !== 'dirt') this.drawDecoration(ctx, item);
    }

    const vignette = ctx.createRadialGradient(this.width * .48, this.height * .42, 180, this.width * .48, this.height * .42, this.width * .72);
    vignette.addColorStop(0, 'rgba(255,255,220,0.025)');
    vignette.addColorStop(1, 'rgba(31,77,47,0.08)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  drawDirt(ctx, item) {
    ctx.save();
    ctx.globalAlpha = .16;
    ctx.fillStyle = '#866d42';
    ctx.beginPath();
    ctx.ellipse(item.x, item.y, item.radius * 1.35, item.radius * .7, item.shade * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawDecoration(ctx, item) {
    ctx.save();
    ctx.translate(item.x, item.y);

    if (item.type === 'tree') {
      ctx.globalAlpha = .18;
      ctx.fillStyle = '#254931';
      ctx.beginPath();
      ctx.ellipse(8, item.radius * .45, item.radius * .8, item.radius * .38, -.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#765835';
      ctx.fillRect(-5, 3, 10, item.radius * .7);
      ctx.fillStyle = item.shade > .5 ? '#326d42' : '#3c7c48';
      ctx.beginPath();
      ctx.arc(-item.radius * .22, -3, item.radius * .72, 0, Math.PI * 2);
      ctx.arc(item.radius * .25, -7, item.radius * .67, 0, Math.PI * 2);
      ctx.arc(0, -item.radius * .35, item.radius * .72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5f9d52';
      ctx.beginPath();
      ctx.arc(-item.radius * .18, -item.radius * .45, item.radius * .33, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'rock') {
      ctx.globalAlpha = .18;
      ctx.fillStyle = '#24472f';
      ctx.beginPath();
      ctx.ellipse(4, item.radius * .5, item.radius, item.radius * .35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = item.shade > .5 ? '#858b7e' : '#777f75';
      ctx.beginPath();
      ctx.moveTo(-item.radius, item.radius * .3);
      ctx.lineTo(-item.radius * .55, -item.radius * .65);
      ctx.lineTo(item.radius * .45, -item.radius * .8);
      ctx.lineTo(item.radius, item.radius * .25);
      ctx.lineTo(item.radius * .45, item.radius * .65);
      ctx.closePath();
      ctx.fill();
    } else if (item.type === 'bush') {
      ctx.fillStyle = item.shade > .5 ? '#4b8d4d' : '#559954';
      ctx.beginPath();
      ctx.arc(-item.radius * .45, 2, item.radius * .64, 0, Math.PI * 2);
      ctx.arc(item.radius * .4, 1, item.radius * .66, 0, Math.PI * 2);
      ctx.arc(0, -item.radius * .35, item.radius * .68, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'flowers') {
      const color = FLOWER_COLORS[Math.floor(item.shade * FLOWER_COLORS.length) % FLOWER_COLORS.length];
      ctx.fillStyle = '#3d8446';
      ctx.fillRect(-1, 0, 2, item.radius);
      ctx.fillStyle = color;
      for (let i = 0; i < 4; i += 1) {
        const angle = i * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 4, Math.sin(angle) * 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e0a83f';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawEntry(ctx) {
    ctx.save();
    ctx.translate(62, 170);
    ctx.fillStyle = 'rgba(255,250,240,.86)';
    drawRoundedRect(ctx, -45, -25, 90, 50, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(72,92,65,.25)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#c26e3f';
    ctx.font = '900 15px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ENTRY', 0, -3);
    ctx.fillStyle = '#6b7a6d';
    ctx.font = '800 10px system-ui';
    ctx.fillText('HOSTILES', 0, 13);
    ctx.restore();
  }
}


// economy.js
class Economy {
  constructor(startingMoney = 800) {
    this.startingMoney = startingMoney;
    this.money = startingMoney;
    this.totalEarned = 0;
    this.totalSpent = 0;
  }

  canAfford(amount) {
    return this.money >= amount;
  }

  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.money -= amount;
    this.totalSpent += amount;
    return true;
  }

  earn(amount) {
    this.money += amount;
    this.totalEarned += amount;
  }

  refund(amount) {
    this.money += amount;
  }
}


// effects.js
class Effects {
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


// enemies.js
const ENEMY_TYPES = Object.freeze({
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

class Enemy {
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
    this.reducedMotion = false;
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
    if (!this.reducedMotion && !this.isFlying && this.type !== 'shade') {
      const bob = Math.sin(this.bobPhase * (this.type === 'runner' ? 1.7 : 1.15));
      ctx.translate(0, bob * (this.type === 'brute' ? 1.0 : 1.7));
      if (this.type === 'runner') ctx.rotate(bob * .035);
    }
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
    ctx.fillStyle = 'rgba(31,48,38,.66)';
    ctx.fillRect(x - 1, y - 1, width + 2, 7);
    ctx.fillStyle = '#f2f0df';
    ctx.fillRect(x, y, width, 5);
    ctx.fillStyle = ratio > .45 ? '#cfe264' : '#e26e59';
    ctx.fillRect(x, y, Math.max(0, width * ratio), 5);
    ctx.restore();
  }
}


// targeting.js
function canTowerTarget(tower, enemy) {
  if (!enemy?.alive || enemy.active === false) return false;
  if (enemy.isFlying && !tower.canTargetFlying) return false;
  if (!enemy.isFlying && !tower.canTargetGround) return false;
  if (enemy.isInvisible && !(tower.hasDetection || enemy.isRevealed)) return false;
  return true;
}

function findFirstTarget(tower, enemies) {
  const rangeSq = tower.range * tower.range;
  let best = null;
  for (const enemy of enemies) {
    if (!canTowerTarget(tower, enemy)) continue;
    if (distanceSq(tower.x, tower.y, enemy.x, enemy.y) > rangeSq) continue;
    if (!best || enemy.pathProgress > best.pathProgress) best = enemy;
  }
  return best;
}

function updateRevealState(enemies, towers) {
  for (const enemy of enemies) {
    enemy.isRevealed = false;
    if (!enemy.alive || !enemy.isInvisible) continue;
    for (const tower of towers) {
      if (!tower.revealRange) continue;
      if (distanceSq(tower.x, tower.y, enemy.x, enemy.y) <= tower.revealRange * tower.revealRange) {
        enemy.isRevealed = true;
        break;
      }
    }
  }
}


// projectile.js
class Projectile {
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


// towers.js
const rangerLevels = [
  { damage: 18, range: 180, fireInterval: .72, canTargetGround: true, canTargetFlying: false, hasDetection: false },
  { damage: 27, range: 198, fireInterval: .62, canTargetGround: true, canTargetFlying: false, hasDetection: false },
  { damage: 36, range: 214, fireInterval: .56, canTargetGround: true, canTargetFlying: true, hasDetection: false, unlock: 'ANTI-AIR' },
  { damage: 48, range: 232, fireInterval: .50, canTargetGround: true, canTargetFlying: true, hasDetection: true, unlock: 'DETECTION' }
];

const marksmanLevels = [
  { damage: 58, range: 300, fireInterval: 1.62, canTargetGround: true, canTargetFlying: false, hasDetection: false },
  { damage: 92, range: 342, fireInterval: 1.52, canTargetGround: true, canTargetFlying: false, hasDetection: false },
  { damage: 128, range: 368, fireInterval: 1.43, canTargetGround: true, canTargetFlying: false, hasDetection: true, unlock: 'DETECTION' },
  { damage: 176, range: 395, fireInterval: 1.34, canTargetGround: true, canTargetFlying: true, hasDetection: true, unlock: 'ANTI-AIR' }
];

const airDefenseLevels = [
  { damage: 30, range: 222, fireInterval: .58, canTargetGround: false, canTargetFlying: true, hasDetection: false },
  { damage: 43, range: 232, fireInterval: .47, canTargetGround: false, canTargetFlying: true, hasDetection: false },
  { damage: 59, range: 248, fireInterval: .40, canTargetGround: false, canTargetFlying: true, hasDetection: true, unlock: 'DETECTION' },
  { damage: 84, range: 274, fireInterval: .34, canTargetGround: false, canTargetFlying: true, hasDetection: true, unlock: 'AIR SUPERIORITY' }
];

const scoutLevels = [
  { damage: 8, range: 158, fireInterval: .96, canTargetGround: true, canTargetFlying: false, hasDetection: true, revealRange: 0 },
  { damage: 10, range: 188, fireInterval: .86, canTargetGround: true, canTargetFlying: false, hasDetection: true, revealRange: 0 },
  { damage: 13, range: 205, fireInterval: .78, canTargetGround: true, canTargetFlying: false, hasDetection: true, revealRange: 220, unlock: 'REVEAL' },
  { damage: 19, range: 228, fireInterval: .68, canTargetGround: true, canTargetFlying: false, hasDetection: true, revealRange: 270, unlock: 'ENHANCED REVEAL' }
];

const TOWER_TYPES = Object.freeze({
  ranger: Object.freeze({
    name: 'Ranger',
    role: 'Balanced defense',
    shopTarget: 'GROUND',
    cost: 250,
    radius: 28,
    upgradeCosts: Object.freeze([225, 400, 575]),
    levels: Object.freeze(rangerLevels.map(Object.freeze)),
    projectile: Object.freeze({ color: '#ffef9a', glow: '#f0be47', speed: 720, radius: 4 })
  }),
  marksman: Object.freeze({
    name: 'Marksman',
    role: 'Long-range heavy hit',
    shopTarget: 'GROUND',
    cost: 525,
    radius: 30,
    upgradeCosts: Object.freeze([350, 500, 700]),
    levels: Object.freeze(marksmanLevels.map(Object.freeze)),
    projectile: Object.freeze({ color: '#fff5cb', glow: '#ecb45b', speed: 980, radius: 4 })
  }),
  airDefense: Object.freeze({
    name: 'Air Defense',
    role: 'Anti-Air specialist',
    shopTarget: 'FLYING',
    cost: 425,
    radius: 31,
    upgradeCosts: Object.freeze([275, 425, 600]),
    levels: Object.freeze(airDefenseLevels.map(Object.freeze)),
    projectile: Object.freeze({ color: '#b9e7ff', glow: '#5db8e5', speed: 820, radius: 5 })
  }),
  scout: Object.freeze({
    name: 'Scout',
    role: 'Detection support',
    shopTarget: 'DETECTION',
    cost: 325,
    radius: 27,
    upgradeCosts: Object.freeze([225, 350, 475]),
    levels: Object.freeze(scoutLevels.map(Object.freeze)),
    projectile: Object.freeze({ color: '#bde9c2', glow: '#65ae76', speed: 650, radius: 3 })
  })
});

class Tower {
  constructor(type, x, y) {
    const definition = TOWER_TYPES[type];
    if (!definition) throw new Error(`Unknown tower type: ${type}`);
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = definition.radius;
    this.level = 1;
    this.totalInvested = definition.cost;
    this.cooldown = 0;
    this.angle = 0;
    this.target = null;
    this.scanAngle = 0;
    this.muzzleFlash = 0;
    this.targetPulse = 0;
    this.applyLevelStats();
  }

  applyLevelStats() {
    const stats = this.definition.levels[this.level - 1];
    this.damage = stats.damage;
    this.range = stats.range;
    this.fireInterval = stats.fireInterval;
    this.canTargetGround = stats.canTargetGround;
    this.canTargetFlying = stats.canTargetFlying;
    this.hasDetection = stats.hasDetection;
    this.revealRange = stats.revealRange ?? 0;
  }

  get definition() {
    return TOWER_TYPES[this.type];
  }

  get isMaxLevel() {
    return this.level >= 4;
  }

  get nextUpgradeCost() {
    return this.isMaxLevel ? null : this.definition.upgradeCosts[this.level - 1];
  }

  get sellValue() {
    return Math.floor(this.totalInvested * .7);
  }

  get currentStats() {
    return this.definition.levels[this.level - 1];
  }

  get nextStats() {
    return this.isMaxLevel ? null : this.definition.levels[this.level];
  }

  upgrade() {
    if (this.isMaxLevel) return false;
    const cost = this.nextUpgradeCost;
    this.totalInvested += cost;
    this.level += 1;
    this.applyLevelStats();
    this.cooldown = Math.min(this.cooldown, this.fireInterval);
    return true;
  }

  update(dt, enemies, projectiles) {
    this.cooldown -= dt;
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
    this.targetPulse = Math.max(0, this.targetPulse - dt);
    this.scanAngle = (this.scanAngle + dt * 1.8) % (Math.PI * 2);
    const previousTarget = this.target;
    const target = findFirstTarget(this, enemies);
    this.target = target;
    if (target && target !== previousTarget) this.targetPulse = .14;
    if (!target) {
      this.cooldown = Math.max(0, this.cooldown);
      return false;
    }

    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.cooldown <= 0) {
      const muzzle = getMuzzleDistance(this.type);
      const muzzleX = this.x + Math.cos(this.angle) * muzzle;
      const muzzleY = this.y + Math.sin(this.angle) * muzzle;
      projectiles.push(new Projectile(muzzleX, muzzleY, target, this.damage, this.definition.projectile));
      this.muzzleFlash = .075;
      // Preserve fractional cooldown overshoot so 1x and 2x remain mechanically equivalent.
      this.cooldown += this.fireInterval;
      if (this.cooldown <= 0) this.cooldown = this.fireInterval;
      return true;
    }
    return false;
  }

  draw(ctx) {
    drawTower(ctx, this, 1);
  }
}

function createTower(type, x, y) {
  return new Tower(type, x, y);
}

function validatePlacement(type, x, y, map, towers) {
  const definition = TOWER_TYPES[type];
  if (!definition) return { valid: false, reason: 'UNKNOWN TOWER' };
  const candidate = { x, y, radius: definition.radius };

  if (!map.isInsideBuildArea(x, y, definition.radius)) return { valid: false, reason: 'OUTSIDE MAP' };
  const mapBlock = map.isBlocked(x, y, definition.radius);
  if (mapBlock.blocked) {
    const labels = { PATH: 'PATH BLOCKED', OUTPOST: 'OUTPOST CLEARANCE', DECORATION: 'BLOCKED TERRAIN' };
    return { valid: false, reason: labels[mapBlock.reason] ?? 'BLOCKED' };
  }

  for (const tower of towers) {
    if (circlesOverlap(candidate, tower, 14)) return { valid: false, reason: 'TOO CLOSE TO TOWER' };
  }

  return { valid: true, reason: 'VALID POSITION' };
}

function drawTowerPreview(ctx, type, x, y, validation) {
  const definition = TOWER_TYPES[type];
  if (!definition) return;
  const range = definition.levels[0].range;
  const color = validation.valid ? '#2f9f57' : '#d64f48';

  ctx.save();
  ctx.globalAlpha = .16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const previewTower = { type, x, y, angle: 0, level: 1, scanAngle: 0 };
  drawTower(ctx, previewTower, .72);

  ctx.globalAlpha = .96;
  ctx.font = '900 15px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = validation.valid ? `PLACE · $${definition.cost}` : validation.reason;
  const width = Math.max(116, ctx.measureText(label).width + 26);
  ctx.fillStyle = 'rgba(255,250,240,.95)';
  ctx.fillRect(x - width / 2, y + 46, width, 31);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - width / 2, y + 46, width, 31);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y + 62);
  ctx.restore();
}

function drawSelectedTowerRange(ctx, tower) {
  ctx.save();
  ctx.globalAlpha = .10;
  ctx.fillStyle = '#3a7bb4';
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .72;
  ctx.strokeStyle = '#3a7bb4';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.stroke();

  if (tower.revealRange > 0) {
    ctx.globalAlpha = .11;
    ctx.fillStyle = '#c9dd75';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.revealRange, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = .78;
    ctx.strokeStyle = '#b4cd61';
    ctx.lineWidth = 3;
    ctx.setLineDash([13, 9]);
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.revealRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.globalAlpha = .9;
  ctx.strokeStyle = '#fff7d9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.radius + 8, 0, Math.PI * 2);
  ctx.stroke();

  if (tower.target?.alive) {
    const r = tower.target.radius + 7;
    ctx.strokeStyle = '#e0ad43';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tower.target.x, tower.target.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function getUpgradePreview(tower) {
  if (!tower || tower.isMaxLevel) return null;
  const current = tower.currentStats;
  const next = tower.nextStats;
  return {
    cost: tower.nextUpgradeCost,
    damage: [current.damage, next.damage],
    range: [current.range, next.range],
    fireInterval: [current.fireInterval, next.fireInterval],
    unlock: next.unlock ?? null
  };
}

function getMuzzleDistance(type) {
  if (type === 'marksman') return 43;
  if (type === 'airDefense') return 31;
  if (type === 'scout') return 24;
  return 31;
}

function drawTower(ctx, tower, alpha) {
  if (tower.type === 'ranger') drawRanger(ctx, tower, alpha);
  else if (tower.type === 'marksman') drawMarksman(ctx, tower, alpha);
  else if (tower.type === 'airDefense') drawAirDefense(ctx, tower, alpha);
  else if (tower.type === 'scout') drawScout(ctx, tower, alpha);
  drawTowerFeedback(ctx, tower, alpha);
}

function drawTowerFeedback(ctx, tower, alpha) {
  if ((tower.level ?? 1) >= 3) {
    ctx.save();
    ctx.globalAlpha = .18 * alpha;
    ctx.strokeStyle = tower.type === 'airDefense' ? '#8bd3ed' : tower.type === 'scout' ? '#b9dc83' : '#f4d879';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if ((tower.targetPulse ?? 0) > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(.5, tower.targetPulse * 3) * alpha;
    ctx.strokeStyle = '#ffe8a1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.radius + 10 + (1 - tower.targetPulse / .14) * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if ((tower.muzzleFlash ?? 0) <= 0) return;
  const muzzle = getMuzzleDistance(tower.type);
  const x = tower.x + Math.cos(tower.angle ?? 0) * muzzle;
  const y = tower.y + Math.sin(tower.angle ?? 0) * muzzle;
  const strength = Math.min(1, tower.muzzleFlash / .075);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tower.angle ?? 0);
  ctx.globalAlpha = strength * alpha;
  ctx.fillStyle = tower.type === 'airDefense' ? '#d8f4ff' : '#fff0a6';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(15, -5);
  ctx.lineTo(9, 0);
  ctx.lineTo(15, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBaseShadow(ctx) {
  ctx.fillStyle = 'rgba(36,72,48,.18)';
  ctx.beginPath();
  ctx.ellipse(4, 22, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLevelPips(ctx, level) {
  ctx.fillStyle = '#fff4c9';
  for (let i = 0; i < level; i += 1) {
    ctx.beginPath();
    ctx.arc(-10.5 + i * 7, 20, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRanger(ctx, tower, alpha) {
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.globalAlpha = alpha;
  drawBaseShadow(ctx);

  ctx.fillStyle = '#e7d7a1';
  ctx.strokeStyle = '#315846';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = tower.level >= 3 ? '#3f7657' : '#4f855f';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(tower.angle ?? 0);
  ctx.fillStyle = '#294f41';
  ctx.fillRect(0, -6, 36, 12);
  ctx.fillStyle = tower.level >= 3 ? '#73a8c4' : '#f3c85f';
  ctx.fillRect(28, -4, 12, 8);
  ctx.rotate(-(tower.angle ?? 0));
  drawLevelPips(ctx, tower.level ?? 1);
  ctx.restore();
}

function drawMarksman(ctx, tower, alpha) {
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.globalAlpha = alpha;
  drawBaseShadow(ctx);

  ctx.fillStyle = '#d8c9a2';
  ctx.strokeStyle = '#604d3e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#795e49';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(tower.angle ?? 0);
  ctx.fillStyle = '#403d36';
  ctx.fillRect(-4, -5, 50, 10);
  ctx.fillStyle = '#b1844e';
  ctx.fillRect(27, -3, 19, 6);
  ctx.fillStyle = '#242824';
  ctx.fillRect(43, -2, 11, 4);
  ctx.rotate(-(tower.angle ?? 0));

  ctx.fillStyle = '#efe4c2';
  ctx.fillRect(-8, -23, 16, 9);
  drawLevelPips(ctx, tower.level ?? 1);
  ctx.restore();
}

function drawAirDefense(ctx, tower, alpha) {
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.globalAlpha = alpha;
  drawBaseShadow(ctx);

  ctx.fillStyle = '#d8e1d0';
  ctx.strokeStyle = '#48687a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#5d8195';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(tower.angle ?? 0);
  for (const offset of [-9, 9]) {
    ctx.fillStyle = '#38576a';
    ctx.fillRect(-2, offset - 5, 31, 10);
    ctx.fillStyle = '#86bfd6';
    ctx.fillRect(21, offset - 3, 13, 6);
  }
  ctx.rotate(-(tower.angle ?? 0));
  ctx.strokeStyle = '#d9f2ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -2, 10, Math.PI, Math.PI * 2);
  ctx.stroke();
  drawLevelPips(ctx, tower.level ?? 1);
  ctx.restore();
}

function drawScout(ctx, tower, alpha) {
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.globalAlpha = alpha;
  drawBaseShadow(ctx);

  ctx.fillStyle = '#d7dcc2';
  ctx.strokeStyle = '#426a54';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4e8b66';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#dff0b5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 19, -.85, .85);
  ctx.stroke();
  ctx.rotate(tower.scanAngle ?? 0);
  ctx.strokeStyle = '#89cba0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(22, 0);
  ctx.stroke();
  ctx.rotate(-(tower.scanAngle ?? 0));

  ctx.fillStyle = '#315645';
  ctx.fillRect(-2, -32, 4, 21);
  ctx.beginPath();
  ctx.arc(0, -33, 5, 0, Math.PI * 2);
  ctx.fill();
  drawLevelPips(ctx, tower.level ?? 1);
  ctx.restore();
}


// waves.js
const g = (type, count, interval, delay = 0) => Object.freeze({ type, count, interval, delay });
const wave = (number, label, clearBonus, groups) => Object.freeze({ number, label, clearBonus, groups: Object.freeze(groups) });
const repeat = (count, factory) => Array.from({ length: count }, (_, index) => factory(index)).flat();

const WAVE_CONFIGS = Object.freeze([
  wave(1, 'GRUNT PATROL', 240, [g('grunt',10,.85)]),
  wave(2, 'GROUND PRESSURE', 290, [g('grunt',15,.72)]),
  wave(3, 'RUNNERS DETECTED', 306, [g('grunt',8,.68),g('runner',8,.48,1)]),
  wave(4, 'HEAVY CONTACT', 378, [g('grunt',7,.66),g('brute',4,1.2,.8),g('runner',6,.5,.7)]),
  wave(5, 'AIR ENEMY DETECTED', 419, [g('grunt',6,.68),g('runner',5,.5,.7),g('glider',8,.62,1.1)]),
  wave(6, 'AIR PRESSURE', 406, [g('grunt',8,.62),g('runner',8,.44,.7),g('glider',12,.52,.8)]),
  wave(7, 'MIXED ASSAULT', 466, [g('grunt',8,.58),g('brute',5,1.05,.7),g('glider',10,.5,.8),g('runner',8,.42,.6)]),
  wave(8, 'CLOAKED ENEMY DETECTED', 356, [g('grunt',6,.68),g('shade',8,.72,1.1)]),
  wave(9, 'CLOAKED PRESSURE', 440, [g('grunt',8,.58),g('runner',10,.42,.6),g('shade',12,.58,.8)]),
  wave(10, 'CHECKPOINT ASSAULT', 630, repeat(6,()=>[g('grunt',2,.22,.10),g('runner',2,.18,.10),g('glider',2,.22,.10),g('shade',2,.24,.10),g('brute',1,.38,.14)])),
  wave(11, 'RAPID ADVANCE', 40, repeat(8,()=>[g('runner',4,.13,.04),g('glider',3,.16,.04),g('grunt',2,.16,.04)])),
  wave(12, 'HEAVY SHADOWS', 40, repeat(7,()=>[g('brute',1,.42,.06),g('shade',4,.18,.04),g('runner',2,.14,.04),g('grunt',2,.16,.04)])),
  wave(13, 'DENSE CONTACT', 50, repeat(8,()=>[g('grunt',2,.14,.03),g('glider',2,.14,.03),g('runner',2,.12,.03),g('shade',2,.15,.03),g('brute',1,.36,.05)])),
  wave(14, 'AIR DOMINANCE', 50, [...repeat(10,()=>[g('glider',5,.11,.025),g('runner',2,.11,.025),g('grunt',1,.14,.025),g('shade',1,.15,.025)]),g('brute',4,.40,.05)]),
  wave(15, 'PHANTOM DETECTED', 70, repeat(7,()=>[g('glider',2,.13,.03),g('phantom',3,.20,.03),g('runner',2,.11,.025),g('shade',1,.14,.025),g('brute',1,.36,.03),g('grunt',2,.13,.025)])),

  // Final campaign arc: no new mechanics, only stronger composition/timing pressure.
  wave(16, 'VEILED ASSAULT', 60, repeat(10,()=>[
    g('shade',2,.09,.012), g('phantom',5,.105,.012), g('runner',1,.065,.010)
  ])),
  wave(17, 'HEAVY LINE', 60, repeat(8,()=>[
    g('brute',5,.19,.014), g('grunt',2,.08,.010), g('glider',1,.08,.010), g('shade',1,.09,.010), g('runner',1,.06,.008)
  ])),
  wave(18, 'AIR SIEGE', 70, [
    ...repeat(10,()=>[g('glider',5,.06,.008),g('phantom',3,.08,.008),g('runner',1,.055,.006)]),
    g('brute',5,.17,.18)
  ]),
  wave(19, 'CONVERGENCE', 80, repeat(10,()=>[
    g('grunt',1,.07,.006), g('glider',1,.065,.006), g('shade',1,.075,.006), g('runner',1,.05,.005), g('phantom',2,.08,.006), g('brute',5,.17,.009)
  ])),
  wave(20, 'FINAL ASSAULT', 120, [
    // Phase 1: 40 fast / open-air units.
    ...repeat(10,(i)=>[g('runner',2,.05,i===0?.02:.005),g('grunt',1,.07,.005),g('glider',1,.06,.005)]),
    // Phase 2: 45 heavy + cloaked units.
    ...repeat(5,(i)=>[g('brute',5,.16,i===0?.34:.007),g('shade',2,.07,.005),g('phantom',2,.078,.005)]),
    // Phase 3: 45 mixed units, all six types overlapping.
    ...repeat(5,(i)=>[g('grunt',1,.06,i===0?.38:.004),g('runner',1,.045,.004),g('brute',3,.145,.005),g('glider',1,.055,.004),g('shade',1,.065,.004),g('phantom',2,.072,.004)])
  ])
]);

class WaveController {
  constructor(route) {
    this.route = route;
    this.reset();
  }

  reset() {
    this.active = false;
    this.currentWave = 0;
    this.activeConfig = null;
    this.schedule = [];
    this.elapsed = 0;
    this.spawnIndex = 0;
  }

  get nextWaveNumber() {
    return Math.min(this.currentWave + 1, WAVE_CONFIGS.length);
  }

  get phaseComplete() {
    return !this.active && this.currentWave >= WAVE_CONFIGS.length;
  }

  start() {
    if (this.active || this.phaseComplete) return null;
    const config = WAVE_CONFIGS[this.currentWave];
    if (!config) return null;
    this.active = true;
    this.activeConfig = config;
    this.schedule = buildSchedule(config);
    this.elapsed = 0;
    this.spawnIndex = 0;
    return config;
  }

  update(dt, enemies) {
    if (!this.active) return;
    this.elapsed += dt;
    while (this.spawnIndex < this.schedule.length && this.schedule[this.spawnIndex].time <= this.elapsed) {
      const event = this.schedule[this.spawnIndex];
      enemies.push(new Enemy(event.type, this.route));
      this.spawnIndex += 1;
    }
  }

  evaluate(enemies) {
    if (!this.active) return null;
    if (this.spawnIndex < this.schedule.length) return null;
    if (enemies.some((enemy) => enemy.alive && enemy.active !== false)) return null;
    const cleared = this.activeConfig;
    this.active = false;
    this.currentWave = cleared.number;
    this.activeConfig = null;
    return cleared;
  }
}

function buildSchedule(config) {
  const schedule = [];
  let cursor = 0;
  for (const group of config.groups) {
    cursor += group.delay ?? 0;
    for (let i = 0; i < group.count; i += 1) {
      schedule.push({ time: cursor, type: group.type });
      cursor += group.interval;
    }
  }
  return schedule;
}


// input.js
class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouse = { x: 0, y: 0, inside: false };
    this.onPrimary = null;
    this.onCancel = null;
    this.onEscape = null;
    this.bind();
  }

  bind() {
    this.canvas.addEventListener('pointermove', (event) => {
      const point = this.toCanvasPoint(event.clientX, event.clientY);
      this.mouse.x = point.x;
      this.mouse.y = point.y;
      this.mouse.inside = point.inside;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.mouse.inside = false;
    });

    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const point = this.toCanvasPoint(event.clientX, event.clientY);
      this.onPrimary?.(point);
    });

    this.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.onCancel?.();
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.onEscape?.();
      }
    });
  }

  toCanvasPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / this.canvas.width, rect.height / this.canvas.height);
    const renderedWidth = this.canvas.width * scale;
    const renderedHeight = this.canvas.height * scale;
    const offsetX = rect.left + (rect.width - renderedWidth) / 2;
    const offsetY = rect.top + (rect.height - renderedHeight) / 2;
    return {
      x: (clientX - offsetX) / scale,
      y: (clientY - offsetY) / scale,
      inside: clientX >= offsetX && clientX <= offsetX + renderedWidth && clientY >= offsetY && clientY <= offsetY + renderedHeight
    };
  }
}


// audio.js
const AudioContextClass = window.AudioContext || window.webkitAudioContext;

class AudioManager {
  constructor() {
    this.enabled = true;
    this.masterVolume = 0.8;
    this.sfxVolume = 0.72;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.lastPlayed = new Map();
    this.userActivated = false;

    this.handleFirstInteraction = this.handleFirstInteraction.bind(this);
    window.addEventListener('pointerdown', this.handleFirstInteraction, { once: true, capture: true });
    window.addEventListener('keydown', this.handleFirstInteraction, { once: true, capture: true });
  }

  get available() {
    return Boolean(AudioContextClass);
  }

  get outputVolume() {
    return Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume));
  }

  applyVolume() {
    if (!this.master || !this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.enabled ? this.outputVolume : 0, now, 0.015);
  }

  setMasterVolume(value) {
    this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this.unlock();
    this.applyVolume();
    return this.masterVolume;
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this.unlock();
    this.applyVolume();
    return this.sfxVolume;
  }

  handleFirstInteraction() {
    this.userActivated = true;
    this.unlock();
  }

  unlock() {
    if (!this.enabled || !this.available || !this.userActivated) return false;
    if (!this.context) this.createContext();
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return true;
  }

  createContext() {
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.enabled ? this.outputVolume : 0;
    this.master.connect(this.context.destination);

    const length = Math.max(1, Math.floor(this.context.sampleRate * 0.35));
    this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.unlock();
      if (this.master && this.context) {
        const now = this.context.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(this.outputVolume, now, 0.015);
      }
      this.confirm();
    } else if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.012);
    }
    return this.enabled;
  }

  canPlay(key, interval = 0) {
    if (!this.enabled || !this.available) return false;
    if (!this.userActivated) return false;
    this.unlock();
    if (!this.context || !this.master) return false;
    const now = this.context.currentTime;
    const last = this.lastPlayed.get(key) ?? -Infinity;
    if (now - last < interval) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  tone({ frequency = 440, endFrequency = frequency, duration = 0.08, gain = 0.08, type = 'sine', delay = 0 }) {
    if (!this.context || !this.master) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const amp = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(amp);
    amp.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
    oscillator.onended = () => {
      oscillator.disconnect();
      amp.disconnect();
    };
  }

  noise({ duration = 0.05, gain = 0.035, frequency = 1500, delay = 0 }) {
    if (!this.context || !this.master || !this.noiseBuffer) return;
    const start = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    amp.gain.setValueAtTime(Math.max(0.0001, gain), start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    source.start(start, 0, Math.min(duration + 0.02, this.noiseBuffer.duration));
    source.stop(start + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      amp.disconnect();
    };
  }

  towerShot(type) {
    if (!this.canPlay(`shot:${type}`, type === 'airDefense' ? 0.035 : 0.045)) return;
    if (type === 'marksman') {
      this.tone({ frequency: 180, endFrequency: 90, duration: 0.095, gain: 0.055, type: 'square' });
      this.noise({ duration: 0.06, gain: 0.035, frequency: 1000 });
    } else if (type === 'airDefense') {
      this.tone({ frequency: 420, endFrequency: 210, duration: 0.06, gain: 0.034, type: 'sawtooth' });
    } else if (type === 'scout') {
      this.tone({ frequency: 650, endFrequency: 860, duration: 0.045, gain: 0.025, type: 'sine' });
    } else {
      this.tone({ frequency: 300, endFrequency: 180, duration: 0.055, gain: 0.04, type: 'square' });
      this.noise({ duration: 0.035, gain: 0.02, frequency: 1700 });
    }
  }

  impact(killed = false) {
    if (!this.canPlay(killed ? 'kill' : 'impact', killed ? 0.055 : 0.04)) return;
    this.noise({ duration: killed ? 0.07 : 0.035, gain: killed ? 0.035 : 0.018, frequency: killed ? 1100 : 1800 });
    if (killed) this.tone({ frequency: 520, endFrequency: 760, duration: 0.075, gain: 0.026, type: 'triangle' });
  }

  baseHit() {
    if (!this.canPlay('baseHit', 0.09)) return;
    this.tone({ frequency: 115, endFrequency: 55, duration: 0.18, gain: 0.09, type: 'sawtooth' });
    this.noise({ duration: 0.12, gain: 0.05, frequency: 650 });
  }

  placement() {
    if (!this.canPlay('placement', 0.08)) return;
    this.tone({ frequency: 210, endFrequency: 145, duration: 0.07, gain: 0.045, type: 'triangle' });
    this.noise({ duration: 0.045, gain: 0.025, frequency: 900 });
  }

  upgrade() {
    if (!this.canPlay('upgrade', 0.08)) return;
    this.tone({ frequency: 440, endFrequency: 620, duration: 0.08, gain: 0.045, type: 'sine' });
    this.tone({ frequency: 620, endFrequency: 880, duration: 0.09, gain: 0.04, type: 'sine', delay: 0.075 });
  }

  sell() {
    if (!this.canPlay('sell', 0.08)) return;
    this.tone({ frequency: 760, endFrequency: 600, duration: 0.07, gain: 0.035, type: 'triangle' });
    this.tone({ frequency: 980, endFrequency: 820, duration: 0.06, gain: 0.025, type: 'triangle', delay: 0.055 });
  }

  error() {
    if (!this.canPlay('error', 0.18)) return;
    this.tone({ frequency: 170, endFrequency: 135, duration: 0.11, gain: 0.038, type: 'square' });
  }

  waveStart(finalWave = false) {
    if (!this.canPlay(finalWave ? 'finalWave' : 'waveStart', 0.25)) return;
    const base = finalWave ? 260 : 330;
    this.tone({ frequency: base, endFrequency: base * 1.18, duration: 0.11, gain: 0.045, type: 'triangle' });
    this.tone({ frequency: base * 1.35, endFrequency: base * 1.55, duration: 0.12, gain: 0.04, type: 'triangle', delay: 0.105 });
    if (finalWave) this.tone({ frequency: 145, endFrequency: 95, duration: 0.28, gain: 0.055, type: 'sawtooth', delay: 0.02 });
  }

  waveClear() {
    if (!this.canPlay('waveClear', 0.25)) return;
    this.tone({ frequency: 460, endFrequency: 580, duration: 0.08, gain: 0.04, type: 'sine' });
    this.tone({ frequency: 610, endFrequency: 760, duration: 0.1, gain: 0.04, type: 'sine', delay: 0.075 });
  }

  pause(paused) {
    if (!this.canPlay('pause', 0.1)) return;
    this.tone({ frequency: paused ? 270 : 380, endFrequency: paused ? 210 : 520, duration: 0.075, gain: 0.028, type: 'triangle' });
  }

  speed() {
    if (!this.canPlay('speed', 0.08)) return;
    this.tone({ frequency: 480, endFrequency: 650, duration: 0.055, gain: 0.025, type: 'sine' });
  }

  victory() {
    if (!this.canPlay('victory', 0.5)) return;
    [392, 494, 587, 784].forEach((frequency, index) => {
      this.tone({ frequency, endFrequency: frequency * 1.015, duration: 0.19, gain: 0.045, type: 'triangle', delay: index * 0.13 });
    });
  }

  gameOver() {
    if (!this.canPlay('gameOver', 0.5)) return;
    this.tone({ frequency: 260, endFrequency: 150, duration: 0.28, gain: 0.055, type: 'sawtooth' });
    this.tone({ frequency: 185, endFrequency: 90, duration: 0.34, gain: 0.045, type: 'triangle', delay: 0.18 });
  }

  confirm() {
    if (!this.canPlay('confirm', 0.08)) return;
    this.tone({ frequency: 520, endFrequency: 690, duration: 0.06, gain: 0.025, type: 'sine' });
  }
}


// ui.js
class GameUI {
  constructor() {
    this.lastOverlayState = null;
    this.settingsOpen = false;
    this.settingsReturnFocus = null;
    this.elements = {
      baseText: document.querySelector('#baseText'),
      waveText: document.querySelector('#waveText'),
      moneyText: document.querySelector('#moneyText'),
      phaseLabel: document.querySelector('#phaseLabel'),
      phaseHint: document.querySelector('#phaseHint'),
      startWaveButton: document.querySelector('#startWaveButton'),
      speedButtons: [...document.querySelectorAll('.speed-button[data-speed]')],
      pauseButton: document.querySelector('#pauseButton'),
      soundButton: document.querySelector('#soundButton'),
      settingsButton: document.querySelector('#settingsButton'),
      topbar: document.querySelector('.topbar'),
      towerDock: document.querySelector('.tower-dock'),
      menuOverlay: document.querySelector('#menuOverlay'),
      menuPlayButton: document.querySelector('#menuPlayButton'),
      menuSettingsButton: document.querySelector('#menuSettingsButton'),
      settingsOverlay: document.querySelector('#settingsOverlay'),
      settingsCloseButton: document.querySelector('#settingsCloseButton'),
      settingsDoneButton: document.querySelector('#settingsDoneButton'),
      masterVolume: document.querySelector('#masterVolume'),
      masterVolumeValue: document.querySelector('#masterVolumeValue'),
      sfxVolume: document.querySelector('#sfxVolume'),
      sfxVolumeValue: document.querySelector('#sfxVolumeValue'),
      reducedMotion: document.querySelector('#reducedMotion'),
      damageNumbers: document.querySelector('#damageNumbers'),
      towerCards: [...document.querySelectorAll('.tower-card[data-tower]')],
      dockTitle: document.querySelector('#dockTitle'),
      dockHint: document.querySelector('#dockHint'),
      toastRegion: document.querySelector('#toastRegion'),
      gameStage: document.querySelector('#gameStage'),
      inspector: document.querySelector('#towerInspector'),
      inspectorName: document.querySelector('#inspectorName'),
      inspectorLevel: document.querySelector('#inspectorLevel'),
      inspectorDamage: document.querySelector('#inspectorDamage'),
      inspectorRange: document.querySelector('#inspectorRange'),
      inspectorRate: document.querySelector('#inspectorRate'),
      targetGround: document.querySelector('#targetGround'),
      targetFlying: document.querySelector('#targetFlying'),
      targetInvisible: document.querySelector('#targetInvisible'),
      inspectorSupport: document.querySelector('#inspectorSupport'),
      upgradePreview: document.querySelector('#upgradePreview'),
      upgradeDamage: document.querySelector('#upgradeDamage'),
      upgradeRange: document.querySelector('#upgradeRange'),
      upgradeRate: document.querySelector('#upgradeRate'),
      upgradeAbility: document.querySelector('#upgradeAbility'),
      upgradeAbilityName: document.querySelector('#upgradeAbilityName'),
      upgradeButton: document.querySelector('#upgradeButton'),
      sellButton: document.querySelector('#sellButton'),
      investedText: document.querySelector('#investedText'),
      stateOverlay: document.querySelector('#stateOverlay'),
      overlayKicker: document.querySelector('#overlayKicker'),
      overlayTitle: document.querySelector('#overlayTitle'),
      overlaySubtitle: document.querySelector('#overlaySubtitle'),
      overlayStats: document.querySelector('#overlayStats'),
      overlayPrimary: document.querySelector('#overlayPrimary'),
      overlaySecondary: document.querySelector('#overlaySecondary'),
      resultWave: document.querySelector('#resultWave'),
      resultKills: document.querySelector('#resultKills'),
      resultHp: document.querySelector('#resultHp'),
      resultEarned: document.querySelector('#resultEarned'),
      resultSpent: document.querySelector('#resultSpent'),
      resultTowers: document.querySelector('#resultTowers'),
      resultUpgrades: document.querySelector('#resultUpgrades')
    };
  }

  bind(game) {
    for (const card of this.elements.towerCards) card.addEventListener('click', () => game.togglePlacement(card.dataset.tower));
    this.elements.startWaveButton.addEventListener('click', () => game.primaryAction());
    for (const button of this.elements.speedButtons) button.addEventListener('click', () => game.setGameSpeed(Number(button.dataset.speed)));
    this.elements.pauseButton.addEventListener('click', () => game.togglePause());
    this.elements.soundButton.addEventListener('click', () => game.toggleSound());
    this.elements.settingsButton.addEventListener('click', () => this.openSettings(game, this.elements.settingsButton));
    this.elements.menuPlayButton.addEventListener('click', () => game.beginCampaign());
    this.elements.menuSettingsButton.addEventListener('click', () => this.openSettings(game, this.elements.menuSettingsButton));
    this.elements.settingsCloseButton.addEventListener('click', () => this.closeSettings(game));
    this.elements.settingsDoneButton.addEventListener('click', () => this.closeSettings(game));
    this.elements.masterVolume.addEventListener('input', () => {
      const value = Number(this.elements.masterVolume.value);
      game.audio.setMasterVolume(value / 100);
      this.elements.masterVolumeValue.textContent = `${value}%`;
    });
    this.elements.sfxVolume.addEventListener('input', () => {
      const value = Number(this.elements.sfxVolume.value);
      game.audio.setSfxVolume(value / 100);
      this.elements.sfxVolumeValue.textContent = `${value}%`;
    });
    this.elements.reducedMotion.addEventListener('change', () => game.setReducedMotion(this.elements.reducedMotion.checked));
    this.elements.damageNumbers.addEventListener('change', () => game.setDamageNumbers(this.elements.damageNumbers.checked));
    this.elements.upgradeButton.addEventListener('click', () => game.upgradeSelectedTower());
    this.elements.sellButton.addEventListener('click', () => game.sellSelectedTower());
    this.elements.overlayPrimary.addEventListener('click', () => {
      if (game.state === GAME_STATES.PAUSED) game.togglePause();
      else if (game.isTerminal) game.resetRun();
    });
    this.elements.overlaySecondary.addEventListener('click', () => {
      if (game.state === GAME_STATES.PAUSED) game.resetRun();
      else if (game.isTerminal) game.returnToMenu();
    });

    window.addEventListener('keydown', (event) => {
      if (!this.settingsOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.closeSettings(game);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...this.elements.settingsOverlay.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }, { capture: true });

    this.elements.reducedMotion.checked = game.settings.reducedMotion;
    this.elements.damageNumbers.checked = game.settings.damageNumbers;
    this.elements.masterVolume.value = String(Math.round(game.audio.masterVolume * 100));
    this.elements.sfxVolume.value = String(Math.round(game.audio.sfxVolume * 100));
    this.elements.masterVolumeValue.textContent = `${this.elements.masterVolume.value}%`;
    this.elements.sfxVolumeValue.textContent = `${this.elements.sfxVolume.value}%`;
  }

  openSettings(game, trigger = null) {
    if (this.settingsOpen) return;
    this.settingsOpen = true;
    this.settingsReturnFocus = trigger ?? document.activeElement;
    game.openSettings();
    this.elements.settingsOverlay.hidden = false;
    requestAnimationFrame(() => this.elements.settingsCloseButton.focus({ preventScroll: true }));
  }

  closeSettings(game) {
    if (!this.settingsOpen) return;
    this.settingsOpen = false;
    this.elements.settingsOverlay.hidden = true;
    game.closeSettings();
    const target = this.settingsReturnFocus;
    this.settingsReturnFocus = null;
    if (target?.focus) requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }

  update(game) {
    const { elements } = this;
    elements.baseText.textContent = `${Math.ceil(game.map.outpost.hp)} / ${game.map.outpost.maxHp}`;
    elements.moneyText.textContent = formatMoney(game.economy.money);
    const waveNumber = game.wave.active ? game.wave.activeConfig.number : game.wave.currentWave;
    elements.waveText.textContent = `${waveNumber} / 20`;

    this.updateShop(game);
    this.updatePhase(game);
    this.updateInspector(game);
    this.updateSpeed(game);
    this.updateSound(game);
    this.updateStateOverlay(game);
    this.updateMenu(game);

    elements.gameStage.classList.toggle('is-placing', Boolean(game.placementType && game.isInteractive));
    elements.gameStage.classList.toggle('is-final-wave', game.state === GAME_STATES.WAVE_ACTIVE && game.wave.activeConfig?.number === 20);
    elements.gameStage.classList.toggle('is-menu', game.state === GAME_STATES.MENU);

    if (game.state === GAME_STATES.MENU) {
      elements.dockTitle.textContent = 'Campaign ready';
      elements.dockHint.textContent = 'Press PLAY to begin a clean 20-wave run.';
    } else if (game.state === GAME_STATES.PAUSED) {
      elements.dockTitle.textContent = 'Simulation paused';
      elements.dockHint.textContent = `Combat is frozen. Resume to continue at ${game.gameSpeed}x.`;
    } else if (game.isTerminal) {
      elements.dockTitle.textContent = game.state === GAME_STATES.VICTORY ? 'Outpost secured' : 'Defense ended';
      elements.dockHint.textContent = 'Start a clean run from the result screen.';
    } else if (game.placementType) {
      const definition = TOWER_TYPES[game.placementType];
      elements.dockTitle.textContent = `${definition.name} selected`;
      elements.dockHint.textContent = game.economy.canAfford(definition.cost)
        ? 'Move over the map to preview range and placement. Click to build.'
        : `You need ${formatMoney(definition.cost)} to place this defense.`;
    } else if (game.selectedTower) {
      elements.dockTitle.textContent = `${game.selectedTower.definition.name} · Level ${game.selectedTower.level}`;
      elements.dockHint.textContent = 'Upgrade, sell, or click another defense. Click empty ground to close the panel.';
    } else {
      elements.dockTitle.textContent = 'Select a tower';
      elements.dockHint.textContent = 'Choose a defense, then place it on valid grass. Right click cancels placement · ESC pauses.';
    }
  }

  updateMenu(game) {
    const visible = game.state === GAME_STATES.MENU;
    this.elements.menuOverlay.hidden = !visible;
    const modalBlocking = visible || this.settingsOpen || game.state === GAME_STATES.PAUSED || game.isTerminal;
    this.elements.topbar.inert = modalBlocking;
    this.elements.towerDock.inert = modalBlocking;
    this.elements.menuOverlay.inert = this.settingsOpen;
    this.elements.stateOverlay.inert = this.settingsOpen;
    if (visible && !this.settingsOpen && !this.elements.menuOverlay.contains(document.activeElement)) {
      requestAnimationFrame(() => this.elements.menuPlayButton.focus({ preventScroll: true }));
    }
  }

  updateShop(game) {
    const locked = !game.isInteractive;
    for (const card of this.elements.towerCards) {
      const type = card.dataset.tower;
      const definition = TOWER_TYPES[type];
      const placing = game.placementType === type;
      const affordable = game.economy.canAfford(definition.cost);
      card.classList.toggle('is-selected', placing);
      card.classList.toggle('is-unaffordable', !affordable && !placing);
      card.setAttribute('aria-pressed', String(placing));
      card.setAttribute('aria-disabled', String(!affordable || locked));
      card.disabled = locked;
    }
  }

  updatePhase(game) {
    const { elements } = this;
    if (game.state === GAME_STATES.MENU) {
      elements.phaseLabel.textContent = 'CAMPAIGN READY';
      elements.phaseHint.textContent = '20 waves · choose PLAY to begin';
      elements.startWaveButton.disabled = true;
      elements.startWaveButton.textContent = 'START FROM MENU';
      return;
    }
    if (game.state === GAME_STATES.VICTORY) {
      elements.phaseLabel.textContent = 'OUTPOST SECURED';
      elements.phaseHint.textContent = '20 WAVES SURVIVED';
      elements.startWaveButton.disabled = false;
      elements.startWaveButton.textContent = 'PLAY AGAIN';
      return;
    }

    if (game.state === GAME_STATES.GAME_OVER) {
      elements.phaseLabel.textContent = 'OUTPOST LOST';
      elements.phaseHint.textContent = `Defense failed during Wave ${game.getResultStats().waveReached}.`;
      elements.startWaveButton.disabled = false;
      elements.startWaveButton.textContent = 'TRY AGAIN';
      return;
    }

    if (game.state === GAME_STATES.PAUSED) {
      elements.phaseLabel.textContent = 'PAUSED';
      elements.phaseHint.textContent = `Simulation stopped · resume at ${game.gameSpeed}x`;
      elements.startWaveButton.disabled = true;
      elements.startWaveButton.textContent = 'PAUSED';
      return;
    }

    if (game.state === GAME_STATES.WAVE_ACTIVE) {
      const config = game.wave.activeConfig;
      const remaining = game.enemies.reduce((count, enemy) => count + (enemy.alive && enemy.active !== false ? 1 : 0), 0);
      const queued = Math.max(0, game.wave.schedule.length - game.wave.spawnIndex);
      elements.phaseLabel.textContent = config.number === 20 ? 'FINAL WAVE · 20 / 20' : `WAVE ${String(config.number).padStart(2, '0')} / 20`;
      elements.phaseHint.textContent = `${config.label} · ENEMIES ${remaining + queued}`;
      elements.startWaveButton.disabled = true;
      elements.startWaveButton.textContent = config.number === 20 ? 'FINAL ASSAULT' : 'WAVE ACTIVE';
      return;
    }

    const next = WAVE_CONFIGS[game.wave.currentWave];
    const seconds = Math.max(0, Math.ceil(game.preparationRemaining));
    elements.phaseLabel.textContent = 'PREPARATION';
    elements.phaseHint.textContent = `NEXT WAVE ${String(seconds).padStart(2, '0')}s · Wave ${next.number} · ${next.label}`;
    elements.startWaveButton.disabled = false;
    elements.startWaveButton.textContent = next.number === 20 ? 'START FINAL WAVE' : `START WAVE ${next.number}`;
  }

  updateSpeed(game) {
    const locked = !game.isInteractive;
    for (const button of this.elements.speedButtons) {
      const active = Number(button.dataset.speed) === game.gameSpeed;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = locked;
    }
    this.elements.pauseButton.disabled = game.isTerminal || game.state === GAME_STATES.MENU;
    this.elements.pauseButton.textContent = game.state === GAME_STATES.PAUSED ? 'RESUME' : 'PAUSE';
    this.elements.pauseButton.setAttribute('aria-pressed', String(game.state === GAME_STATES.PAUSED));
  }

  updateSound(game) {
    const enabled = game.audio.enabled;
    this.elements.soundButton.textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
    this.elements.soundButton.classList.toggle('is-muted', !enabled);
    this.elements.soundButton.setAttribute('aria-pressed', String(enabled));
  }

  updateInspector(game) {
    const tower = game.selectedTower;
    const { elements } = this;
    const visible = Boolean(game.isInteractive && tower && game.towers.includes(tower));
    elements.inspector.hidden = !visible;
    elements.inspector.classList.toggle('is-visible', visible);
    if (!visible) return;

    elements.inspectorName.textContent = tower.definition.name.toUpperCase();
    elements.inspectorLevel.textContent = `LEVEL ${tower.level}`;
    elements.inspectorDamage.textContent = String(tower.damage);
    elements.inspectorRange.textContent = String(tower.range);
    elements.inspectorRate.textContent = `${tower.fireInterval.toFixed(2)}s`;
    setTarget(elements.targetGround, tower.canTargetGround);
    setTarget(elements.targetFlying, tower.canTargetFlying);
    setTarget(elements.targetInvisible, tower.hasDetection);
    if (tower.revealRange > 0) {
      elements.inspectorSupport.hidden = false;
      elements.inspectorSupport.textContent = `REVEAL ${tower.revealRange} · Cloak bypass for compatible target types`;
    } else if (tower.canTargetFlying && tower.hasDetection) {
      elements.inspectorSupport.hidden = false;
      elements.inspectorSupport.textContent = 'CLOAKED AIR READY · Anti-Air + Detection';
    } else if (tower.canTargetFlying) {
      elements.inspectorSupport.hidden = false;
      elements.inspectorSupport.textContent = 'CLOAKED AIR · Requires Reveal';
    } else if (tower.hasDetection) {
      elements.inspectorSupport.hidden = false;
      elements.inspectorSupport.textContent = 'DETECTION ACTIVE · No Anti-Air';
    } else {
      elements.inspectorSupport.hidden = true;
    }

    const preview = getUpgradePreview(tower);
    if (!preview) {
      elements.upgradePreview.hidden = true;
      elements.upgradeButton.disabled = true;
      elements.upgradeButton.classList.remove('is-unaffordable');
      elements.upgradeButton.textContent = 'MAX LEVEL';
    } else {
      elements.upgradePreview.hidden = false;
      elements.upgradeDamage.textContent = `${preview.damage[0]} → ${preview.damage[1]}`;
      elements.upgradeRange.textContent = `${preview.range[0]} → ${preview.range[1]}`;
      elements.upgradeRate.textContent = `${preview.fireInterval[0].toFixed(2)}s → ${preview.fireInterval[1].toFixed(2)}s`;
      elements.upgradeAbility.hidden = !preview.unlock;
      if (preview.unlock) elements.upgradeAbilityName.textContent = preview.unlock;
      const affordable = game.economy.canAfford(preview.cost);
      elements.upgradeButton.disabled = !affordable;
      elements.upgradeButton.classList.toggle('is-unaffordable', !affordable);
      elements.upgradeButton.textContent = `UPGRADE ${formatMoney(preview.cost)}`;
    }

    elements.sellButton.textContent = `SELL +${formatMoney(tower.sellValue)}`;
    elements.investedText.textContent = `Invested ${formatMoney(tower.totalInvested)} · refund 70%`;
  }

  updateStateOverlay(game) {
    const { elements } = this;
    const visible = game.state === GAME_STATES.PAUSED || game.isTerminal;
    elements.stateOverlay.hidden = !visible;
    elements.stateOverlay.classList.toggle('is-visible', visible);
    elements.stateOverlay.classList.toggle('is-victory', game.state === GAME_STATES.VICTORY);
    elements.stateOverlay.classList.toggle('is-game-over', game.state === GAME_STATES.GAME_OVER);
    if (!visible) {
      this.lastOverlayState = null;
      return;
    }

    if (game.state === GAME_STATES.PAUSED) {
      elements.overlayKicker.textContent = 'SIMULATION 0x';
      elements.overlayTitle.textContent = 'PAUSED';
      elements.overlaySubtitle.textContent = `Your ${game.gameSpeed}x speed selection will resume unchanged.`;
      elements.overlayStats.hidden = true;
      elements.overlayPrimary.textContent = 'CONTINUE';
      elements.overlaySecondary.hidden = false;
      elements.overlaySecondary.textContent = 'RESTART RUN';
    } else {
      const result = game.getResultStats();
      const victory = game.state === GAME_STATES.VICTORY;
      elements.overlayKicker.textContent = victory ? '20 WAVES SURVIVED' : `WAVE ${result.waveReached} REACHED`;
      elements.overlayTitle.textContent = victory ? 'OUTPOST 17 SECURED' : 'OUTPOST LOST';
      elements.overlaySubtitle.textContent = victory
        ? `The final assault is over. ${result.hp} HP remains at Outpost 17.`
        : 'The defense line was breached. Review the run and try a different investment plan.';
      elements.overlayStats.hidden = false;
      elements.resultWave.textContent = victory ? `${result.wavesCompleted} / 20` : String(result.waveReached);
      elements.resultKills.textContent = String(result.kills);
      elements.resultHp.textContent = `${result.hp} / ${game.map.outpost.maxHp}`;
      elements.resultEarned.textContent = formatMoney(result.moneyEarned);
      elements.resultSpent.textContent = formatMoney(result.moneySpent);
      elements.resultTowers.textContent = String(result.towersBuilt);
      elements.resultUpgrades.textContent = String(result.upgrades);
      elements.overlayPrimary.textContent = victory ? 'PLAY AGAIN' : 'TRY AGAIN';
      elements.overlaySecondary.hidden = false;
      elements.overlaySecondary.textContent = 'MAIN MENU';
    }

    if (this.lastOverlayState !== game.state && !this.settingsOpen) {
      this.lastOverlayState = game.state;
      requestAnimationFrame(() => elements.overlayPrimary.focus({ preventScroll: true }));
    }
  }

  toast(message, type = 'normal') {
    const toast = document.createElement('div');
    const modifier = type === 'danger' ? 'toast--danger'
      : type === 'money' ? 'toast--money'
      : type === 'air' ? 'toast--air'
      : type === 'cloak' ? 'toast--cloak'
      : type === 'phantom' ? 'toast--phantom'
      : type === 'speed' ? 'toast--speed'
      : type === 'final' ? 'toast--final'
      : type === 'victory' ? 'toast--victory'
      : '';
    toast.className = `toast ${modifier}`.trim();
    toast.textContent = message;
    this.elements.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), ['air','cloak','phantom','final','victory'].includes(type) ? 3200 : 1800);
  }

  clearToasts() {
    this.elements.toastRegion.replaceChildren();
  }
}

function setTarget(element, enabled) {
  element.textContent = enabled ? '✓' : '✕';
  element.classList.toggle('is-yes', enabled);
  element.classList.toggle('is-no', !enabled);
}


// game.js
const STARTING_MONEY = 800;
const PREPARATION_SECONDS = 15;
const GAME_SPEEDS = Object.freeze([1, 2]);
const GAME_STATES = Object.freeze({
  MENU: 'MENU',
  PREPARATION: 'PREPARATION',
  WAVE_ACTIVE: 'WAVE_ACTIVE',
  PAUSED: 'PAUSED',
  VICTORY: 'VICTORY',
  GAME_OVER: 'GAME_OVER'
});
const getSimulationDelta = (rawDt, speed) => Math.min(rawDt, .05) * speed;

const freshStats = () => ({ towersBuilt: 0, upgrades: 0, towersSold: 0, kills: 0, waveReached: 0 });

class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.map = new ForestMap(canvas.width, canvas.height);
    this.economy = new Economy(STARTING_MONEY);
    this.audio = new AudioManager();
    this.effects = new Effects();
    this.settings = {
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
      damageNumbers: true
    };
    this.effects.reducedMotion = this.settings.reducedMotion;
    this.effects.showDamageNumbers = this.settings.damageNumbers;
    this.input = new InputController(canvas);
    this.wave = new WaveController(this.map.path);
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.placementType = null;
    this.preview = null;
    this.selectedTower = null;
    this.lastTime = 0;
    this.running = false;
    this.stats = freshStats();
    this.preparationRemaining = PREPARATION_SECONDS;
    this.cloakedWarningShown = false;
    this.phantomWarningShown = false;
    this.gameSpeed = 1;
    this.state = GAME_STATES.MENU;
    this.pausedFrom = null;
    this.settingsReturnState = null;
    this.settingsOpen = false;

    this.input.onPrimary = (point) => this.handleCanvasClick(point);
    this.input.onCancel = () => this.cancelPlacement();
    this.input.onEscape = () => this.togglePause();
    this.ui.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  loop(time) {
    if (!this.running) return;
    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const simulationDt = this.state === GAME_STATES.PAUSED ? 0 : getSimulationDelta(rawDt, this.gameSpeed);

    this.update(simulationDt);
    this.draw();
    this.ui.update(this);
    requestAnimationFrame((next) => this.loop(next));
  }

  get isTerminal() {
    return this.state === GAME_STATES.VICTORY || this.state === GAME_STATES.GAME_OVER;
  }

  get isInteractive() {
    return this.state === GAME_STATES.PREPARATION || this.state === GAME_STATES.WAVE_ACTIVE;
  }

  update(dt) {
    if (this.state === GAME_STATES.MENU || this.state === GAME_STATES.PAUSED || this.isTerminal) return;

    this.map.update(dt);
    this.effects.update(dt);
    this.updatePreview();

    if (this.state === GAME_STATES.PREPARATION) {
      this.preparationRemaining = Math.max(0, this.preparationRemaining - dt);
      if (this.preparationRemaining <= 0) this.startNextWave();
    }

    if (this.state !== GAME_STATES.WAVE_ACTIVE) return;

    this.wave.update(dt, this.enemies);

    for (const enemy of this.enemies) {
      const wasAlive = enemy.alive;
      enemy.update(dt);
      if (wasAlive && enemy.reachedEnd) {
        this.map.outpost.damage(enemy.baseDamage);
        this.audio.baseHit();
        this.effects.burst(this.map.outpost.x - 50, this.map.outpost.y, '#dc6d5a', 11);
        this.ui.toast(`OUTPOST HIT · -${enemy.baseDamage} HP`, 'danger');
        if (this.map.outpost.hp <= 0) {
          this.enterGameOver();
          return;
        }
      }
    }

    updateRevealState(this.enemies, this.towers);
    for (const tower of this.towers) {
      if (tower.update(dt, this.enemies, this.projectiles)) this.audio.towerShot(tower.type);
    }

    for (const projectile of this.projectiles) {
      const result = projectile.update(dt);
      if (!result?.hit) continue;
      this.audio.impact(result.killed);
      this.effects.burst(result.x, result.y, '#f6d26c', result.killed ? 9 : 4);
      this.effects.damage(result.x, result.y - 8, result.damage ?? projectile.damage);
      if (result.killed) {
        this.stats.kills += 1;
        this.economy.earn(result.target.reward);
        this.effects.money(result.x, result.y - 8, result.target.reward);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      if (!this.projectiles[i].alive) this.projectiles.splice(i, 1);
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      if (!this.enemies[i].alive) this.enemies.splice(i, 1);
    }

    const cleared = this.wave.evaluate(this.enemies);
    if (!cleared) return;

    this.economy.earn(cleared.clearBonus);
    this.audio.waveClear();
    this.ui.toast(`WAVE ${cleared.number} CLEARED · +$${cleared.clearBonus}`, 'money');
    this.preparationRemaining = PREPARATION_SECONDS;

    if (cleared.number >= 20) {
      this.enterVictory();
      return;
    }

    this.state = GAME_STATES.PREPARATION;
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.map.draw(ctx);

    if (this.selectedTower && !this.isTerminal) drawSelectedTowerRange(ctx, this.selectedTower);
    for (const tower of this.towers) tower.draw(ctx);
    for (const enemy of this.enemies) {
      enemy.reducedMotion = this.settings.reducedMotion;
      enemy.draw(ctx);
    }
    for (const projectile of this.projectiles) projectile.draw(ctx);
    this.effects.draw(ctx);

    if (this.isInteractive && this.placementType && this.preview && this.input.mouse.inside) {
      drawTowerPreview(ctx, this.placementType, this.preview.x, this.preview.y, this.preview.validation);
    }
  }

  togglePlacement(type) {
    if (!this.isInteractive) return false;
    const definition = TOWER_TYPES[type];
    if (!definition) return false;
    if (this.placementType === type) {
      this.cancelPlacement();
      return true;
    }
    if (!this.economy.canAfford(definition.cost)) {
      this.audio.error();
      this.ui.toast('NOT ENOUGH MONEY', 'danger');
      return false;
    }
    this.placementType = type;
    this.selectedTower = null;
    this.updatePreview();
    return true;
  }

  cancelPlacement() {
    this.placementType = null;
    this.preview = null;
  }

  updatePreview() {
    if (!this.isInteractive || !this.placementType || !this.input.mouse.inside) {
      this.preview = null;
      return;
    }
    const x = this.input.mouse.x;
    const y = this.input.mouse.y;
    this.preview = {
      x,
      y,
      validation: validatePlacement(this.placementType, x, y, this.map, this.towers)
    };
  }

  handleCanvasClick(point) {
    if (!this.isInteractive || !point.inside) return;

    if (this.placementType) {
      this.placeTower(this.placementType, point.x, point.y);
      return;
    }

    this.selectedTower = this.findTowerAt(point.x, point.y);
  }

  placeTower(type, x, y) {
    if (!this.isInteractive) return false;
    const definition = TOWER_TYPES[type];
    if (!definition) return false;
    const validation = validatePlacement(type, x, y, this.map, this.towers);
    if (!validation.valid) {
      this.audio.error();
      this.ui.toast(validation.reason, 'danger');
      return false;
    }
    if (!this.economy.spend(definition.cost)) {
      this.audio.error();
      this.ui.toast('NOT ENOUGH MONEY', 'danger');
      this.cancelPlacement();
      return false;
    }

    const tower = createTower(type, x, y);
    this.towers.push(tower);
    this.stats.towersBuilt += 1;
    this.selectedTower = tower;
    this.audio.placement();
    this.effects.burst(x, y, '#eff0b4', 12);
    this.ui.toast(`${definition.name.toUpperCase()} DEPLOYED · -$${definition.cost}`);

    if (!this.economy.canAfford(definition.cost)) this.cancelPlacement();
    return true;
  }

  upgradeSelectedTower() {
    if (!this.isInteractive) return false;
    const tower = this.selectedTower;
    if (!tower || tower.isMaxLevel) return false;
    const cost = tower.nextUpgradeCost;
    const unlock = tower.nextStats?.unlock ?? null;
    if (!this.economy.spend(cost)) {
      this.audio.error();
      this.ui.toast('NOT ENOUGH MONEY FOR UPGRADE', 'danger');
      return false;
    }
    tower.upgrade();
    this.stats.upgrades += 1;
    this.audio.upgrade();
    this.effects.burst(tower.x, tower.y, '#dcefa8', 16);
    this.ui.toast(`${tower.definition.name.toUpperCase()} · LEVEL ${tower.level}`, 'money');
    if (unlock) this.ui.toast(`NEW ABILITY · ${unlock}`, unlock.includes('AIR') ? 'air' : 'money');
    return true;
  }

  sellSelectedTower() {
    if (!this.isInteractive) return false;
    const tower = this.selectedTower;
    if (!tower) return false;
    const index = this.towers.indexOf(tower);
    if (index < 0) {
      this.selectedTower = null;
      return false;
    }
    const refund = tower.sellValue;
    tower.target = null;
    this.towers.splice(index, 1);
    this.economy.refund(refund);
    this.stats.towersSold += 1;
    this.audio.sell();
    this.effects.burst(tower.x, tower.y, '#d8d0a9', 10);
    this.ui.toast(`${tower.definition.name.toUpperCase()} SOLD · +$${refund}`, 'money');
    this.selectedTower = null;
    return true;
  }

  findTowerAt(x, y) {
    for (let i = this.towers.length - 1; i >= 0; i -= 1) {
      const tower = this.towers[i];
      const dx = tower.x - x;
      const dy = tower.y - y;
      if (dx * dx + dy * dy <= (tower.radius + 8) ** 2) return tower;
    }
    return null;
  }

  startNextWave() {
    if (this.state !== GAME_STATES.PREPARATION || this.wave.active || this.wave.phaseComplete) return false;
    this.cancelPlacement();
    const config = this.wave.start();
    if (!config) return false;
    this.state = GAME_STATES.WAVE_ACTIVE;
    this.stats.waveReached = Math.max(this.stats.waveReached, config.number);
    this.preparationRemaining = PREPARATION_SECONDS;

    this.audio.waveStart(config.number === 20);

    if (config.number === 20) {
      this.ui.toast('FINAL WAVE · FINAL ASSAULT', 'final');
    } else {
      this.ui.toast(`WAVE ${config.number} · ${config.label}`);
    }
    if (config.number === 5) this.ui.toast('AIR ENEMY DETECTED · Some defenses cannot target Flying.', 'air');
    if (config.number === 8 && !this.cloakedWarningShown) {
      this.cloakedWarningShown = true;
      this.ui.toast('CLOAKED ENEMY DETECTED · Invisible enemies require Detection or Reveal.', 'cloak');
    }
    if (config.number === 15 && !this.phantomWarningShown) {
      this.phantomWarningShown = true;
      this.ui.toast('PHANTOM DETECTED · Cloaked air requires Anti-Air + Detection or Reveal.', 'phantom');
    }
    return true;
  }

  setGameSpeed(speed) {
    if (!this.isInteractive || !GAME_SPEEDS.includes(speed)) return false;
    if (this.gameSpeed === speed) return true;
    this.gameSpeed = speed;
    this.audio.speed();
    this.ui.toast(`SIMULATION SPEED · ${speed}x`, 'speed');
    return true;
  }

  togglePause() {
    if (this.settingsOpen || this.isTerminal) return false;
    if (this.state === GAME_STATES.PAUSED) {
      this.state = this.pausedFrom ?? GAME_STATES.PREPARATION;
      this.pausedFrom = null;
      this.audio.pause(false);
      return true;
    }
    if (!this.isInteractive) return false;
    this.pausedFrom = this.state;
    this.state = GAME_STATES.PAUSED;
    this.audio.pause(true);
    return true;
  }

  openSettings() {
    this.settingsOpen = true;
    if (this.settingsReturnState) return true;
    if (this.isInteractive) {
      this.settingsReturnState = this.state;
      this.state = GAME_STATES.PAUSED;
    }
    return true;
  }

  closeSettings() {
    if (this.settingsReturnState) {
      this.state = this.settingsReturnState;
      this.settingsReturnState = null;
    }
    queueMicrotask(() => { this.settingsOpen = false; });
    return true;
  }

  setReducedMotion(enabled) {
    this.settings.reducedMotion = Boolean(enabled);
    this.effects.reducedMotion = this.settings.reducedMotion;
    document.documentElement.classList.toggle('reduce-motion', this.settings.reducedMotion);
    return this.settings.reducedMotion;
  }

  setDamageNumbers(enabled) {
    this.settings.damageNumbers = Boolean(enabled);
    this.effects.showDamageNumbers = this.settings.damageNumbers;
    return this.settings.damageNumbers;
  }

  beginCampaign() {
    this.resetRun({ silent: true });
    this.state = GAME_STATES.PREPARATION;
    this.audio.confirm();
    this.ui.clearToasts();
    this.ui.toast('OUTPOST ONLINE · PREPARE DEFENSES', 'money');
    return true;
  }

  returnToMenu() {
    this.resetRun({ silent: true });
    this.state = GAME_STATES.MENU;
    this.settingsReturnState = null;
    this.settingsOpen = false;
    this.ui.clearToasts();
    return true;
  }

  toggleSound() {
    const enabled = this.audio.toggle();
    this.ui.toast(enabled ? 'SOUND ON' : 'SOUND OFF', 'speed');
    return enabled;
  }

  primaryAction() {
    if (this.state === GAME_STATES.MENU) return this.beginCampaign();
    if (this.isTerminal) {
      this.resetRun();
      return true;
    }
    if (this.state === GAME_STATES.PAUSED) return this.togglePause();
    return this.startNextWave();
  }

  enterVictory() {
    if (this.isTerminal) return false;
    this.state = GAME_STATES.VICTORY;
    this.pausedFrom = null;
    this.settingsReturnState = null;
    this.cancelPlacement();
    this.selectedTower = null;
    this.audio.victory();
    this.ui.toast('OUTPOST 17 SECURED · 20 WAVES SURVIVED', 'victory');
    return true;
  }

  enterGameOver() {
    if (this.isTerminal) return false;
    this.stats.waveReached = Math.max(this.stats.waveReached, this.wave.activeConfig?.number ?? this.wave.currentWave);
    this.state = GAME_STATES.GAME_OVER;
    this.pausedFrom = null;
    this.settingsReturnState = null;
    this.cancelPlacement();
    this.selectedTower = null;
    this.audio.gameOver();
    this.ui.toast('OUTPOST LOST', 'danger');
    return true;
  }

  getResultStats() {
    return {
      wavesCompleted: this.wave.currentWave,
      waveReached: Math.max(this.stats.waveReached, this.wave.currentWave),
      kills: this.stats.kills,
      hp: Math.ceil(this.map.outpost.hp),
      moneyEarned: this.economy.totalEarned,
      moneySpent: this.economy.totalSpent,
      moneyRemaining: this.economy.money,
      towersBuilt: this.stats.towersBuilt,
      upgrades: this.stats.upgrades,
      towersSold: this.stats.towersSold
    };
  }

  resetRun({ silent = false } = {}) {
    this.economy = new Economy(STARTING_MONEY);
    this.wave.reset();
    this.map.outpost.hp = this.map.outpost.maxHp;
    this.map.outpost.hitFlash = 0;
    this.towers.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.effects.particles.length = 0;
    this.effects.floatingText.length = 0;
    this.placementType = null;
    this.preview = null;
    this.selectedTower = null;
    this.stats = freshStats();
    this.preparationRemaining = PREPARATION_SECONDS;
    this.cloakedWarningShown = false;
    this.phantomWarningShown = false;
    this.gameSpeed = 1;
    this.state = GAME_STATES.PREPARATION;
    this.pausedFrom = null;
    this.settingsReturnState = null;
    this.settingsOpen = false;
    this.ui.clearToasts();
    if (!silent) this.ui.toast('RUN RESET · PREPARATION', 'money');
  }
}


// main.js
const DESKTOP_QUERY = '(min-width: 900px)';
const desktopMedia = window.matchMedia(DESKTOP_QUERY);
let game = null;

function startDesktopGame() {
  if (game || !desktopMedia.matches) return;
  const canvas = document.querySelector('#gameCanvas');
  const ui = new GameUI();
  game = new Game(canvas, ui);
  game.setReducedMotion(game.settings.reducedMotion);
  game.start();
}

startDesktopGame();
desktopMedia.addEventListener('change', startDesktopGame);


})();
