import { PathRoute } from './path.js';
import { distanceSq, drawRoundedRect, seededRandom } from './utils.js';

const GRASS_COLORS = ['#78b861', '#72af5b', '#82bd68', '#6eaa58'];
const FLOWER_COLORS = ['#f4d76c', '#f49f80', '#f7f0d2', '#a9d2ee'];

export class Outpost {
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

export class ForestMap {
  constructor(width = 1600, height = 900) {
    this.width = width;
    this.height = height;
    this.path = new PathRoute();
    this.outpost = new Outpost(1520, 335);
    this.decorations = [];
    this.blockers = [];
    this.buildDecoration();
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

    this.decorations = items;
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
    ctx.save();
    ctx.fillStyle = '#78b861';
    ctx.fillRect(0, 0, this.width, this.height);

    const tile = 80;
    for (let y = 0; y < this.height; y += tile) {
      for (let x = 0; x < this.width; x += tile) {
        const index = ((x / tile) + (y / tile) * 3) % GRASS_COLORS.length;
        ctx.globalAlpha = .18;
        ctx.fillStyle = GRASS_COLORS[index];
        ctx.fillRect(x, y, tile, tile);
      }
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

    this.outpost.draw(ctx);
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
