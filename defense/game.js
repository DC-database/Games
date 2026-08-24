const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height;
const livesEl=document.getElementById("lives"),goldEl=document.getElementById("gold"),waveEl=document.getElementById("wave"),scoreEl=document.getElementById("score");
const msg=document.getElementById("message"),startBtn=document.getElementById("startBtn"),upgradeBtn=document.getElementById("upgradeBtn"),sellBtn=document.getElementById("sellBtn");

const pads=[
{x:205,y:175},{x:350,y:150},{x:500,y:205},{x:670,y:155},{x:835,y:220},
{x:255,y:360},{x:430,y:410},{x:610,y:360},{x:770,y:420},{x:920,y:350},
{x:390,y:540},{x:650,y:535}
];

const path=[
{x:-35,y:105},{x:150,y:105},{x:150,y:260},{x:330,y:260},{x:330,y:105},
{x:515,y:105},{x:515,y:300},{x:720,y:300},{x:720,y:145},{x:920,y:145},
{x:920,y:500},{x:1010,y:500}
];

const types={
arrow:{name:"Archer Tower",icon:"🏹",cost:75,desc:"Fast single-target defense",range:145,damage:15,rate:520,color:"#d8a73b"},
cannon:{name:"Cannon Tower",icon:"💣",cost:125,desc:"Area damage and slower fire",range:125,damage:30,rate:1050,color:"#b96f48"},
mage:{name:"Mage Tower",icon:"🔮",cost:175,desc:"Long range, powerful bolts",range:180,damage:48,rate:1350,color:"#a77be8"}
};

let gold=250,lives=20,wave=0,score=0,selectedType="arrow",selectedTower=null,towers=[],enemies=[],shots=[],particles=[],waveRunning=false,spawnLeft=0,spawnTimer=0,last=performance.now(),gameOver=false;
let playerName=localStorage.getItem("realmPlayerName")||"Player";
let gameStarted=false,countdownActive=false;
const playerNameEl=document.getElementById("playerName"), nameModal=document.getElementById("nameModal");
const nameInput=document.getElementById("playerNameInput"), nameStartBtn=document.getElementById("nameStartBtn"), countdownEl=document.getElementById("countdown");
playerNameEl.textContent=playerName;
nameInput.value=playerName==="Player"?"":playerName;

function startCountdown(nextWave=true){
  if(countdownActive||gameOver)return;
  countdownActive=true;
  let n=5;
  countdownEl.textContent=n;
  countdownEl.classList.add("show");
  const timer=setInterval(()=>{
    n--;
    if(n>0){countdownEl.textContent=n}
    else{
      clearInterval(timer);
      countdownEl.textContent="GO!";
      setTimeout(()=>{
        countdownEl.classList.remove("show");
        countdownActive=false;
        beginWave();
      },450);
    }
  },1000);
}
function beginWave(){
  if(gameOver||waveRunning||wave>=20)return;
  wave++;
  waveRunning=true;
  spawnLeft=7+wave*2;
  spawnTimer=0;
  startBtn.disabled=true;
  startBtn.textContent="WAVE IN PROGRESS";
  setMessage(`Wave ${wave} incoming!`);
  updateUI();
}


function setMessage(t){msg.textContent=t;clearTimeout(setMessage.t);setMessage.t=setTimeout(()=>msg.textContent="Defend the crystal.",2200)}
function updateUI(){livesEl.textContent=lives;goldEl.textContent=gold;waveEl.textContent=`${wave}/20`;scoreEl.textContent=score;renderScores()}
function renderScores(){let a=JSON.parse(localStorage.getItem("realmScores")||"[]");a=[...a,{name:playerName,score}].sort((x,y)=>y.score-x.score).slice(0,5);document.getElementById("scores").innerHTML=a.map((x,i)=>`<div class="lb-row"><span>${i+1}. <b>${x.name}</b></span><b>${x.score}</b></div>`).join("")}

