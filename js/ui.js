import { formatMoney } from './utils.js';
import { getUpgradePreview, TOWER_TYPES } from './towers.js';
import { WAVE_CONFIGS } from './waves.js';
import { GAME_STATES } from './game.js';

export class GameUI {
  constructor() {
    this.lastOverlayState = null;
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
    this.elements.upgradeButton.addEventListener('click', () => game.upgradeSelectedTower());
    this.elements.sellButton.addEventListener('click', () => game.sellSelectedTower());
    this.elements.overlayPrimary.addEventListener('click', () => {
      if (game.state === GAME_STATES.PAUSED) game.togglePause();
      else if (game.isTerminal) game.resetRun();
    });
    this.elements.overlaySecondary.addEventListener('click', () => game.resetRun());
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

    elements.gameStage.classList.toggle('is-placing', Boolean(game.placementType && game.isInteractive));
    elements.gameStage.classList.toggle('is-final-wave', game.state === GAME_STATES.WAVE_ACTIVE && game.wave.activeConfig?.number === 20);

    if (game.state === GAME_STATES.PAUSED) {
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
    this.elements.pauseButton.disabled = game.isTerminal;
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
    elements.inspector.classList.toggle('is-visible', visible);
    elements.inspector.setAttribute('aria-hidden', String(!visible));
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
    elements.stateOverlay.classList.toggle('is-visible', visible);
    elements.stateOverlay.setAttribute('aria-hidden', String(!visible));
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
      elements.overlaySecondary.hidden = true;
    }

    if (this.lastOverlayState !== game.state) {
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
