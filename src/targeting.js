import { distanceSq } from './utils.js';

export function canTowerTarget(tower, enemy) {
  if (!enemy?.alive || enemy.active === false) return false;
  if (enemy.isFlying && !tower.canTargetFlying) return false;
  if (!enemy.isFlying && !tower.canTargetGround) return false;
  if (enemy.isInvisible && !(tower.hasDetection || enemy.isRevealed)) return false;
  return true;
}

export function findFirstTarget(tower, enemies) {
  const rangeSq = tower.range * tower.range;
  let best = null;
  for (const enemy of enemies) {
    if (!canTowerTarget(tower, enemy)) continue;
    if (distanceSq(tower.x, tower.y, enemy.x, enemy.y) > rangeSq) continue;
    if (!best || enemy.pathProgress > best.pathProgress) best = enemy;
  }
  return best;
}

export function updateRevealState(enemies, towers) {
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
