import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig); const db=getFirestore(app);
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const $=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const imgCache={};
function img(path){if(!imgCache[path]){const i=new Image();i.src=path;imgCache[path]=i}return imgCache[path]}

const AS={
 archer:l=>`assets/towers/set_2_archer_level_${l}.png`,
 cannon:l=>`assets/towers/set_2_cannon_level_${l}.png`,
 mage:l=>`assets/towers/set_2_mage_level_${l}.png`,
 barracks:l=>`assets/towers/set_2_barracks_level_${l}.png`,
 hero:l=>{const q=l<=2?1:l<=4?3:l<=6?5:l<=9?7:10;return `assets/characters/set_2_hero_level_${q}_front.png`},
 goblin:`assets/characters/set_2_goblin_1.png`,
 elite:`assets/characters/set_1_small_enemies_elites_01_02.png`,
 boss1:`assets/characters/set_2_goblin_boss.png`,
 boss2:`assets/characters/set_2_fire_brute_boss.png`,
 boss3:`assets/characters/set_2_stone_golem.png`,
 boss4:`assets/characters/set_2_demon_king.png`,
 boss5:`assets/characters/set_2_dark_shaman_boss.png`,
 boss6:`assets/characters/set_2_boss_large_1.png`,
 boss7:`assets/characters/set_2_boss_main.png`,
 tree1:`assets/terrain/set_2_tree_12.png`,
 tree2:`assets/terrain/set_2_tree_04_04.png`,
 rock:`assets/terrain/set_2_prop_01_01.png`
};
const towerDefs={
 archer:{name:'Archer',cost:75,desc:'Fast single target',damage:30,range:150,cool:.62,levels:[75,120,190,290,430]},
 cannon:{name:'Cannon',cost:125,desc:'Slow area damage',damage:75,range:135,cool:1.45,levels:[125,190,290,430,620]},
 mage:{name:'Mage',cost:175,desc:'Magic damage',damage:105,range:170,cool:1.15,levels:[175,260,390,570,800]},
 barracks:{name:'Barracks',cost:150,desc:'Front-line guard',damage:38,range:100,cool:.8,levels:[150,220,340,500,720]}
};
let state={gold:350,lives:20,wave:0,score:0,running:false,gameOver:false,submitted:false,startTime:0,elapsed:0,rush:0,rushUntil:0,combo:0,lastKill:0,hero:{x:560,y:500,level:1},towers:[],enemies:[],shots:[],particles:[],spawnLeft:0,spawnTimer:0,boss:null,nextWaveAt:0,drag:null,selected:null,enemySeq:0};
const pads=[{x:250,y:215},{x:420,y:205},{x:610,y:210},{x:790,y:225},{x:330,y:385},{x:520,y:365},{x:720,y:385},{x:870,y:420},{x:230,y:520},{x:420,y:520},{x:680,y:525},{x:850,y:540}];
const path=[{x:-40,y:120},{x:250,y:120},{x:250,y:300},{x:520,y:300},{x:520,y:150},{x:820,y:150},{x:820,y:340},{x:1030,y:340}];
function posOnPath(t){let total=0,segs=[];for(let i=1;i<path.length;i++){let a=path[i-1],b=path[i],len=Math.hypot(b.x-a.x,b.y-a.y);segs.push({a,b,len});total+=len}let d=t*total;for(const s of segs){if(d<=s.len){let q=d/s.len;return{x:s.a.x+(s.b.x-s.a.x)*q,y:s.a.y+(s.b.y-s.a.y)*q}}d-=s.len}return path.at(-1)}
function setText(){ $('gold').textContent=Math.floor(state.gold);$('lives').textContent=state.lives;$('wave').textContent=`${state.wave}/20`;$('score').textContent=Math.floor(state.score).toLocaleString();$('heroLevel').textContent=`Level ${state.hero.level} / 10`; }
function showToast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>e.classList.remove('show'),1200)}
function showBoss(t){const e=$('bossBanner');e.textContent=t;e.classList.add('show');clearTimeout(showBoss.t);showBoss.t=setTimeout(()=>e.classList.remove('show'),1800)}
function towerPath(t,l){return AS[t](l)}
function heroPath(){return AS.hero(state.hero.level)}
function currentPlayer(){return localStorage.getItem('irwflixPlayer')||localStorage.getItem('memoryPlayer')||localStorage.getItem('defensePlayer')||'Player'}
function playerName(){let n=currentPlayer();localStorage.setItem('defensePlayer',n);return n}
async function submitScore(reason='manual'){
 if(state.score<=0 || state.submitted)return false;
 state.submitted=true;
 const payload={game:'defense',name:playerName(),score:Math.floor(state.score),wave:state.wave,elapsed:Math.floor((Date.now()-state.startTime)/1000),bestCombo:state.combo,reason,createdAt:Date.now()};
 try{await addDoc(collection(db,'leaderboard'),payload);showToast('Score submitted ✓');await loadScores();return true}catch(e){console.error(e);state.submitted=false;showToast('Firebase save failed');return false}
}
async function loadScores(){const box=$('scores');box.textContent='Loading…';try{const s=await Promise.race([getDocs(query(collection(db,'leaderboard'),limit(500))),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),7000))]);let a=[];s.forEach(d=>{const x=d.data();if(x.game==='defense')a.push(x)});a.sort((x,y)=>Number(y.score||0)-Number(x.score||0));box.innerHTML=a.slice(0,10).map((x,i)=>`<div class="score-row"><span>${i+1}</span><b>${escapeHtml(x.name||'Player')}</b><span class="score">${Number(x.score||0).toLocaleString()}</span></div>`).join('')||'<small>No scores yet.</small>'}catch(e){box.innerHTML='<small>Leaderboard unavailable.</small>'}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function startWave(){if(state.gameOver)return;if(state.running)return;if(state.wave>=20){finish(true);return}state.wave++;state.running=true;state.spawnLeft=5+state.wave*2;state.spawnTimer=0;state.nextWaveAt=0;state.rushUntil=performance.now()+60000;state.rush=2;showBoss(`WAVE ${state.wave} • BOSS INCOMING`);if(state.wave===1)state.startTime=Date.now();$('startBtn').disabled=true;setText()}
function spawnEnemy(boss=false){const idx=state.enemySeq++;const maxHp=boss?900+state.wave*240:100+state.wave*35;const e={id:idx,boss,hp:maxHp,maxHp,x:path[0].x,y:path[0].y,t:-.03,speed:(boss?.55:.9)+state.wave*.025,r:boss?42:22,damage:boss?4:1,hit:0,asset: boss ? [AS.boss1,AS.boss2,AS.boss3,AS.boss4,AS.boss5,AS.boss6,AS.boss7][(state.wave-1)%7] : (idx%4===0?AS.elite:AS.goblin)};state.enemies.push(e)}
function fireTower(t,dt){if(t.coolLeft>0){t.coolLeft-=dt;return}let target=null,bd=Infinity;for(const e of state.enemies){if(e.hp<=0)continue;let d=Math.hypot(e.x-t.x,e.y-t.y);if(d<t.range&&d<bd){bd=d;target=e}}if(!target)return;t.coolLeft=towerDefs[t.type].cool*(1-(t.level-1)*.07);const def=towerDefs[t.type];state.shots.push({x:t.x,y:t.y,tx:target.x,ty:target.y,target,damage:def.damage*(1+(t.level-1)*.55),aoe:t.type==='cannon'?58:0,speed:480});}
function update(dt){if(state.gameOver)return;state.elapsed=(Date.now()-state.startTime)/1000;if(state.running){state.spawnTimer-=dt;if(state.spawnLeft>0&&state.spawnTimer<=0){spawnEnemy(false);state.spawnLeft--;state.spawnTimer=Math.max(.25,1.0-state.wave*.02)}if(state.spawnLeft===0&&state.enemies.length===0){state.running=false;$('startBtn').disabled=false;if(state.wave%1===0){state.gold+=80+state.wave*12;state.score+=500*state.wave;setText();if(state.wave>=20)finish(true);else showToast('Wave cleared • bonus gold')}}if(state.wave>0&&state.spawnLeft===Math.floor(5+state.wave*2)/2){}}
 if(state.running&&state.spawnLeft===Math.floor(5+state.wave*2)/2 && !state.boss){state.boss=true;spawnEnemy(true);showBoss(`👑 BOSS WAVE ${state.wave}`)}
 if(state.rushUntil && performance.now()>state.rushUntil){state.rush=1;state.rushUntil=0;showToast('Battle Rush expired • normal score')}
 for(const t of state.towers)fireTower(t,dt);
 for(const e of state.enemies){if(e.hp<=0)continue;e.t+=e.speed*dt/520;const p=posOnPath(e.t);e.x=p.x;e.y=p.y;e.hit=Math.max(0,e.hit-dt);if(e.t>=1){e.hp=0;state.lives-=e.damage;state.combo=0;state.score=Math.max(0,state.score-50*e.damage);if(state.lives<=0)finish(false)}}
 for(const s of state.shots){if(!s.target||s.target.hp<=0){s.done=true;continue}s.tx=s.target.x;s.ty=s.target.y;const dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy),step=s.speed*dt;if(d<=step){s.done=true;if(s.aoe){for(const e of state.enemies)if(e.hp>0&&Math.hypot(e.x-s.tx,e.y-s.ty)<=s.aoe)e.hp-=s.damage}else s.target.hp-=s.damage;if(s.target.hp<=0)killEnemy(s.target)}else{s.x+=dx/d*step;s.y+=dy/d*step}}
 state.shots=state.shots.filter(s=>!s.done);state.enemies=state.enemies.filter(e=>e.hp>0);if(state.running&&!state.boss&&state.spawnLeft<=0)state.boss=false;setText();updateRush()}
