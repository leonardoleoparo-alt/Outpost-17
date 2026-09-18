import { Economy } from '../js/economy.js';
import { ForestMap } from '../js/map.js';
import { updateRevealState } from '../js/targeting.js';
import { createTower, TOWER_TYPES, validatePlacement } from '../js/towers.js';
import { WaveController } from '../js/waves.js';

const DT=.05;
function coverage(map,type,x,y,level=1){const r=TOWER_TYPES[type].levels[level-1].range,rs=r*r;let n=0;for(let i=0;i<=200;i++){const p=map.path.positionAt(map.path.totalLength*i/200),dx=p.x-x,dy=p.y-y;if(dx*dx+dy*dy<=rs)n++;}return n;}
function candidates(map,type,towers,style='best'){const a=[];for(let y=80;y<=map.height-80;y+=42)for(let x=80;x<=map.width-80;x+=42){if(validatePlacement(type,x,y,map,towers).valid)a.push({x,y,s:coverage(map,type,x,y)});}a.sort((a,b)=>b.s-a.s);if(style==='mediocre'){const offset=Math.floor(a.length*.06);return a.slice(offset).concat(a.slice(0,offset));}return a;}

function run(name,style,prepare,{speed=1}={}){
 const map=new ForestMap();const eco=new Economy(800);const wave=new WaveController(map.path);const towers=[],enemies=[],projectiles=[],labels=new Map(),log=[];let kills=0,leaked=0,spent=0,failed=0;
 const api={
  buy(type,label){if(labels.has(label))return false;const d=TOWER_TYPES[type];if(!eco.spend(d.cost)){failed++;return false;}const spot=candidates(map,type,towers,style)[0];if(!spot)throw Error('no spot '+type);const t=createTower(type,spot.x,spot.y);towers.push(t);labels.set(label,t);spent+=d.cost;return true;},
  upgrade(label){const t=labels.get(label);if(!t||t.isMaxLevel)return false;const c=t.nextUpgradeCost;if(!eco.spend(c)){failed++;return false;}t.upgrade();spent+=c;return true;},
  to(label,level){let t=labels.get(label);if(!t)return false;while(t.level<level){if(!this.upgrade(label))return false;}return true;},
  eco,towers,labels
 };
 for(let n=1;n<=20&&map.outpost.hp>0;n++){
  prepare(n,api);
  const c=wave.start();if(!c||c.number!==n)throw Error('start '+n);
  let steps=0;
  while(wave.active&&map.outpost.hp>0&&steps<80000){
   steps++;const dt=DT*speed;wave.update(dt,enemies);
   for(const e of enemies){const was=e.alive;e.update(dt);if(was&&e.reachedEnd){leaked+=e.baseDamage;map.outpost.damage(e.baseDamage);}}
   updateRevealState(enemies,towers);
   for(const t of towers)t.update(dt,enemies,projectiles);
   for(const p of projectiles){const r=p.update(dt);if(r?.killed){kills++;eco.earn(r.target.reward);}}
   for(let i=projectiles.length-1;i>=0;i--)if(!projectiles[i].alive)projectiles.splice(i,1);
   for(let i=enemies.length-1;i>=0;i--)if(!enemies[i].alive)enemies.splice(i,1);
   const clear=wave.evaluate(enemies);if(clear)eco.earn(clear.clearBonus);
  }
  log.push({wave:n,hp:map.outpost.hp,money:eco.money,kills,leaked,spent,earned:eco.totalEarned,seconds:+(steps*DT/speed).toFixed(2),simSeconds:+(steps*DT*speed).toFixed(2),towers:towers.map(t=>`${t.type}:L${t.level}`)});
 }
 return {name,hp:map.outpost.hp,money:eco.money,kills,leaked,spent,earned:eco.totalEarned,failedPurchases:failed,towers:towers.map(t=>({type:t.type,level:t.level,invested:t.totalInvested})),upgrades:towers.reduce((s,t)=>s+t.level-1,0),log};
}

const stage4General=(w,a)=>{
 if(w===1){a.buy('ranger','r1');a.to('r1',2);a.buy('ranger','r2');}
 if(w===2)a.to('r1',3); if(w===3){a.to('r2',2);a.buy('ranger','r3');}
 if(w===4)a.to('r2',3); if(w===5)a.to('r1',4); if(w===6)a.to('r3',3);
 if(w===7){a.to('r2',4);a.buy('ranger','r4');a.to('r4',2);}
 if(w===8){a.to('r3',4);a.to('r4',3);} if(w===9){a.buy('ranger','r5');a.to('r5',2);}
 if(w===10){a.to('r4',4);a.to('r5',3);} if(w===11){a.buy('ranger','r6');a.to('r6',3);}
 if(w===12)a.to('r6',4); if(w===13){a.buy('ranger','r7');a.to('r7',3);}
 if(w===14)a.to('r7',4); if(w===15){a.buy('ranger','r8');a.to('r8',3);}
};

