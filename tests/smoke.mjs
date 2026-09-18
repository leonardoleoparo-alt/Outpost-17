import assert from 'node:assert/strict';
import { Economy } from '../js/economy.js';
import { Enemy, ENEMY_TYPES } from '../js/enemies.js';
import { ForestMap } from '../js/map.js';
import { PathRoute } from '../js/path.js';
import { Projectile } from '../js/projectile.js';
import { canTowerTarget, findFirstTarget, updateRevealState } from '../js/targeting.js';
import { createTower, getUpgradePreview, TOWER_TYPES, validatePlacement } from '../js/towers.js';
import { GAME_SPEEDS, GAME_STATES, getSimulationDelta } from '../js/game.js';
import { WaveController, WAVE_CONFIGS } from '../js/waves.js';

function upgradeTo(tower, level) { while (tower.level < level) assert.equal(tower.upgrade(), true); }
function findValidSpot(map, type='ranger', towers=[]) {
  for (let y=90;y<map.height-90;y+=40) for (let x=90;x<map.width-90;x+=40)
    if (validatePlacement(type,x,y,map,towers).valid) return {x,y};
  return null;
}

// Foundation regression.
{
  const route=new PathRoute();
  assert.ok(route.totalLength>2500);
  assert.ok(route.positionAt(0).x<0);
  assert.ok(route.positionAt(route.totalLength).x>1400);
  const economy=new Economy(800); assert.equal(economy.spend(250),true); assert.equal(economy.money,550);
  const map=new ForestMap(); const towers=[];
  for (const type of Object.keys(TOWER_TYPES)) { const spot=findValidSpot(map,type,towers); assert.ok(spot); towers.push(createTower(type,spot.x,spot.y)); }
  assert.equal(validatePlacement('ranger',300,250,map,[]).valid,false);
  assert.equal(validatePlacement('ranger',map.outpost.x,map.outpost.y,map,[]).valid,false);
}

// Enemy property matrix, including Flying+Invisible.
{
  const map=new ForestMap();
  const expected={
    grunt:[false,false], runner:[false,false], brute:[false,false], glider:[true,false], shade:[false,true], phantom:[true,true]
  };
  for (const [type,[fly,inv]] of Object.entries(expected)) {
    const e=new Enemy(type,map.path); assert.equal(e.isFlying,fly); assert.equal(e.isInvisible,inv);
    const before=e.distance; e.update(1); assert.ok(e.distance>before); assert.ok(e.pathProgress>0);
  }
  assert.ok(ENEMY_TYPES.phantom.maxHp>ENEMY_TYPES.glider.maxHp);
  assert.ok(ENEMY_TYPES.phantom.speed<ENEMY_TYPES.runner.speed,'Phantom should not be the fastest enemy');
  assert.ok(ENEMY_TYPES.phantom.maxHp<ENEMY_TYPES.brute.maxHp,'Phantom should not be the tankiest enemy');
  assert.ok(ENEMY_TYPES.phantom.reward>ENEMY_TYPES.glider.reward);
}

// Generic compatibility matrix, no name-specific logic.
{
  const map=new ForestMap();
  const ground=new Enemy('grunt',map.path,400);
  const shade=new Enemy('shade',map.path,400);
  const flying=new Enemy('glider',map.path,400);
  const phantom=new Enemy('phantom',map.path,400);
  const cases=[
    [{canTargetGround:true,canTargetFlying:false,hasDetection:false}, [true,false,false,false]],
    [{canTargetGround:true,canTargetFlying:true,hasDetection:false}, [true,false,true,false]],
    [{canTargetGround:true,canTargetFlying:false,hasDetection:true}, [true,true,false,false]],
    [{canTargetGround:true,canTargetFlying:true,hasDetection:true}, [true,true,true,true]],
    [{canTargetGround:false,canTargetFlying:true,hasDetection:true}, [false,false,true,true]],
  ];
  for (const [tower,want] of cases) {
    const got=[ground,shade,flying,phantom].map(e=>canTowerTarget(tower,e)); assert.deepEqual(got,want);
  }
  shade.isRevealed=true; phantom.isRevealed=true;
  assert.equal(canTowerTarget({canTargetGround:true,canTargetFlying:false,hasDetection:false},shade),true);
  assert.equal(canTowerTarget({canTargetGround:true,canTargetFlying:false,hasDetection:false},phantom),false,'Reveal does not grant Anti-Air');
  assert.equal(canTowerTarget({canTargetGround:false,canTargetFlying:true,hasDetection:false},phantom),true,'Reveal can satisfy cloak condition for Anti-Air tower');
}

// Exact Stage 4 tower/Phantom expectations.
{
  const map=new ForestMap(); const p=new Enemy('phantom',map.path,900);
  const r1=createTower('ranger',p.x,p.y+50); const r3=createTower('ranger',p.x,p.y+50); upgradeTo(r3,3); const r4=createTower('ranger',p.x,p.y+50); upgradeTo(r4,4);
  const m3=createTower('marksman',p.x,p.y+50); upgradeTo(m3,3); const m4=createTower('marksman',p.x,p.y+50); upgradeTo(m4,4);
  const a2=createTower('airDefense',p.x,p.y+50); upgradeTo(a2,2); const a3=createTower('airDefense',p.x,p.y+50); upgradeTo(a3,3);
  assert.equal(canTowerTarget(r1,p),false); assert.equal(canTowerTarget(r3,p),false); assert.equal(canTowerTarget(r4,p),true);
  assert.equal(canTowerTarget(m3,p),false); assert.equal(canTowerTarget(m4,p),true);
  assert.equal(canTowerTarget(a2,p),false); assert.equal(canTowerTarget(a3,p),true);
  p.isRevealed=true;
  assert.equal(canTowerTarget(r3,p),true,'Ranger L3 + Reveal attacks Phantom');
  assert.equal(canTowerTarget(r1,p),false,'Ranger L1 + Reveal still lacks Anti-Air');
  assert.equal(canTowerTarget(a2,p),true,'Air Defense L2 + Reveal attacks Phantom');
}

