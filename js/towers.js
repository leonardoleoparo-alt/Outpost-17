import { circlesOverlap } from './utils.js';
import { findFirstTarget } from './targeting.js';
import { Projectile } from './projectile.js';

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

export const TOWER_TYPES = Object.freeze({
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

export class Tower {
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
    this.scanAngle = (this.scanAngle + dt * 1.8) % (Math.PI * 2);
    const target = findFirstTarget(this, enemies);
    this.target = target;
    if (!target) {
      this.cooldown = Math.max(0, this.cooldown);
      return;
    }

    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.cooldown <= 0) {
      const muzzle = getMuzzleDistance(this.type);
      const muzzleX = this.x + Math.cos(this.angle) * muzzle;
      const muzzleY = this.y + Math.sin(this.angle) * muzzle;
      projectiles.push(new Projectile(muzzleX, muzzleY, target, this.damage, this.definition.projectile));
      // Preserve fractional cooldown overshoot so 1x and 2x remain mechanically equivalent.
      this.cooldown += this.fireInterval;
      if (this.cooldown <= 0) this.cooldown = this.fireInterval;
    }
  }

  draw(ctx) {
    drawTower(ctx, this, 1);
  }
}

export function createTower(type, x, y) {
  return new Tower(type, x, y);
}

export function validatePlacement(type, x, y, map, towers) {
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

export function drawTowerPreview(ctx, type, x, y, validation) {
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

export function drawSelectedTowerRange(ctx, tower) {
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

export function getUpgradePreview(tower) {
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
