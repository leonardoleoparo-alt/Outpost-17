import { Enemy } from './enemies.js';

const g = (type, count, interval, delay = 0) => Object.freeze({ type, count, interval, delay });
const wave = (number, label, clearBonus, groups) => Object.freeze({ number, label, clearBonus, groups: Object.freeze(groups) });
const repeat = (count, factory) => Array.from({ length: count }, (_, index) => factory(index)).flat();

export const WAVE_CONFIGS = Object.freeze([
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

export class WaveController {
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
