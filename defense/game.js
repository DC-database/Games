const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height;
const $=id=>document.getElementById(id);
const AS={};
const srcs={
  hero:"assets/characters/hero_archer.png", pawn:"assets/characters/enemy_pawn.png", warrior:"assets/characters/enemy_warrior.png",
  archer1:"assets/towers/grey_tower_00.png", archer2:"assets/towers/grey_tower_01.png", archer3:"assets/towers/grey_tower_03.png", archer4:"assets/towers/grey_tower_09.png", archer5:"assets/towers/grey_tower_28.png",
  cannon1:"assets/towers/red_tower_00.png", cannon2:"assets/towers/red_tower_01.png", cannon3:"assets/towers/red_tower_02.png", cannon4:"assets/towers/red_tower_03.png", cannon5:"assets/towers/red_tower_36.png",
  mage1:"assets/towers/brown_tower_00.png", mage2:"assets/towers/brown_tower_01.png", mage3:"assets/towers/brown_tower_15.png", mage4:"assets/towers/brown_tower_19.png", mage5:"assets/towers/brown_tower_36.png",
  grass:"assets/terrain/landscape_06.png", grass2:"assets/terrain/landscape_03.png", water:"assets/terrain/landscape_00.png"
};
Object.entries(srcs).forEach(([k,s])=>{const i=new Image();i.src=s;AS[k]=i});
const ready=i=>i&&i.complete&&i.naturalWidth;
const towers=[
 {type:"archer",name:"Archer Tower",icon:"🏹",cost:75,baseDamage:18,range:155,rate:520,desc:"Fast single-target shots."},
 {type:"cannon",name:"Cannon Tower",icon:"💣",cost:125,baseDamage:34,range:130,rate:1050,desc:"Heavy impact with splash damage."},
 {type:"mage",name:"Mage Tower",icon:"🔮",cost:175,baseDamage:50,range:185,rate:1250,desc:"Long-range magic with chain splash."}
];
const pads=[
{x:190,y:170},{x:340,y:145},{x:500,y:190},{x:670,y:150},{x:850,y:195},
{x:260,y:355},{x:440,y:390},{x:620,y:350},{x:790,y:390},{x:960,y:345},
{x:390,y:555},{x:650,y:545},{x:870,y:555}
];
const path=[{x:-35,y:100},{x:155,y:100},{x:155,y:270},{x:330,y:270},{x:330,y:105},{x:510,y:105},{x:510,y:295},{x:720,y:295},{x:720,y:135},{x:920,y:135},{x:920,y:500},{x:1235,y:500}];
let gold=300,lives=20,wave=0,score=0,selectedType="archer",selectedTower=null,towersPlaced=[],enemies=[],shots=[],particles=[],hero=null,heroDragging=false,gameOver=false,waveRunning=false,spawnLeft=0,spawnClock=0,boss=null,last=performance.now(),rush=0,rushUntil=0;
let player=localStorage.getItem("irwflixPlayer")||"Player";
if(player==="Player"){const n=prompt("Enter your player name","Player");if(n){player=n;localStorage.setItem("irwflixPlayer",n)}}