document.querySelectorAll(".tower").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tower").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedType=b.dataset.type;selectedTower=null;refreshSelection()});
function refreshSelection(){
  if(selectedTower){let t=selectedTower,def=types[t.type];document.getElementById("selIcon").textContent=def.icon;document.getElementById("selName").textContent=`${def.name} Lv.${t.level}`;document.getElementById("selDesc").textContent=def.desc;upgradeBtn.textContent=`UPGRADE $${t.upgradeCost}`;upgradeBtn.disabled=gold<t.upgradeCost;sellBtn.disabled=false}
  else{let d=types[selectedType];document.getElementById("selIcon").textContent=d.icon;document.getElementById("selName").textContent=d.name;document.getElementById("selDesc").textContent=d.desc;upgradeBtn.textContent=`UPGRADE $100`;upgradeBtn.disabled=true;sellBtn.disabled=true}
}
refreshSelection();

upgradeBtn.onclick=()=>{if(!selectedTower)return;let t=selectedTower;if(gold>=t.upgradeCost){gold-=t.upgradeCost;t.level++;t.damage=Math.round(t.damage*1.35);t.range+=10;t.rate=Math.max(180,Math.round(t.rate*.92));t.upgradeCost=Math.round(t.upgradeCost*1.45);setMessage("Tower upgraded!");updateUI();refreshSelection()}};
sellBtn.onclick=()=>{if(!selectedTower)return;gold+=Math.floor(selectedTower.invested*.65);towers=towers.filter(t=>t!==selectedTower);selectedTower=null;setMessage("Tower sold.");updateUI();refreshSelection()};

canvas.addEventListener("click",e=>{
 const r=canvas.getBoundingClientRect(),sx=W/r.width,sy=H/r.height,x=(e.clientX-r.left)*sx,y=(e.clientY-r.top)*sy;
 let hit=towers.find(t=>Math.hypot(t.x-x,t.y-y)<27);if(hit){selectedTower=hit;refreshSelection();return}
 let p=pads.find(p=>Math.hypot(p.x-x,p.y-y)<34);if(!p||towers.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<1))return;
 let d=types[selectedType];if(gold<d.cost){setMessage("Not enough gold.");return}
 gold-=d.cost;let t={x:p.x,y:p.y,type:selectedType,level:1,damage:d.damage,range:d.range,rate:d.rate,cool:0,upgradeCost:100,invested:d.cost};towers.push(t);selectedTower=t;updateUI();refreshSelection();
});

startBtn.onclick=()=>{
  if(gameOver||countdownActive)return;
  if(wave===0&&!gameStarted){gameStarted=true;startCountdown(true);return}
  if(wave>=20){winGame();return}
};

function spawnEnemy(){
 let hp=35+wave*14,type="grunt",speed=48+wave*1.8,reward=10;
 if(wave>=4&&Math.random()<.22){hp*=1.8;speed*=.72;type="tank";reward=22}
 if(wave>=7&&Math.random()<.18){hp*=.65;speed*=1.55;type="runner";reward=16}
 enemies.push({x:path[0].x,y:path[0].y,seg:0,progress:0,hp,maxHp:hp,speed,type,reward});
}

function moveEnemy(e,dt){
 let target=path[e.seg+1];if(!target)return;
 let dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy),step=e.speed*dt;
 if(d<=step){e.x=target.x;e.y=target.y;e.seg++;if(e.seg>=path.length-1){lives--;enemies=enemies.filter(x=>x!==e);updateUI();if(lives<=0)loseGame();}}
 else{e.x+=dx/d*step;e.y+=dy/d*step}
}