const stage4Special=(w,a)=>{
 if(w===1){a.buy('ranger','r1');a.to('r1',2);a.buy('ranger','r2');}
 if(w===2)a.to('r1',3); if(w===3)a.buy('marksman','m1'); if(w===4)a.to('m1',2);
 if(w===5){a.buy('airDefense','a1');a.to('a1',2);} if(w===6){a.buy('scout','s1');a.to('s1',2);}
 if(w===7){a.to('s1',3);a.to('m1',3);} if(w===8){a.to('a1',3);a.to('r2',2);}
 if(w===9){a.to('a1',4);a.to('s1',4);} if(w===10){a.to('r2',3);a.buy('marksman','m2');}
 if(w===11){a.to('m2',2);a.buy('airDefense','a2');} if(w===12){a.to('m1',4);}
 if(w===13){a.to('a2',2);a.buy('ranger','r3');a.to('r3',2);} if(w===14){a.to('a2',4);}
 if(w===15){a.to('r3',4);}
};

const A=run('A_GENERALIST', 'best', (w,a)=>{
 stage4General(w,a);
 if(w===16){a.to('r8',4);a.buy('ranger','r9');a.to('r9',3);}
 if(w===17)a.to('r9',4);
 if(w===18){a.buy('ranger','r10');a.to('r10',4);}
 if(w===19){a.buy('ranger','r11');a.to('r11',4);}
 if(w===20){a.buy('ranger','r12');a.to('r12',4);}
});

const B=run('B_SPECIALIZED','best',(w,a)=>{
 stage4Special(w,a);
 if(w===16){a.buy('marksman','m3');a.to('m3',4);a.buy('ranger','r4');a.to('r4',4);}
 if(w===17){a.buy('marksman','m4');a.to('m4',4);}
 if(w===18){a.buy('airDefense','a3');a.to('a3',4);a.buy('airDefense','a4');a.to('a4',3);}
 if(w===19){a.to('a4',4);a.buy('scout','s2');a.to('s2',3);}
 if(w===20){a.buy('ranger','r5');a.to('r5',4);a.to('s2',4);}
});

const C=run('C_REVEAL','best',(w,a)=>{
 if(w===1){a.buy('ranger','r1');a.to('r1',2);a.buy('ranger','r2');}
 if(w===2)a.to('r1',3);
 if(w===3)a.buy('marksman','m1');
 if(w===4)a.buy('scout','s1');
 if(w===5){a.buy('airDefense','a1');a.to('a1',2);}
 if(w===6)a.to('s1',2);
 if(w===7){a.to('s1',3);a.buy('scout','s2');a.to('s2',3);}
 if(w===8){a.to('m1',3);a.to('r2',2);}
 if(w===9){a.to('a1',3);a.to('s1',4);}
 if(w===10){a.to('s2',4);}
 if(w===11){a.to('r2',4);}
 if(w===12)a.to('m1',4);
 if(w===13){a.buy('airDefense','a2');a.to('a2',2);}
 if(w===14){a.to('a2',3);a.buy('ranger','r4');a.to('r4',3);}
 if(w===15){a.to('s2',4);a.to('r4',4);a.to('a2',4);}
 if(w===16){a.buy('scout','s3');a.to('s3',3);a.buy('ranger','r5');a.to('r5',3);}
 if(w===17){a.buy('marksman','m2');a.to('m2',4);}
 if(w===18){a.buy('airDefense','a3');a.to('a3',4);}
 if(w===19){a.buy('ranger','r6');a.to('r6',3);a.buy('ranger','r7');a.to('r7',3);}
 if(w===20){a.buy('marksman','m3');a.to('m3',4);}
});