function ui(){ $("wave").textContent=`${wave}/20`;$("lives").textContent=lives;$("gold").textContent=gold;$("score").textContent=score.toLocaleString();updatePanel()}
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),1800)}
function countdown(cb){let n=3;$("countdown").textContent=n;let t=setInterval(()=>{n--;if(n>0)$("countdown").textContent=n;else{$("countdown").textContent="GO!";clearInterval(t);setTimeout(()=>{$("countdown").textContent="";cb()},400)}},700)}
function startWave(){if(gameOver||waveRunning||wave>=20)return;countdown(()=>beginWave())}
function beginWave(){wave++;waveRunning=true;spawnLeft=5+wave*2;spawnClock=0;boss=null;$("start").textContent="WAVE IN PROGRESS";toast(`WAVE ${wave} • BOSS INCOMING`);rush=wave%3===0?2:1;rushUntil=performance.now()+45000;ui()}
function spawnEnemy(kind="normal"){
 let e={x:path[0].x,y:path[0].y,seg:0,hp:40+wave*13,maxHp:40+wave*13,speed:52+wave*1.4,reward:12,kind};
 if(kind==="elite"){e.hp*=2.4;e.maxHp=e.hp;e.speed*=.78;e.reward=35}
 if(kind==="boss"){e.hp=650+wave*180;e.maxHp=e.hp;e.speed=30+wave*.7;e.reward=180;e.boss=true;boss=e}
 enemies.push(e)
}
function spawnBoss(){spawnEnemy("boss")}
function move(e,dt){
 const target=path[e.seg+1];if(!target)return;
 const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy),step=e.speed*dt;
 if(d<=step){e.x=target.x;e.y=target.y;e.seg++;if(e.seg>=path.length-1){lives-=e.boss?5:1;enemies=enemies.filter(x=>x!==e);if(e===boss)boss=null;ui();if(lives<=0)endGame(false)}}
 else{e.x+=dx/d*step;e.y+=dy/d*step}
}
function shoot(t,target){shots.push({x:t.x,y:t.y,target,damage:t.damage,type:t.type,speed:t.type==="mage"?520:460})}
function hit(e,d){
 if(!enemies.includes(e))return;
 e.hp-=d;burst(e.x,e.y,4);
 if(e.hp<=0){const mult=performance.now()<rushUntil?rush:1;score+=Math.round(e.reward*10*mult);gold+=e.reward;burst(e.x,e.y,e.boss?30:8);if(e.boss){score+=1500*wave;toast(`👑 BOSS DEFEATED +${1500*wave}`);boss=null}enemies=enemies.filter(x=>x!==e);ui()}
}
function update(dt){
 if(gameOver)return;
 if(waveRunning){
   spawnClock-=dt*1000;
   if(spawnLeft>0&&spawnClock<=0){spawnEnemy(Math.random()<Math.min(.08+wave*.01,.25)?"elite":"normal");spawnLeft--;spawnClock=Math.max(260,650-wave*12)}
   if(spawnLeft===0&&!boss&&wave>0){spawnBoss()}
   if(spawnLeft===0&&enemies.length===0){waveRunning=false;$("start").textContent=wave>=20?"VICTORY":"START NEXT WAVE";gold+=50+wave*6;ui();if(wave>=20)endGame(true);else toast(`WAVE ${wave} CLEARED • NEXT BOSS READY`)}
 }
 enemies.forEach(e=>move(e,dt));
 towersPlaced.forEach(t=>{t.cool-=dt*1000;if(t.cool>0)return;const ts=enemies.filter(e=>Math.hypot(e.x-t.x,e.y-t.y)<=t.range).sort((a,b)=>(b.seg-a.seg)+(b.x-a.x)*.0001);if(ts.length){shoot(t,ts[0]);t.cool=t.rate}});
 shots.forEach(s=>{if(!s.target||!enemies.includes(s.target)){s.life=0;return}const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy),step=s.speed*dt;if(d<=step){s.x=s.target.x;s.y=s.target.y;s.life=0;if(s.type==="cannon"){enemies.filter(e=>Math.hypot(e.x-s.x,e.y-s.y)<60).forEach(e=>hit(e,s.damage*.65))}else if(s.type==="mage"){enemies.filter(e=>Math.hypot(e.x-s.x,e.y-s.y)<45).forEach(e=>hit(e,s.damage*.45));hit(s.target,s.damage)}else hit(s.target,s.damage)}else{s.x+=dx/d*step;s.y+=dy/d*step}});
 shots=shots.filter(s=>s.life!==0);
 if(hero){hero.cool-=dt*1000;if(hero.cool<=0){const ts=enemies.filter(e=>Math.hypot(e.x-hero.x,e.y-hero.y)<210).sort((a,b)=>b.seg-a.seg);if(ts.length){shots.push({x:hero.x,y:hero.y,target:ts[0],damage:25+hero.level*8,type:"hero",speed:600});hero.cool=700-Math.min(300,hero.level*20)}}}
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);
}
function burst(x,y,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*110,vy:(Math.random()-.5)*110,life:.35+Math.random()*.4})}
function draw(){
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle="#21412d";ctx.fillRect(0,0,W,H);
 // Kenney terrain islands as decorative ground pieces
 const deco=[["grass",75,70,1],["grass2",300,55,1],["grass",545,60,1],["grass2",800,55,1],["grass",1050,70,1],["grass2",90,610,1],["grass",300,620,1],["grass2",560,610,1],["grass",830,615,1],["grass2",1080,610,1]];
 deco.forEach(([k,x,y,s])=>{if(ready(AS[k]))ctx.drawImage(AS[k],x-66,y-50,132*s,99*s)});
 // path
 ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#b9864f";ctx.lineWidth=64;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.strokeStyle="#d4a86d";ctx.lineWidth=5;ctx.setLineDash([18,14]);ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.restore();
 // decorations
 for(let i=0;i<10;i++){const x=40+(i*131)%1120,y=25+(i*97)%660;ctx.globalAlpha=.75;ctx.fillStyle=i%2?"#356844":"#467a4d";ctx.beginPath();ctx.arc(x,y,14+(i%3)*4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
 pads.forEach(p=>drawPad(p));
 towersPlaced.forEach(drawTower);
 enemies.forEach(drawEnemy);
 shots.forEach(drawShot);
 particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle="#ffd86b";ctx.fillRect(p.x-2,p.y-2,5,5);ctx.globalAlpha=1});
 if(hero)drawHero();
 updateBossBar();
 requestAnimationFrame(()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw()});
}
function drawPad(p){ctx.save();ctx.fillStyle="#d2a65755";ctx.strokeStyle="#f6d77a99";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+4,38,19,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#fff1b944";ctx.font="bold 18px system-ui";ctx.textAlign="center";ctx.fillText("+",p.x,p.y+10);ctx.restore()}
function towerImg(t){const ids={archer:[0,1,3,9,28],cannon:[0,1,2,3,36],mage:[0,1,15,19,36]};const col={archer:"grey",cannon:"red",mage:"brown"}[t.type];return AS[`${col}_tower_${String(ids[t.type][t.level-1]).padStart(2,"0")}`]}
function drawTower(t){const im=towerImg(t);const h=78+t.level*3,w=im&&im.naturalWidth?im.naturalWidth/im.naturalHeight*h:h;ctx.save();ctx.globalAlpha=.35;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(t.x,t.y+18,34,11,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(ready(im))ctx.drawImage(im,t.x-w/2,t.y-h+18,w,h);drawWeapon(t);if(t===selectedTower){ctx.strokeStyle="#ffe68c";ctx.lineWidth=2;ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(t.x,t.y,t.range,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}ctx.fillStyle="#0a1018dd";ctx.beginPath();ctx.arc(t.x+25,t.y-38,11,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(t.level,t.x+25,t.y-35);ctx.restore()}
function drawWeapon(t){ctx.save();ctx.translate(t.x,t.y-58);if(t.type==="archer"){ctx.strokeStyle="#f4d6a2";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,11,-1.2,1.2);ctx.stroke();ctx.strokeStyle="#eee";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(18,0);ctx.lineTo(0,11);ctx.stroke()}else if(t.type==="cannon"){ctx.fillStyle="#2b3138";ctx.fillRect(-3,-4,22,8);ctx.fillStyle="#141a20";ctx.beginPath();ctx.arc(-4,0,8,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle="#7ce6ff";ctx.shadowColor="#7ce6ff";ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(11,0);ctx.lineTo(0,16);ctx.lineTo(-11,0);ctx.closePath();ctx.fill()}ctx.restore()}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);if(e.boss){ctx.shadowColor="#ff4f4f";ctx.shadowBlur=25}const im=e.kind==="normal"?AS.pawn:AS.warrior;const frames=e.kind==="normal"?6:6;const fw=im&&im.naturalWidth?im.naturalWidth/frames:0,fh=im?im.naturalHeight:0;const scale=e.boss?1.65:e.kind==="elite"?1.2:1;if(ready(im))ctx.drawImage(im,Math.floor(performance.now()/120)%frames*fw,0,fw,fh,-22*scale,-58*scale,44*scale,58*scale);else{ctx.fillStyle=e.boss?"#c43":"#8b4";ctx.beginPath();ctx.arc(0,-25,15*scale,0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0;ctx.fillStyle="#231b18";ctx.fillRect(-24*scale,-70*scale,48*scale,5);ctx.fillStyle=e.boss?"#e84b45":"#6ee08f";ctx.fillRect(-24*scale,-70*scale,48*scale*Math.max(0,e.hp/e.maxHp),5);if(e.boss){ctx.fillStyle="#ffe27c";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText("BOSS",0,-78*scale)}ctx.restore()}
function drawShot(s){ctx.save();ctx.strokeStyle=s.type==="mage"?"#b98cff":s.type==="cannon"?"#ffb36a":"#eaf3ff";ctx.lineWidth=s.type==="cannon"?7:3;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-(s.target.x-s.x)*.06,s.y-(s.target.y-s.y)*.06);ctx.stroke();ctx.restore()}
function drawHero(){const im=AS.hero;ctx.save();ctx.translate(hero.x,hero.y);ctx.shadowColor="#67e6a4";ctx.shadowBlur=18;if(ready(im)){const frames=4,fw=im.naturalWidth/frames,fh=im.naturalHeight;ctx.drawImage(im,Math.floor(performance.now()/130)%frames*fw,0,fw,fh,-28,-72,56,72)}else{ctx.fillStyle="#67e6a4";ctx.beginPath();ctx.arc(0,-25,18,0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText(`HERO Lv.${hero.level}`,0,-80);ctx.restore()}
function updateBossBar(){if(boss&&enemies.includes(boss)){ $("bossbar").classList.remove("hidden");$("bossName").textContent=`👑 WAVE ${wave} BOSS`;$("bossHpText").textContent=`${Math.max(0,Math.ceil(boss.hp))}/${Math.ceil(boss.maxHp)}`;$("bossHp").style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`}else $("bossbar").classList.add("hidden")}
function screenPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function nearestPad(x,y){return pads.find(p=>Math.hypot(p.x-x,p.y-y)<42&&!towersPlaced.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<2))}
function placeTower(x,y){const p=nearestPad(x,y);if(!p){toast("Move onto a glowing build pad.");return}const d=towers.find(t=>t.type===selectedType);if(gold<d.cost){toast("Not enough gold.");return}gold-=d.cost;const t={...d,x:p.x,y:p.y,level:1,damage:d.baseDamage,rate:d.rate,range:d.range,cool:0,invested:d.cost,upgradeCost:Math.round(d.cost*.9)};towersPlaced.push(t);selectedTower=t;openPanel(t);ui()}
let drag=null;
canvas.addEventListener("pointerdown",e=>{e.preventDefault();const p=screenPoint(e);if(hero){if(Math.hypot(hero.x-p.x,hero.y-p.y)<35){drag={hero:true};canvas.setPointerCapture(e.pointerId);return}}const hit=towersPlaced.find(t=>Math.hypot(t.x-p.x,t.y-p.y)<38);if(hit){selectedTower=hit;openPanel(hit);return}drag={start:p};canvas.setPointerCapture(e.pointerId)},{passive:false});
canvas.addEventListener("pointermove",e=>{if(!drag)return;const p=screenPoint(e);if(drag.hero){hero.x=Math.max(40,Math.min(W-40,p.x));hero.y=Math.max(70,Math.min(H-50,p.y))}},{passive:false});
canvas.addEventListener("pointerup",e=>{if(!drag)return;const p=screenPoint(e);if(!drag.hero){const moved=Math.hypot(p.x-drag.start.x,p.y-drag.start.y);if(moved<12){const hit=towersPlaced.find(t=>Math.hypot(t.x-p.x,t.y-p.y)<38);if(hit){selectedTower=hit;openPanel(hit)}else placeTower(p.x,p.y)}}drag=null},{passive:false});
canvas.addEventListener("pointercancel",()=>drag=null);
function openPanel(t){$("panel").classList.remove("hidden");$("selType").textContent=t.type.toUpperCase();$("selName").textContent=`${t.name} • Lv.${t.level}`;$("selLevel").textContent=t.level;$("selDamage").textContent=Math.round(t.damage);$("selRange").textContent=Math.round(t.range);$("selDesc").textContent=t.desc;$("upgrade").textContent=t.level>=5?"MAX LEVEL":`UPGRADE • $${t.upgradeCost}`;$("upgrade").disabled=t.level>=5||gold<t.upgradeCost}
function updatePanel(){if(selectedTower)openPanel(selectedTower)}
$("closePanel").onclick=()=>{$("panel").classList.add("hidden");selectedTower=null};
$("upgrade").onclick=()=>{if(!selectedTower||selectedTower.level>=5)return;const t=selectedTower;if(gold<t.upgradeCost)return;gold-=t.upgradeCost;t.level++;t.damage=Math.round(t.damage*1.42);t.range+=9;t.rate=Math.max(250,Math.round(t.rate*.91));t.upgradeCost=Math.round(t.upgradeCost*1.55);toast(`${t.name} upgraded to Lv.${t.level}`);burst(t.x,t.y,20);ui()};
$("sell").onclick=()=>{if(!selectedTower)return;gold+=Math.floor(selectedTower.invested*.7);towersPlaced=towersPlaced.filter(x=>x!==selectedTower);selectedTower=null;$("panel").classList.add("hidden");ui()};
document.querySelectorAll(".tower-btn").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tower-btn").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedType=b.dataset.type;selectedTower=null;$("panel").classList.add("hidden")});
$("start").onclick=()=>{if(wave>=20){endGame(true);return}if(!waveRunning)startWave()};
$("hero").onclick=()=>{if(hero){toast(`Hero is already deployed • Level ${hero.level}`);return}if(gold<150){toast("Hero costs $150.");return}gold-=150;hero={x:105,y:600,level:1,cool:0};toast("🦸 Hero deployed — drag it around the battlefield.");ui()};
$("end").onclick=()=>{if(!gameOver)endGame(false)};
$("refresh").onclick=loadScores;
function endGame(victory){if(gameOver)return;gameOver=true;waveRunning=false;$("start").disabled=true;const mult=performance.now()<rushUntil?rush:1;score+=victory?5000:0;ui();submitScore().finally(()=>{const again=confirm(`${victory?"🏆 VICTORY":"💀 GAME OVER"}\nWave ${wave}\nScore ${score.toLocaleString()}\n\nScore submitted. Play again?`);if(again)location.reload()})}
async function submitScore(){try{await fetch("https://firestore.googleapis.com/v1/projects/leaderboard-90b9b/databases/(default)/documents/leaderboard",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields:{game:{stringValue:"defense"},name:{stringValue:String(player)},score:{integerValue:String(Math.round(score))},wave:{integerValue:String(wave)},createdAt:{integerValue:String(Date.now())}}})});}catch(e){console.warn("Leaderboard upload failed",e)}}
async function loadScores(){const ol=$("scores");ol.innerHTML="<li>Loading…</li>";try{const r=await fetch("https://firestore.googleapis.com/v1/projects/leaderboard-90b9b/databases/(default)/documents/leaderboard?pageSize=1000");if(!r.ok)throw Error(r.status);const d=await r.json();const a=(d.documents||[]).map(x=>{const f=x.fields||{};return{game:f.game?.stringValue,name:f.name?.stringValue||"Player",score:Number(f.score?.integerValue||0)}}).filter(x=>x.game==="defense").sort((a,b)=>b.score-a.score).slice(0,10);ol.innerHTML=a.length?a.map((x,i)=>`<li><b>${i+1}. ${String(x.name).replace(/[<>&"]/g,"")}</b><span class="lbscore">${x.score.toLocaleString()}</span></li>`).join(""):"<li>No scores yet — be the first!</li>"}catch(e){ol.innerHTML="<li>Leaderboard unavailable</li>"}}
ui();loadScores();draw();
