import { AudioManager } from './audio.js';
import { Economy } from './economy.js';
import { Effects } from './effects.js';
import { ForestMap } from './map.js';
import { InputController } from './input.js';
import { updateRevealState } from './targeting.js';
import {
  createTower,
  drawSelectedTowerRange,
  drawTowerPreview,
  TOWER_TYPES,
  validatePlacement
} from './towers.js';
import { WaveController } from './waves.js';

export const STARTING_MONEY = 800;
export const PREPARATION_SECONDS = 15;
export const GAME_SPEEDS = Object.freeze([1, 2]);
export const GAME_STATES = Object.freeze({
  PREPARATION: 'PREPARATION',
  WAVE_ACTIVE: 'WAVE_ACTIVE',
  PAUSED: 'PAUSED',
  VICTORY: 'VICTORY',
  GAME_OVER: 'GAME_OVER'
});
export const getSimulationDelta = (rawDt, speed) => Math.min(rawDt, .05) * speed;

const freshStats = () => ({ towersBuilt: 0, upgrades: 0, towersSold: 0, kills: 0, waveReached: 0 });

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.map = new ForestMap(canvas.width, canvas.height);
    this.economy = new Economy(STARTING_MONEY);
    this.audio = new AudioManager();
    this.effects = new Effects();
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
    this.state = GAME_STATES.PREPARATION;
    this.pausedFrom = null;

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
    if (this.state === GAME_STATES.PAUSED || this.isTerminal) return;

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
    for (const enemy of this.enemies) enemy.draw(ctx);
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
    if (this.isTerminal) return false;
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

  toggleSound() {
    const enabled = this.audio.toggle();
    this.ui.toast(enabled ? 'SOUND ON' : 'SOUND OFF', 'speed');
    return enabled;
  }

  primaryAction() {
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

  resetRun() {
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
    this.ui.clearToasts();
    this.ui.toast('RUN RESET · PREPARATION', 'money');
  }
}
