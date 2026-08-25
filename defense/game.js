const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=1200,H=720;
const imgCache={};
const assets={
  ground:'assets/environment/ground.png',base:'assets/environment/base_castle.png',tree:'assets/environment/tree_large.png',bush:'assets/environment/bush_large.png',rock:'assets/environment/rock.png',camp:'assets/environment/campfire.png',chest:'assets/environment/chest.png',
  archer:'assets/towers/archer.png',cannon:'assets/towers/cannon.png',mage:'assets/towers/mage.png',
  kTile:'assets/kenney/tile.png',kPath:'assets/kenney/tile-straight.png',kStart:'assets/kenney/tile-spawn-round.png',kEnd:'assets/kenney/tile-end-round.png',kCrystal:'assets/kenney/tile-crystal.png',kRock:'assets/kenney/tile-rock.png',kTree:'assets/kenney/tile-tree.png',kTree2:'assets/kenney/tile-tree-double.png',kTree4:'assets/kenney/tile-tree-quad.png',kDirt:'assets/kenney/tile-dirt.png',
  kBase:'assets/kenney/tower-round-base.png',kBottomA:'assets/kenney/tower-round-bottom-a.png',kBottomB:'assets/kenney/tower-round-bottom-b.png',kBottomC:'assets/kenney/tower-round-bottom-c.png',kMiddleA:'assets/kenney/tower-round-middle-a.png',kMiddleB:'assets/kenney/tower-round-middle-b.png',kMiddleC:'assets/kenney/tower-round-middle-c.png',kRoofA:'assets/kenney/tower-round-roof-a.png',kRoofB:'assets/kenney/tower-round-roof-b.png',kRoofC:'assets/kenney/tower-round-roof-c.png',kTopA:'assets/kenney/tower-round-top-a.png',kTopB:'assets/kenney/tower-round-top-b.png',kTopC:'assets/kenney/tower-round-top-c.png',kCrystal:'assets/kenney/tower-round-crystals.png',kBallista:'assets/kenney/weapon-ballista.png',kCannon:'assets/kenney/weapon-cannon.png',kCatapult:'assets/kenney/weapon-catapult.png',kTurret:'assets/kenney/weapon-turret.png'
};
for(let i=1;i<=10;i++)assets['e'+i]=`assets/enemies/e${i===4?'5':i}.png`; // legacy assets retained for compatibility
for(let i=1;i<=8;i++){assets[`common_walk_${String(i).padStart(2,'0')}`]=`assets/enemies/common/walk_${String(i).padStart(2,'0')}.png`;assets[`common_attack_${String(i).padStart(2,'0')}`]=`assets/enemies/common/attack_${String(i).padStart(2,'0')}.png`}
for(let v of ['','a','b','c'])for(let i=0;i<8;i++)assets[`boss_${v||'main'}_${i}`]=`assets/bosses/walk/walk${v?'_'+v:''}_${String(i).padStart(2,'0')}.png`;
for(let i=0;i<8;i++)assets[`boss_attack_${i}`]=`assets/bosses/attack/attack_${String(i).padStart(2,'0')}.png`;
for(const [k,p] of Object.entries(assets)){const im=new Image();im.src=p;imgCache[k]=im}
const snd={}; for(const n of ['ui_click','turret','rocket','reward','death','boss']){const a=new Audio(`assets/audio/${n}.wav`);a.preload='auto';a.addEventListener('error',()=>{});snd[n]=a} snd.ui=snd.ui_click;
function play(n,v=.22){try{snd[n].currentTime=0;snd[n].volume=v;snd[n].play().catch(()=>{})}catch(e){}}