const D=run('D_RANGER_HEAVY','best',(w,a)=>{
 // Fewer towers, heavily upgraded rather than L1 spam.
 if(w===1){a.buy('ranger','r1');a.to('r1',2);a.buy('ranger','r2');}
 if(w===2)a.to('r1',3); if(w===3)a.to('r2',3); if(w===4)a.buy('ranger','r3');
 if(w===5)a.to('r1',4); if(w===6)a.to('r2',4); if(w===7)a.to('r3',4);
 if(w===8){a.buy('ranger','r4');a.to('r4',4);} if(w===10){a.buy('ranger','r5');a.to('r5',4);}
 if(w===12){a.buy('ranger','r6');a.to('r6',4);} if(w===14){a.buy('ranger','r7');a.to('r7',4);}
 if(w===16){a.buy('ranger','r8');a.to('r8',4);a.buy('ranger','r9');a.to('r9',4);}
 if(w===17){a.buy('ranger','r10');a.to('r10',4);} if(w===18){a.buy('ranger','r11');a.to('r11',4);a.buy('ranger','r12');a.to('r12',4);}
 if(w===19){a.buy('ranger','r13');a.to('r13',4);} if(w===20){a.buy('ranger','r14');a.to('r14',4);}
});

const E=run('E_AIR_DEFENSE_HEAVY','best',(w,a)=>{
 stage4Special(w,a);
 if(w===16){a.buy('marksman','m3');a.to('m3',4);}
 if(w===17){a.buy('ranger','r4');a.to('r4',4);}
 if(w===18){a.buy('airDefense','a3');a.to('a3',4);a.buy('airDefense','a4');a.to('a4',4);}
 if(w===19){a.buy('marksman','m4');a.to('m4',3);}
 if(w===20){a.buy('airDefense','a5');a.to('a5',4);a.to('m4',4);}
});

const F=run('F_IMPERFECT','mediocre',(w,a)=>{
 if(w===1){a.buy('ranger','r1');a.to('r1',2);a.buy('ranger','r2');}
 if(w===3)a.buy('scout','s1');
 if(w===4){a.buy('marksman','m1');a.to('r2',2);}
 if(w===5){a.buy('airDefense','a1');a.to('a1',2);}
 if(w===6){a.to('r1',3);a.buy('ranger','r3');}
 if(w===7){a.to('m1',2);a.to('s1',2);a.to('r3',2);}
 if(w===8){a.to('s1',3);a.to('r3',3);}
 if(w===9){a.to('r1',4);a.buy('airDefense','a2');}
 if(w===10){a.to('a2',2);a.to('r3',4);}
 if(w===11){a.buy('ranger','r4');a.to('r4',2);}
 if(w===12)a.to('m1',3);
 if(w===13){a.to('a1',3);a.to('r4',3);}
 if(w===14){a.to('a1',4);a.buy('scout','s2');a.to('s2',2);}
 if(w===15){a.to('r2',3);a.to('s2',3);}
 if(w===16){a.buy('marksman','m2');a.to('m2',3);a.buy('ranger','r5');a.to('r5',3);}
 if(w===17){a.to('m1',4);a.to('r5',4);a.buy('ranger','r6');a.to('r6',3);}
 if(w===18){a.buy('airDefense','a3');a.to('a3',4);a.buy('airDefense','a4');a.to('a4',2);}
 if(w===19){a.to('r4',4);a.to('s2',4);a.to('a4',4);}
 if(w===20){a.to('m2',4);a.to('r6',4);a.buy('marksman','m3');a.to('m3',3);}
});

const G=run('G_HOARDER_AFTER_15','best',(w,a)=>{
 stage4Special(w,a);
 // Deliberately no investment after Wave 15.
});

const H=run('H_RANGER_L1_SPAM','best',(w,a)=>{for(let i=0;i<3;i++)a.buy('ranger',`spam_${w}_${i}`);});

const A2=run('A_GENERALIST_2X','best',(w,a)=>{
 stage4General(w,a);
 if(w===16){a.to('r8',4);a.buy('ranger','r9');a.to('r9',3);}
 if(w===17)a.to('r9',4); if(w===18){a.buy('ranger','r10');a.to('r10',4);}
 if(w===19){a.buy('ranger','r11');a.to('r11',4);} if(w===20){a.buy('ranger','r12');a.to('r12',4);}
},{speed:2});

const report={strategies:[A,B,C,D,E,F,G],benchmarks:{rangerL1Spam:H,generalist2x:A2},milestones:Object.fromEntries([A,B,C,D,E,F,G].map(s=>[s.name,Object.fromEntries([5,10,15,20].map(w=>{const r=s.log.find(x=>x.wave===w);return [w,r?{hp:r.hp,money:r.money,kills:r.kills,spent:r.spent}:null]}))]))};
console.log(JSON.stringify(report,null,2));