// Reveal loss, multiple sources, target loss and own Detection persistence.
{
  const map=new ForestMap(); const p=new Enemy('phantom',map.path,900);
  const r3=createTower('ranger',p.x+40,p.y); upgradeTo(r3,3);
  const r4=createTower('ranger',p.x+45,p.y); upgradeTo(r4,4);
  const a2=createTower('airDefense',p.x+50,p.y); upgradeTo(a2,2);
  const a3=createTower('airDefense',p.x+55,p.y); upgradeTo(a3,3);
  const s1=createTower('scout',p.x-80,p.y); upgradeTo(s1,3);
  const s2=createTower('scout',p.x+80,p.y); upgradeTo(s2,3);
  updateRevealState([p],[s1,s2]); assert.equal(p.isRevealed,true);
  const shots=[]; r3.update(1,[p],shots); a2.update(1,[p],shots); assert.equal(r3.target,p); assert.equal(a2.target,p);
  s1.x-=1000; updateRevealState([p],[s1,s2]); assert.equal(p.isRevealed,true);
  s2.x+=1000; updateRevealState([p],[s1,s2]); assert.equal(p.isRevealed,false);
  r3.update(1,[p],shots); a2.update(1,[p],shots); r4.update(1,[p],shots); a3.update(1,[p],shots);
  assert.equal(r3.target,null); assert.equal(a2.target,null); assert.equal(r4.target,p); assert.equal(a3.target,p);
}

// FIRST still means highest progress among valid targets.
{
  const map=new ForestMap(); const tower=createTower('ranger',600,380); upgradeTo(tower,4);
  const a=new Enemy('grunt',map.path,500), b=new Enemy('phantom',map.path,1200);
  a.x=tower.x+20;a.y=tower.y;b.x=tower.x+70;b.y=tower.y;
  assert.equal(findFirstTarget(tower,[a,b]),b);
  const noDetect=createTower('ranger',tower.x,tower.y); upgradeTo(noDetect,3);
  assert.equal(findFirstTarget(noDetect,[a,b]),a,'hidden Phantom excluded from FIRST');
  b.isRevealed=true; assert.equal(findFirstTarget(noDetect,[a,b]),b);
}

// Upgrades/sell regression.
{
  const tower=createTower('ranger',100,100); const preview=getUpgradePreview(tower); assert.ok(preview.damage[1]>preview.damage[0]); tower.upgrade();
  assert.equal(tower.sellValue,Math.floor(tower.totalInvested*.7)); upgradeTo(tower,4); assert.equal(tower.upgrade(),false);
}

// Projectile regression.
{
  const map=new ForestMap(); const target=new Enemy('grunt',map.path,200); const p=new Projectile(target.x-5,target.y,target,target.maxHp); const r=p.update(.1); assert.equal(r?.killed,true);
}

// Full Waves 1–20 campaign. Phantom begins on 15 and final wave combines all existing types.
{
  assert.equal(WAVE_CONFIGS.length,20);
  const waveController=new WaveController(new PathRoute()); const enemies=[];
  for (const config of WAVE_CONFIGS) {
    const started=waveController.start(); assert.equal(started.number,config.number);
    for(let i=0;i<5000&&waveController.spawnIndex<waveController.schedule.length;i++) waveController.update(.1,enemies);
    assert.equal(waveController.spawnIndex,waveController.schedule.length);
    const types=new Set(enemies.map(e=>e.type));
    if(config.number<15) assert.equal(types.has('phantom'),false,`Phantom must not appear before Wave 15 (${config.number})`);
    if([15,16,18,19,20].includes(config.number)) assert.ok(types.has('phantom'),`Expected Phantom in Wave ${config.number}`);
    if(config.number===20) assert.deepEqual([...types].sort(), ['brute','glider','grunt','phantom','runner','shade'].sort());
    for(const e of enemies){e.alive=false;e.active=false;}
    assert.equal(waveController.evaluate(enemies).number,config.number); enemies.length=0;
  }
  assert.equal(waveController.phaseComplete,true); assert.equal(waveController.start(),null);
}

// Final state machine constants and 2x central delta.
{
  assert.deepEqual(Object.values(GAME_STATES), ['PREPARATION','WAVE_ACTIVE','PAUSED','VICTORY','GAME_OVER']);
  assert.deepEqual([...GAME_SPEEDS],[1,2]);
  assert.equal(getSimulationDelta(.016,1),.016);
  assert.equal(getSimulationDelta(.016,2),.032);
  assert.equal(getSimulationDelta(.2,1),.05);
  assert.equal(getSimulationDelta(.2,2),.10);

  const route=new PathRoute(); const e1=new Enemy('runner',route),e2=new Enemy('runner',route); e1.update(.5);e2.update(1); assert.ok(Math.abs(e2.distance/e1.distance-2)<.001);
  const w1=new WaveController(route),w2=new WaveController(route); const a=[],b=[]; w1.start();w2.start(); w1.update(.5,a);w2.update(1,b); assert.ok(b.length>=a.length,'2x-equivalent simulation time advances spawn timing');
}

console.log('PASS: Stage 5 final smoke suite');