// Premium isometric-style battlefield, while gameplay still uses the original path coordinates.
const path=[{x:-50,y:150},{x:210,y:150},{x:210,y:330},{x:440,y:330},{x:440,y:125},{x:690,y:125},{x:690,y:350},{x:950,y:350},{x:950,y:175},{x:1090,y:175}];
const pads=[{x:110,y:285},{x:320,y:185},{x:320,y:430},{x:555,y:250},{x:805,y:225},{x:805,y:450},{x:1040,y:285},{x:1040,y:500},{x:550,y:510},{x:290,y:570}];
let towers=[],enemies=[],shots=[],fx=[],wave=0,lives=20,gold=300,score=0,running=false,selected='archer',selectedTower=null,hero=null,spawnTimer=0,spawnLeft=0,gameEnded=false;
const towerCfg={archer:{name:'Watchtower',cost:75,dmg:17,range:165,rate:650,color:'#f4c95d',set:'A',weapon:'kBallista'},cannon:{name:'Guard Tower',cost:125,dmg:38,range:145,rate:1100,color:'#e88b54',set:'B',weapon:'kCannon'},mage:{name:'Crystal Tower',cost:175,dmg:28,range:185,rate:800,color:'#9d7cff',set:'C',weapon:'kTurret'}};
const RTDB_GAME_PATH="leaderboard/defense";
let scoreSubmitted=false;
async function loadScores(){try{const res=await rtdbGet(RTDB_GAME_PATH,'?orderBy=%22score%22&limitToLast=10');if(!res.ok)throw new Error('Realtime Database read failed: '+res.status);const data=await res.json();const rows=Object.values(data||{}).sort((a,b)=>Number(b.score||0)-Number(a.score||0));document.getElementById('scores').innerHTML=rows.slice(0,10).map(x=>`<li><b>${escapeHtml(String(x.gameName||x.name||'Player'))}</b> — ${Number(x.score||0).toLocaleString()} <small>Wave ${Number(x.wave||0)}</small></li>`).join('')||'<li>No runs registered yet.</li>'}catch(err){console.error('Defense leaderboard error:',err);document.getElementById('scores').innerHTML='<li>Leaderboard unavailable — check Firebase Realtime Database rules.</li>'}}
async function saveScore(){if(scoreSubmitted)return;const session=getSession();if(!session?.idName||!session?.gameName){location.href='../';return}const status=document.getElementById('resultStatus');status.textContent='Saving your score…';try{const payload={game:'defense',idName:String(session.idName),uid:String(session.idName),gameName:String(session.gameName),name:String(session.gameName),score:Number(score)||0,wave:Number(wave)||0,createdAt:Date.now()};const res=await rtdbPost(RTDB_GAME_PATH,payload);if(res.ok){const best=Number((getSession()?.scores||{})?.defense||0);const finalScore=Number(score)||0;if(finalScore>best)await rtdbPut(`players/${String(session.idName).toLowerCase()}/scores/defense`,finalScore);const ss=getSession()||{};ss.scores={...(ss.scores||{}),defense:Math.max(best,finalScore)};setSession(ss)}if(!res.ok){const detail=await res.text().catch(()=>"");throw new Error(`Realtime Database upload failed: ${res.status} ${detail}`)}scoreSubmitted=true;await loadScores();status.textContent='Score saved to the global leaderboard ✓';document.getElementById('submitResult').disabled=true}catch(err){console.error(err);status.textContent='Could not save score. Check Firebase Realtime Database rules.'}}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1500)}
function setStats(){waveEl.textContent=`${wave}/20`;lifeEl.textContent=lives;goldEl.textContent=gold;scoreEl.textContent=score}
const waveEl=document.getElementById('wave'),lifeEl=document.getElementById('lives'),goldEl=document.getElementById('gold'),scoreEl=document.getElementById('score');
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
const segmentLengths=[];let totalPath=0;for(let i=0;i<path.length-1;i++){const len=dist(path[i],path[i+1]);segmentLengths.push(len);totalPath+=len}
function pathPoint(distanceAlong){let remaining=Math.max(0,Math.min(distanceAlong,totalPath));for(let i=0;i<path.length-1;i++){const len=segmentLengths[i];if(remaining<=len){const a=path[i],b=path[i+1],q=len?remaining/len:0;return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q}}remaining-=len}return path[path.length-1]}
function drawImage(key,x,y,w,h,alpha=1,rot=0){const im=imgCache[key];if(!im||!im.complete||!im.naturalWidth)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(rot)ctx.rotate(rot);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
function drawKenneyTower(t){const c=towerCfg[t.type],s=c.set;const names=s==='A'?['kBottomA','kMiddleA','kRoofA','kTopA']:s==='B'?['kBottomB','kMiddleB','kRoofB','kTopB']:['kBottomC','kMiddleC','kRoofC','kTopC'];
 drawImage('kBase',t.x,t.y+22,92,92,1);drawImage(names[0],t.x,t.y+12,92,92,1);drawImage(names[1],t.x,t.y-3,92,92,1);drawImage(names[2],t.x,t.y-22,92,92,1);drawImage(names[3],t.x,t.y-42,92,92,1);if(t.type==='mage')drawImage('kCrystal',t.x,t.y-54,74,74,1);drawImage(c.weapon,t.x,t.y-55,84,84,1);
 ctx.save();ctx.fillStyle='#07141a';ctx.beginPath();ctx.arc(t.x+31,t.y-55,13,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c.color;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText(t.level,t.x+31,t.y-51);ctx.restore()}
function drawMap(){
 const g=imgCache.ground;
 // Clean premium battlefield: textured base, restrained Kenney accents, and a readable road.
 ctx.fillStyle='#17382b';ctx.fillRect(0,0,W,H);
 if(g&&g.complete&&g.naturalWidth){ctx.globalAlpha=.34;for(let y=0;y<H;y+=128)for(let x=0;x<W;x+=128)ctx.drawImage(g,x,y,128,128);ctx.globalAlpha=1}
 // Soft vignette keeps attention on the play lane without the previous noisy tile grid.
 const vign=ctx.createRadialGradient(W*.52,H*.42,160,W*.52,H*.45,760);vign.addColorStop(0,'rgba(91,155,105,.08)');vign.addColorStop(1,'rgba(2,13,12,.34)');ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);
 // Decorative terrain clusters are placed away from the road and build pads.
 [[55,72,'tree',78,102],[1130,72,'tree',78,102],[72,640,'tree',72,96],[1130,640,'tree',76,100],[160,520,'bush',82,50],[890,600,'bush',88,52],[585,610,'rock',48,34],[1005,88,'rock',42,30],[105,470,'camp',58,58],[1105,535,'chest',66,52]].forEach(a=>drawImage(a[2],a[0],a[1],a[3],a[4],.78));
 [[150,82,'kTree',72,72],[355,74,'kTree2',76,76],[520,620,'kRock',64,64],[725,620,'kCrystal',66,66],[1005,620,'kTree4',80,80]].forEach(a=>drawImage(a[2],a[0],a[1],a[3],a[4],.62));
 // Premium layered road with a subtle edge highlight.
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 const roadPath=()=>{ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const q of path.slice(1))ctx.lineTo(q.x,q.y)};
 roadPath();ctx.strokeStyle='rgba(2,12,10,.48)';ctx.lineWidth=98;ctx.translate(0,7);ctx.stroke();ctx.translate(0,-7);
 roadPath();ctx.strokeStyle='#7b492b';ctx.lineWidth=88;ctx.stroke();
 roadPath();const rg=ctx.createLinearGradient(0,100,W,380);rg.addColorStop(0,'#c87536');rg.addColorStop(.5,'#df9148');rg.addColorStop(1,'#bf6834');ctx.strokeStyle=rg;ctx.lineWidth=74;ctx.stroke();
 roadPath();ctx.strokeStyle='rgba(255,218,143,.9)';ctx.lineWidth=2.5;ctx.setLineDash([18,16]);ctx.stroke();ctx.restore();
 drawImage('kStart',45,150,96,96,.92);drawImage('kEnd',1090,175,104,104,.92);drawImage('base',1138,154,128,174,1);
 // Build pads are intentionally subtle so the map remains clean.
 pads.forEach((p,i)=>{if(towers.some(t=>t.pad===i))return;ctx.save();ctx.fillStyle='rgba(255,224,132,.06)';ctx.strokeStyle='rgba(255,226,132,.72)';ctx.setLineDash([7,7]);ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(p.x,p.y+10,46,22,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,226,132,.9)';ctx.font='900 19px system-ui';ctx.textAlign='center';ctx.fillText('+',p.x,p.y+16);ctx.restore()});
}

function bossVariant(){return ['main','a','b','c'][Math.max(0,Math.min(3,Math.floor(wave/5)-1))]||'main'}
function spawn(){if(spawnLeft<=0)return;const isBoss=wave%5===0&&spawnLeft===1;const type=isBoss?10:((wave+spawnLeft)%9)+1;const p=pathPoint(0);const max=isBoss?520+wave*40:55+wave*9;enemies.push({x:p.x,y:p.y,t:0,hp:max,max,speed:isBoss?38:105+Math.random()*25,kind:type,boss:isBoss,hit:0,anim:0,attackTimer:0,attacking:false,variant:isBoss?bossVariant():'',facing:1});spawnLeft--;if(isBoss){document.getElementById('bossbar').classList.remove('hidden');document.getElementById('bossName').textContent=`${bossVariant()==='main'?'WARLORD':'ELITE WARLORD'} • WAVE ${wave}`;play('boss',.18);toast('⚔ BOSS INCOMING — DEFEND THE KEEP ⚔')}}
function startWave(){if(running||wave>=20||gameEnded)return;wave++;spawnLeft=5+wave*2;spawnTimer=0;running=true;toast(wave%5===0?`⚔ BOSS WAVE ${wave} ⚔`:`WAVE ${wave}`);play('ui');setStats()}
function endRun(){if(gameEnded)return;finish(false)}
function finish(win){if(gameEnded)return;gameEnded=true;running=false;document.getElementById('resultTitle').textContent=win?'VICTORY':'GAME OVER';document.getElementById('resultWave').textContent=`${wave}/20`;document.getElementById('resultScore').textContent=score.toLocaleString();document.getElementById('resultStatus').textContent='Your run is ready to register.';document.getElementById('resultModal').classList.remove('hidden');play(win?'reward':'death',.35)}
function newGame(){scoreSubmitted=false;document.getElementById('submitResult').disabled=false;towers=[];enemies=[];shots=[];fx=[];wave=0;lives=20;gold=300;score=0;running=false;selectedTower=null;gameEnded=false;document.getElementById('resultModal').classList.add('hidden');document.getElementById('panel').classList.add('hidden');document.getElementById('bossbar').classList.add('hidden');setStats();toast('NEW RUN READY')}
function place(type,i){const c=towerCfg[type];if(gold<c.cost){toast('Not enough gold');return false}if(towers.some(t=>t.pad===i))return false;gold-=c.cost;towers.push({type,pad:i,level:1,last:0,dmg:c.dmg,range:c.range,rate:c.rate,x:pads[i].x,y:pads[i].y});play('ui');setStats();return true}
function upgradeTower(t){const c=towerCfg[t.type],cost=Math.round(c.cost*.65*t.level);if(t.level>=5){toast('MAX LEVEL');return}if(gold<cost){toast(`Need $${cost}`);return}gold-=cost;t.level++;t.dmg=Math.round(c.dmg*(1+.42*(t.level-1)));t.range=c.range+14*(t.level-1);t.rate=Math.max(280,c.rate-65*(t.level-1));play('reward',.18);score+=25*t.level;setStats();updatePanel()}
function updatePanel(){if(!selectedTower)return;const t=selectedTower,c=towerCfg[t.type];document.getElementById('selType').textContent=t.type.toUpperCase();document.getElementById('selName').textContent=c.name;document.getElementById('selLevel').textContent=t.level;document.getElementById('selDamage').textContent=t.dmg;document.getElementById('selRange').textContent=Math.round(t.range);document.getElementById('selDesc').textContent=`Level ${t.level}/5 • Premium Kenney tower build • Next upgrade increases power and attack speed.`;document.getElementById('upgrade').textContent=t.level>=5?'MAX LEVEL':`UPGRADE • $${Math.round(c.cost*.65*t.level)}`}
function fire(t,target,now){t.last=now;shots.push({x:t.x,y:t.y,target,dmg:t.dmg,type:t.type,life:0});play(t.type==='cannon'?'rocket':t.type==='mage'?'reward':'turret',.12)}
function update(dt,now){if(gameEnded)return;if(running){spawnTimer-=dt;if(spawnLeft>0&&spawnTimer<=0){spawn();spawnTimer=420}if(spawnLeft===0&&enemies.length===0){running=false;score+=100+wave*30;gold+=80+wave*5;play('reward',.18);if(wave>=20){finish(true);return}setStats();toast('WAVE CLEARED • +REWARD')}}
 for(const e of enemies){if(e.hit>0)e.hit-=dt;
   if(e.boss){
     const attackPoint=totalPath-54;
     if(!e.attacking&&e.t<attackPoint){e.t=Math.min(attackPoint,e.t+e.speed*(dt/1000));e.anim=(e.anim+dt*0.012)%8}
     else {e.t=attackPoint;e.x=pathPoint(e.t).x;e.y=pathPoint(e.t).y;e.attacking=true;e.attackTimer+=dt;e.anim=(e.anim+dt*0.009)%8;if(e.attackTimer>=1250){e.attackTimer=0;lives-=5;score=Math.max(0,score-100);fx.push({x:1110,y:175,t:0,bossHit:true});play('boss',.18);toast('⚔ THE WARLORD STRIKES THE KEEP! ⚔');if(lives<=0){lives=0;setStats();finish(false);return}}}
   } else if(!e.dead){
     const attackPoint=totalPath-54;
     if(!e.attacking&&e.t<attackPoint){
       e.t=Math.min(attackPoint,e.t+e.speed*(dt/1000));
       e.anim=(e.anim+dt*0.014)%8;
     } else {
       e.t=attackPoint;
       e.attacking=true;
       e.attackTimer+=dt;
       e.anim=(e.anim+dt*0.011)%8;
       if(e.attackTimer>=1050){
         e.attackTimer=0;
         lives-=1;
         score=Math.max(0,score-15);
         fx.push({x:1110,y:175,t:0,enemyHit:true});
         play('turret',.10);
         toast('⚔ ENEMY STRIKES THE KEEP!');
         if(lives<=0){lives=0;setStats();finish(false);return}
       }
     }
   }
   const p=pathPoint(Math.min(e.t,totalPath));e.x=p.x;e.y=p.y;
 }
 for(const t of towers){let target=null,best=-1;for(const e of enemies){if(e.dead)continue;const d=dist(t,e);if(d<=t.range&&e.t>best){best=e.t;target=e}}if(target&&now-t.last>=t.rate)fire(t,target,now)}
 for(const s of shots){s.life+=dt;if(!s.target||s.target.dead){s.life=999;continue}const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy),step=.85*dt;if(d<12){s.target.hp-=s.dmg;s.target.hit=90;score+=s.target.boss?20:5;fx.push({x:s.target.x,y:s.target.y,t:0});if(s.target.hp<=0){s.target.dead=true;gold+=s.target.boss?180:10;score+=s.target.boss?500:25;if(s.target.boss){document.getElementById('bossbar').classList.add('hidden');toast('BOSS DEFEATED • +500 SCORE')}play('death',.12)}s.life=999}else{s.x+=dx/d*step;s.y+=dy/d*step}}
 shots=shots.filter(s=>s.life<500);enemies=enemies.filter(e=>!e.dead);fx.forEach(f=>f.t+=dt);fx=fx.filter(f=>f.t<450);if(enemies.some(e=>e.boss)){const b=enemies.find(e=>e.boss);document.getElementById('bossHp').style.width=`${Math.max(0,b.hp/b.max*100)}%`;document.getElementById('bossHpText').textContent=`${Math.ceil(b.hp)} / ${b.max}`}setStats()}
function drawBoss(e){const frame=Math.floor(e.anim)%8;const key=e.attacking?`boss_attack_${frame}`:`boss_${e.variant||'main'}_${frame}`;const w=170,h=170;ctx.save();if(e.hit>0)ctx.globalAlpha=.62;drawImage(key,e.x,e.y-12,w,h,ctx.globalAlpha,e.facing<0?Math.PI:0);ctx.restore();
 ctx.save();ctx.fillStyle='rgba(5,13,17,.65)';ctx.beginPath();ctx.ellipse(e.x,e.y+44,62,16,0,0,Math.PI*2);ctx.fill();ctx.restore()}
function draw(now){drawMap();
 for(const t of towers){if(t===selectedTower){ctx.save();ctx.fillStyle='rgba(255,225,120,.08)';ctx.strokeStyle='rgba(255,225,120,.65)';ctx.setLineDash([8,8]);ctx.beginPath();ctx.arc(t.x,t.y,t.range,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}drawKenneyTower(t)}
 for(const e of enemies){
   if(e.boss){drawBoss(e);continue}
   const frame=Math.floor(e.anim)%8;
   const key=`common_${e.attacking?'attack':'walk'}_${String(frame+1).padStart(2,'0')}`;
   const size=92;
   drawImage(key,e.x,e.y-3,size,size,e.hit>0?.62:1);
   ctx.save();
   ctx.fillStyle='rgba(8,17,20,.72)';ctx.fillRect(e.x-size*.42,e.y-size*.62,size*.84,5);
   ctx.fillStyle='#63e39a';ctx.fillRect(e.x-size*.42,e.y-size*.62,size*.84*Math.max(0,e.hp/e.max),5);
   if(e.attacking){ctx.fillStyle='rgba(255,105,96,.9)';ctx.font='900 9px system-ui';ctx.textAlign='center';ctx.fillText('ATTACK',e.x,e.y-size*.72)}
   ctx.restore();
 }
 for(const s of shots){ctx.save();ctx.shadowBlur=14;ctx.shadowColor=s.type==='mage'?'#83c8ff':s.type==='cannon'?'#ff9d59':'#ffe57c';ctx.fillStyle=s.type==='mage'?'#83c8ff':s.type==='cannon'?'#ff9d59':'#ffe57c';ctx.beginPath();ctx.arc(s.x,s.y,s.type==='cannon'?7:5,0,Math.PI*2);ctx.fill();ctx.restore()}
 for(const f of fx){ctx.save();ctx.globalAlpha=1-f.t/450;ctx.strokeStyle=f.bossHit||f.enemyHit?'#ff675f':'#fff2a8';ctx.lineWidth=4;ctx.shadowBlur=15;ctx.shadowColor=ctx.strokeStyle;ctx.beginPath();ctx.arc(f.x,f.y,10+f.t*.11,0,Math.PI*2);ctx.stroke();ctx.restore()}
}
let last=performance.now();function loop(now){const dt=Math.min(40,now-last);last=now;update(dt,now);draw(now);requestAnimationFrame(loop)}requestAnimationFrame(loop);
function canvasPoint(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{const p=canvasPoint(e);for(let i=towers.length-1;i>=0;i--){if(dist(p,towers[i])<55){selectedTower=towers[i];updatePanel();document.getElementById('panel').classList.remove('hidden');return}}let best=-1,bd=70;pads.forEach((q,i)=>{const d=dist(p,q);if(d<bd&&!towers.some(t=>t.pad===i)){bd=d;best=i}});if(best>=0)place(selected,best)});
document.querySelectorAll('.tower-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tower-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selected=b.dataset.type;toast(`Selected ${towerCfg[selected].name}`);play('ui')}));
document.getElementById('start').onclick=startWave;document.getElementById('end').onclick=endRun;document.getElementById('hero').onclick=()=>toast('HERO SYSTEM • deploy feature coming next');document.getElementById('closePanel').onclick=()=>document.getElementById('panel').classList.add('hidden');document.getElementById('upgrade').onclick=()=>selectedTower&&upgradeTower(selectedTower);document.getElementById('sell').onclick=()=>{if(!selectedTower)return;gold+=Math.round(towerCfg[selectedTower.type].cost*.6*selectedTower.level);towers=towers.filter(t=>t!==selectedTower);selectedTower=null;document.getElementById('panel').classList.add('hidden');setStats();play('ui')};document.getElementById('submitResult').onclick=saveScore;document.getElementById('newRun').onclick=newGame;document.getElementById('refresh').onclick=loadScores;loadScores();setStats();