function distanceToPath(){return 0}
function shoot(t,target){shots.push({x:t.x,y:t.y,target,damage:t.damage,type:t.type,life:1});t.cool=t.rate}
function update(dt){
 if(gameOver)return;
 if(waveRunning){spawnTimer-=dt*1000;if(spawnLeft>0&&spawnTimer<=0){spawnEnemy();spawnLeft--;spawnTimer=480-Math.min(220,wave*8)} if(spawnLeft<=0&&enemies.length===0){
  waveRunning=false;
  gold+=35+wave*4;
  updateUI();
  if(wave>=20){winGame()}
  else{setMessage(`Wave ${wave} cleared! Next wave starting soon.`);setTimeout(()=>startCountdown(true),900)}
}}
 enemies.forEach(e=>moveEnemy(e,dt));
 towers.forEach(t=>{t.cool-=dt*1000;if(t.cool>0)return;let targets=enemies.filter(e=>Math.hypot(e.x-t.x,e.y-t.y)<=t.range);if(!targets.length)return;targets.sort((a,b)=>b.seg-a.seg);shoot(t,targets[0])});
 shots.forEach(s=>{let dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy),step=430*dt;if(d<=step){s.x=s.target.x;s.y=s.target.y;s.life=0; if(s.type==="cannon"){enemies.filter(e=>Math.hypot(e.x-s.x,e.y-s.y)<55).forEach(e=>hit(e,s.damage))}else hit(s.target,s.damage)}else{s.x+=dx/d*step;s.y+=dy/d*step}});
 shots=shots.filter(s=>s.life>0);
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});
  particles=particles.filter(p=>p.life>0);
}

function hit(e,d){
  if(!enemies.includes(e))return;
  e.hp-=d;
  for(let i=0;i<5;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*80,vy:(Math.random()-.5)*80,life:.45});
  if(e.hp<=0){gold+=e.reward;score+=e.reward*10;enemies=enemies.filter(x=>x!==e);updateUI()}
}

function roundRect(c,x,y,w,h,r){
  c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}