function killEnemy(e){const now=performance.now();state.combo=now-state.lastKill<1800?state.combo+1:1;state.lastKill=now;let pts=e.boss?1200+state.wave*180:100+state.wave*12;pts*=state.rush;pts*=1+Math.min(4,state.combo)*.1;state.score+=pts;state.gold+=e.boss?120:18;for(let i=0;i<6;i++)state.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*120,vy:(Math.random()-.5)*120,life:.5}) ;if(e.boss){state.gold+=150;showToast(`👑 Boss defeated +${Math.floor(pts)}`);state.boss=false}}
function finish(win){if(state.gameOver)return;state.gameOver=true;state.running=false;$('startBtn').disabled=true;const title=win?'🏆 VICTORY':'💀 DEFENSE FAILED';$('endTitle').textContent=title;$('finalScore').textContent=Math.floor(state.score).toLocaleString();$('finalMeta').textContent=`Wave ${state.wave}/20 • Best combo ${state.combo} • ${Math.floor((Date.now()-state.startTime)/1000)}s`;$('gameOver').classList.remove('hidden');submitScore(win?'victory':'game-over');}
function updateRush(){if(state.rushUntil){$('rushTimer').textContent=Math.max(0,Math.ceil((state.rushUntil-performance.now())/1000))+'s';$('rushText').textContent='2× score active'}else{$('rushTimer').textContent='×1';$('rushText').textContent='Normal scoring'}}
function draw(){ctx.clearRect(0,0,W,H);drawMap();drawPath();drawPads();drawEnemies();drawTowers();drawHero();drawShots();drawParticles();if(state.drag)drawDragGhost()}
function drawMap(){ctx.fillStyle='#6b9a52';ctx.fillRect(0,0,W,H);ctx.globalAlpha=.16;const tiles=['assets/terrain/set_2_terrain_01_03.png','assets/terrain/set_2_terrain_04_01.png','assets/terrain/set_2_terrain_06_03.png','assets/terrain/set_2_terrain_08_03.png'];let ti=0;for(let x=0;x<W;x+=74)for(let y=0;y<H;y+=56){ctx.drawImage(img(tiles[ti++%tiles.length]),x,y,74,56)}ctx.globalAlpha=1;for(const p of [{x:70,y:70,a:AS.tree1},{x:930,y:60,a:AS.tree2},{x:70,y:470,a:AS.tree2},{x:970,y:500,a:AS.tree1}]){ctx.drawImage(img(p.a),p.x-25,p.y-60,70,110)}}
function drawPath(){ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#27331f';ctx.lineWidth=92;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.stroke();ctx.strokeStyle='#9d7a4e';ctx.lineWidth=78;ctx.stroke();ctx.strokeStyle='#d5bd7a';ctx.lineWidth=2;ctx.setLineDash([10,12]);ctx.stroke();ctx.restore()}
function drawPads(){for(const p of pads){const used=state.towers.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<10);ctx.beginPath();ctx.arc(p.x,p.y,34,0,Math.PI*2);ctx.fillStyle=used?'#27402d':'#d4b24b66';ctx.fill();ctx.strokeStyle=used?'#5d8a65':'#ffe28a';ctx.lineWidth=2;ctx.stroke();if(!used){ctx.fillStyle='#fff3b1';ctx.font='26px sans-serif';ctx.textAlign='center';ctx.fillText('+',p.x,p.y+9)}}}
function drawSprite(path,x,y,w,h,alpha=1){const im=img(path);if(!im.complete)return;ctx.globalAlpha=alpha;ctx.drawImage(im,x-w/2,y-h/2,w,h);ctx.globalAlpha=1}
function drawEnemies(){for(const e of state.enemies){const size=e.boss?88:50;drawSprite(e.asset,e.x,e.y,size,size);ctx.fillStyle='#161b15';ctx.fillRect(e.x-size/2,e.y-size/2-12,size,5);ctx.fillStyle=e.boss?'#ff6262':'#71e68a';ctx.fillRect(e.x-size/2,e.y-size/2-12,size*clamp(e.hp/e.maxHp,0,1),5);if(e.boss){ctx.fillStyle='#fff0c2';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('BOSS',e.x,e.y-size/2-18)}}}
function drawTowers(){for(const t of state.towers){const def=towerDefs[t.type];if(state.selected===t){ctx.beginPath();ctx.arc(t.x,t.y,def.range,0,Math.PI*2);ctx.fillStyle='#9fe9b71a';ctx.fill();ctx.strokeStyle='#a5efbf66';ctx.stroke()}drawSprite(towerPath(t.type,t.level),t.x,t.y,78,78);ctx.fillStyle='#101b13';ctx.fillRect(t.x-23,t.y+38,46,5);ctx.fillStyle='#ffd66b';ctx.fillRect(t.x-23,t.y+38,46*(t.level/5),5);}}
function drawHero(){drawSprite(heroPath(),state.hero.x,state.hero.y,76,76);ctx.fillStyle='#111a14';ctx.fillRect(state.hero.x-24,state.hero.y+40,48,5);ctx.fillStyle='#71e6a0';ctx.fillRect(state.hero.x-24,state.hero.y+40,48,5)}
function drawShots(){for(const s of state.shots){ctx.fillStyle='#ffe28a';ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill();}}
function drawParticles(){for(const p of state.particles){p.life-=.016;p.x+=p.vx*.016;p.y+=p.vy*.016;ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle='#ffd66b';ctx.fillRect(p.x,p.y,4,4)}ctx.globalAlpha=1;state.particles=state.particles.filter(p=>p.life>0)}
function drawDragGhost(){const t=state.drag;const def=towerDefs[t.type];ctx.globalAlpha=.6;drawSprite(towerPath(t.type,t.level),t.x,t.y,82,82);ctx.globalAlpha=1;const valid=pads.some(p=>!state.towers.some(q=>q.x===p.x&&q.y===p.y)&&Math.hypot(p.x-t.x,p.y-t.y)<42);ctx.strokeStyle=valid?'#7dffa4':'#ff7272';ctx.lineWidth=3;ctx.beginPath();ctx.arc(t.x,t.y,38,0,Math.PI*2);ctx.stroke()}
function canvasPoint(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height}}
function nearestPad(x,y){let best=null,bd=Infinity;for(const p of pads){if(state.towers.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<10))continue;const d=Math.hypot(x-p.x,y-p.y);if(d<bd){bd=d;best=p}}return bd<55?best:null}
function beginTowerDrag(type){const def=towerDefs[type];if(state.gold<def.cost){showToast('Not enough gold');return}state.drag={type,x:0,y:0,level:1,cost:def.cost};}
canvas.addEventListener('pointerdown',e=>{const p=canvasPoint(e);canvas.setPointerCapture(e.pointerId);if(state.drag){state.drag.x=p.x;state.drag.y=p.y;return}let hit=state.towers.find(t=>Math.hypot(t.x-p.x,t.y-p.y)<42);if(hit){state.selected=hit;renderSelected();return}if(Math.hypot(state.hero.x-p.x,state.hero.y-p.y)<45){state.drag={hero:true,x:p.x,y:p.y};return}state.selected=null;renderSelected()});
canvas.addEventListener('pointermove',e=>{const p=canvasPoint(e);if(state.drag){state.drag.x=p.x;state.drag.y=p.y;if(state.drag.hero){state.hero.x=clamp(p.x,50,1050);state.hero.y=clamp(p.y,60,590)} }});
canvas.addEventListener('pointerup',e=>{if(!state.drag)return;const d=state.drag;if(d.hero){state.drag=null;return}const p=nearestPad(d.x,d.y);if(p){state.gold-=towerDefs[d.type].cost;state.towers.push({type:d.type,x:p.x,y:p.y,level:1,coolLeft:0});state.score+=50;showToast(`${towerDefs[d.type].name} built`)}else showToast('Drop on a glowing build pad');state.drag=null;setText()});
for(const b of document.querySelectorAll('.tower-card'))b.addEventListener('pointerdown',e=>{e.preventDefault();document.querySelectorAll('.tower-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');beginTowerDrag(b.dataset.type)});
function renderSelected(){const t=state.selected;if(!t){$('selName').textContent='No tower selected';$('selDesc').textContent='Drag a tower onto a glowing build pad.';$('towerStats').textContent='';$('upgradeBtn').disabled=true;$('sellBtn').disabled=true;return}const d=towerDefs[t.type];$('selName').textContent=`${d.name} Tower • Lv ${t.level}`;$('selDesc').textContent=d.desc;$('towerStats').innerHTML=`<span>Damage ${Math.floor(d.damage*(1+(t.level-1)*.55))}</span><span>Range ${d.range}</span><span>Attack ${d.cool.toFixed(2)}s</span><span>Upgrade ${t.level<5?`$${d.levels[t.level]}`:'MAX'}</span>`;$('upgradeBtn').disabled=t.level>=5||state.gold<d.levels[t.level];$('upgradeBtn').textContent=t.level>=5?'MAX LEVEL':`UPGRADE $${d.levels[t.level]}`;$('sellBtn').disabled=false}
$('upgradeBtn').onclick=()=>{const t=state.selected;if(!t)return;const d=towerDefs[t.type],cost=d.levels[t.level];if(t.level>=5||state.gold<cost)return;state.gold-=cost;t.level++;state.score+=100*t.level;showToast(`${d.name} upgraded to Lv ${t.level}`);renderSelected();setText()};
$('sellBtn').onclick=()=>{const t=state.selected;if(!t)return;state.gold+=Math.floor(towerDefs[t.type].levels[t.level-1]*.55);state.towers=state.towers.filter(x=>x!==t);state.selected=null;renderSelected();setText();showToast('Tower sold')};
$('startBtn').onclick=startWave;$('submitBtn').onclick=()=>submitScore('manual');$('submitEnd').onclick=()=>submitScore('end-screen');$('restart').onclick=()=>location.reload();
let raf=performance.now();function loop(now){const dt=Math.min(.033,(now-raf)/1000);raf=now;update(dt);draw();requestAnimationFrame(loop)}
state.startTime=Date.now();renderSelected();loadScores();setText();requestAnimationFrame(loop);