function shadowEllipse(x,y,rx,ry,a=.25){
  ctx.save();ctx.globalAlpha=a;ctx.fillStyle="#000";
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawTree(x,y,s=1){
  shadowEllipse(x,y+22*s,22*s,8*s,.28);
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  // trunk
  ctx.fillStyle="#6b452d";ctx.beginPath();ctx.roundRect(-5,-2,10,30,4);ctx.fill();
  // layered canopy
  const greens=["#173e29","#1d5635","#2a6940"];
  [[0,-27,19],[13,-13,17],[-13,-12,18],[0,-7,23]].forEach((p,i)=>{
    ctx.fillStyle=greens[i%greens.length];ctx.beginPath();ctx.arc(p[0],p[1],p[2],0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle="#3d7d48";ctx.beginPath();ctx.arc(-6,-28,7,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawRock(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle="#40574b";ctx.beginPath();ctx.moveTo(-18,7);ctx.lineTo(-11,-9);ctx.lineTo(4,-14);ctx.lineTo(18,-5);ctx.lineTo(13,10);ctx.lineTo(-5,14);ctx.closePath();ctx.fill();
  ctx.fillStyle="#60776a";ctx.beginPath();ctx.moveTo(-10,-8);ctx.lineTo(3,-13);ctx.lineTo(12,-5);ctx.lineTo(-2,-2);ctx.closePath();ctx.fill();
  ctx.restore();
}
function drawTower(t){
  const d=types[t.type];
  shadowEllipse(t.x,t.y+20,30,10,.38);
  // base pedestal
  ctx.fillStyle="#17251e";ctx.beginPath();ctx.ellipse(t.x,t.y+9,27,17,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=d.color;ctx.lineWidth=3;ctx.stroke();
  // body
  const body=ctx.createLinearGradient(t.x-18,t.y-24,t.x+18,t.y+18);
  body.addColorStop(0,"#71877a");body.addColorStop(.45,"#3d5147");body.addColorStop(1,"#1d2a24");
  ctx.fillStyle=body;
  roundRect(ctx,t.x-18,t.y-25,36,42,8);ctx.fill();
  // roof
  ctx.fillStyle=d.color;ctx.beginPath();ctx.moveTo(t.x-25,t.y-19);ctx.lineTo(t.x,t.y-39);ctx.lineTo(t.x+25,t.y-19);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#e7d18b";ctx.lineWidth=2;ctx.stroke();
  // weapon / magical core
  ctx.save();ctx.translate(t.x,t.y-7);
  if(t.type==="arrow"){
    ctx.strokeStyle="#c88d55";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,13,-1.15,1.15);ctx.stroke();
    ctx.strokeStyle="#e4d3ad";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,-11);ctx.lineTo(13,5);ctx.stroke();
  } else if(t.type==="cannon"){
    ctx.fillStyle="#242d29";ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#0d1411";ctx.beginPath();ctx.roundRect(-4,-20,8,22,3);ctx.fill();
  } else {
    ctx.shadowBlur=18;ctx.shadowColor="#b486ff";ctx.fillStyle="#b486ff";ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle="#e8dcff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(7,0);ctx.moveTo(0,-7);ctx.lineTo(0,7);ctx.stroke();
  }
  ctx.restore();
  // level badge
  ctx.fillStyle="#0b1410";ctx.strokeStyle="#bfa15a";ctx.lineWidth=1;ctx.beginPath();ctx.arc(t.x+22,t.y-24,9,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#f7e4a4";ctx.font="bold 9px system-ui";ctx.textAlign="center";ctx.fillText(t.level,t.x+22,t.y-21);
  if(t===selectedTower){
    ctx.strokeStyle="#f7df83";ctx.lineWidth=2;ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(t.x,t.y,t.range,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }
}
function drawEnemy(e){
  shadowEllipse(e.x,e.y+15,20,7,.38);
  ctx.save();ctx.translate(e.x,e.y);
  const scale=e.type==="tank"?1.22:e.type==="runner"?.88:1;
  ctx.scale(scale,scale);
  // body
  let c=e.type==="tank"?"#70483d":e.type==="runner"?"#a46d3e":"#695548";
  const grad=ctx.createLinearGradient(-14,-18,14,18);grad.addColorStop(0,"#b69a79");grad.addColorStop(.35,c);grad.addColorStop(1,"#2c241f");
  ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,2,16,18,0,0,Math.PI*2);ctx.fill();
  // armor / belly
  if(e.type==="tank"){ctx.fillStyle="#454b45";ctx.beginPath();ctx.ellipse(0,2,13,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#6c776d";ctx.beginPath();ctx.arc(-5,-4,5,0,Math.PI*2);ctx.fill()}
  // ears/horns
  ctx.fillStyle="#4a382e";ctx.beginPath();ctx.moveTo(-12,-13);ctx.lineTo(-20,-24);ctx.lineTo(-4,-18);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(12,-13);ctx.lineTo(20,-24);ctx.lineTo(4,-18);ctx.closePath();ctx.fill();
  // eyes
  ctx.fillStyle="#f1c45d";ctx.beginPath();ctx.arc(-6,-2,3,0,Math.PI*2);ctx.arc(6,-2,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#1b110d";ctx.beginPath();ctx.arc(-6,-2,1.2,0,Math.PI*2);ctx.arc(6,-2,1.2,0,Math.PI*2);ctx.fill();
  ctx.restore();
  // health bar
  ctx.fillStyle="#1b120f";roundRect(ctx,e.x-21,e.y-30,42,6,3);ctx.fill();
  ctx.fillStyle=e.hp/e.maxHp>.45?"#65c86b":"#e39b4f";roundRect(ctx,e.x-20,e.y-29,40*Math.max(0,e.hp/e.maxHp),4,2);ctx.fill();
}
function drawCrystal(){
  shadowEllipse(1010,518,44,13,.45);
  ctx.save();ctx.translate(1010,492);
  ctx.fillStyle="#193b3b";ctx.beginPath();ctx.moveTo(-39,25);ctx.lineTo(-29,-5);ctx.lineTo(0,-28);ctx.lineTo(29,-5);ctx.lineTo(39,25);ctx.closePath();ctx.fill();
  const g=ctx.createLinearGradient(-15,-35,20,25);g.addColorStop(0,"#d7ffff");g.addColorStop(.35,"#73d5d6");g.addColorStop(1,"#2b7077");
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-25,18);ctx.lineTo(-17,-20);ctx.lineTo(0,-37);ctx.lineTo(17,-20);ctx.lineTo(25,18);ctx.lineTo(0,28);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#c9ffff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(0,25);ctx.moveTo(-16,-18);ctx.lineTo(0,0);ctx.lineTo(16,-18);ctx.stroke();
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);
  // atmospheric background
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#214b34");bg.addColorStop(.58,"#163b2a");bg.addColorStop(1,"#0a2118");
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // distant hills
  ctx.fillStyle="#102d21";ctx.beginPath();ctx.moveTo(0,170);ctx.quadraticCurveTo(160,85,330,175);ctx.quadraticCurveTo(510,65,690,170);ctx.quadraticCurveTo(870,90,1100,175);ctx.lineTo(1100,0);ctx.lineTo(0,0);ctx.closePath();ctx.fill();
  // forest
  [[55,70,1.2],[265,55,1.1],[450,70,1.25],[690,58,1.15],[875,70,1.2],[1045,78,1.15],
   [80,580,1.3],[185,610,1.0],[1010,620,1.3],[560,610,.9]].forEach(p=>drawTree(...p));
  [[75,215,.8],[450,500,.9],[845,560,1],[1025,240,.8],[555,55,.65]].forEach(p=>drawRock(...p));
  // road shadow and road
  ctx.lineCap="round";ctx.lineJoin="round";
  ctx.strokeStyle="#09150f";ctx.lineWidth=76;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
  const road=ctx.createLinearGradient(0,70,0,530);road.addColorStop(0,"#8b7451");road.addColorStop(.5,"#6e5b42");road.addColorStop(1,"#554631");
  ctx.strokeStyle=road;ctx.lineWidth=64;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
  ctx.strokeStyle="#a58b64";ctx.lineWidth=2;ctx.setLineDash([5,10]);ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
  // build pads
  pads.forEach(p=>{
    let occupied=towers.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<1);
    shadowEllipse(p.x,p.y+15,30,10,.25);
    ctx.fillStyle=occupied?"#263b30":"#b89243";ctx.globalAlpha=occupied?.7:.85;ctx.beginPath();ctx.ellipse(p.x,p.y,29,20,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle=occupied?"#46604f":"#f1d57b";ctx.lineWidth=2;ctx.stroke();
    if(!occupied){ctx.fillStyle="#fff1b0";ctx.font="bold 18px system-ui";ctx.textAlign="center";ctx.fillText("+",p.x,p.y+6)}
  });
  drawCrystal();
  towers.forEach(drawTower);
  enemies.forEach(drawEnemy);
  // projectile effects
  shots.forEach(s=>{
    const d=types[s.type],len=18;
    ctx.save();ctx.shadowBlur=12;ctx.shadowColor=d.color;ctx.strokeStyle=d.color;ctx.lineWidth=s.type==="cannon"?6:3;
    ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-len,s.y);ctx.stroke();ctx.restore();
    if(s.type==="cannon"){ctx.fillStyle="#e5a25a";ctx.beginPath();ctx.arc(s.x,s.y,6,0,Math.PI*2);ctx.fill()}
  });
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.45);ctx.fillStyle="#e7bd65";ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;
  // vignette
  const v=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,680);v.addColorStop(0,"transparent");v.addColorStop(1,"#0008");ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}
function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}
function loseGame(){gameOver=true;waveRunning=false;startBtn.disabled=true;saveScore();setMessage("💀 The crystal has fallen. Refresh to try again.");}
function winGame(){gameOver=true;saveScore();setMessage("🏆 YOU WIN! All 20 waves defeated.");startBtn.disabled=true;startBtn.textContent="GAME COMPLETE"}
function saveScore(){let a=JSON.parse(localStorage.getItem("realmScores")||"[]");a.push({name:playerName,score});a.sort((x,y)=>y.score-x.score);localStorage.setItem("realmScores",JSON.stringify(a.slice(0,10)));renderScores()}
nameStartBtn.onclick=()=>{
  const n=nameInput.value.trim();
  playerName=n||"Player";
  localStorage.setItem("realmPlayerName",playerName);
  playerNameEl.textContent=playerName;
  nameModal.style.display="none";
  gameStarted=true;
  startCountdown(true);
};
nameInput.addEventListener("keydown",e=>{if(e.key==="Enter")nameStartBtn.click()});
renderScores();updateUI();requestAnimationFrame(loop);