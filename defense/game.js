const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height;
const ASSET={};
const assetFiles={
  castle:"assets/buildings/castle.png", tower:"assets/buildings/tower.png", archery:"assets/buildings/archery.png", monastery:"assets/buildings/monastery.png",
  pawn:"assets/units/pawn-run.png", warrior:"assets/units/warrior-run.png", archer:"assets/units/archer-run.png", arrow:"assets/fx/arrow.png",
  grass:"assets/terrain/grass-texture.png", rock1:"assets/deco/rock1.png", rock2:"assets/deco/rock2.png", tree1:"assets/deco/tree1.png", tree2:"assets/deco/tree2.png", bush1:"assets/deco/bush1.png", bush2:"assets/deco/bush2.png"
};
Object.entries(assetFiles).forEach(([k,src])=>{const im=new Image();im.src=src;ASSET[k]=im;});
function imageReady(im){return im && im.complete && im.naturalWidth>0}
function sprite(im,frames,frame,x,y,w,h,flip=false){if(!imageReady(im))return;const fw=im.naturalWidth/frames,fh=im.naturalHeight;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(im,Math.floor(frame)%frames*fw,0,fw,fh,-w/2,-h,w,h);ctx.restore()}
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
  setMessage(`WAVE ${wave} INCOMING`);
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

let canvasPointerStart=null;
canvas.addEventListener("pointerdown",e=>{
 if(e.pointerType==="touch"){
   e.preventDefault();
   try{canvas.setPointerCapture(e.pointerId)}catch(_){}
 }
 canvasPointerStart={x:e.clientX,y:e.clientY};
},{passive:false});

canvas.addEventListener("pointerup",e=>{
 if(canvasPointerStart){
   const moved=Math.hypot(e.clientX-canvasPointerStart.x,e.clientY-canvasPointerStart.y);
   canvasPointerStart=null;
   if(moved>12)return;
 }
 e.preventDefault();
 const r=canvas.getBoundingClientRect(),sx=W/r.width,sy=H/r.height,x=(e.clientX-r.left)*sx,y=(e.clientY-r.top)*sy;
 let hit=towers.find(t=>Math.hypot(t.x-x,t.y-y)<27);
 if(hit){selectedTower=hit;refreshSelection();return}
 let p=pads.find(p=>Math.hypot(p.x-x,p.y-y)<34);
 if(!p||towers.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<1))return;
 let d=types[selectedType];
 if(gold<d.cost){setMessage("Not enough gold.");return}
 gold-=d.cost;
 let t={x:p.x,y:p.y,type:selectedType,level:1,damage:d.damage,range:d.range,rate:d.rate,cool:0,upgradeCost:100,invested:d.cost};
 towers.push(t);selectedTower=t;updateUI();refreshSelection();
},{passive:false});

canvas.addEventListener("pointercancel",()=>{canvasPointerStart=null},{passive:true});

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
  else{setMessage(`WAVE ${wave} CLEARED • NEXT WAVE SOON`);setTimeout(()=>startCountdown(true),900)}
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
  shadowEllipse(t.x,t.y+18,34,11,.30);
  const key=t.type==="arrow"?"archery":t.type==="cannon"?"tower":"monastery";
  const im=ASSET[key];
  if(imageReady(im)){
    const ratio=im.naturalWidth/im.naturalHeight;
    const h=t.type==="arrow"?86:t.type==="cannon"?92:88;
    const w=h*ratio;
    ctx.drawImage(im,t.x-w/2,t.y-h+17,w,h);
  }
  ctx.fillStyle="#172019cc";ctx.strokeStyle=d.color;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(t.x+23,t.y-30,10,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#fff3bd";ctx.font="bold 9px system-ui";ctx.textAlign="center";ctx.fillText(t.level,t.x+23,t.y-27);
  if(t===selectedTower){
    ctx.strokeStyle="#f7df83aa";ctx.lineWidth=2;ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(t.x,t.y,t.range,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }
}
function drawEnemy(e){
  shadowEllipse(e.x,e.y+13,18,6,.28);
  const key=e.type==="tank"?"warrior":e.type==="runner"?"archer":"pawn";
  const im=ASSET[key];
  const frames=key==="archer"?4:6;
  const frame=Math.floor(performance.now()/115)%frames;
  const h=e.type==="tank"?58:e.type==="runner"?50:48;
  const w=h;
  if(imageReady(im)) sprite(im,frames,frame,e.x,e.y+3,w,h,false);
  else {ctx.fillStyle="#a44";ctx.beginPath();ctx.arc(e.x,e.y,12,0,Math.PI*2);ctx.fill()}
  // compact health bar
  ctx.fillStyle="#1a1611";roundRect(ctx,e.x-19,e.y-30,38,5,2);ctx.fill();
  ctx.fillStyle=e.hp/e.maxHp>.45?"#65c86b":"#e39b4f";roundRect(ctx,e.x-18,e.y-29,36*Math.max(0,e.hp/e.maxHp),3,1);ctx.fill();
}
function drawCrystal(){
  const x=1000,y=505;
  shadowEllipse(x,y+28,62,15,.34);
  const im=ASSET.castle;
  if(imageReady(im)){
    const h=128,w=h*(im.naturalWidth/im.naturalHeight);
    ctx.drawImage(im,x-w/2,y-h+35,w,h);
  }
  ctx.fillStyle="#0b1710cc";roundRect(ctx,x-50,y+30,100,8,4);ctx.fill();
  ctx.fillStyle="#64d27b";roundRect(ctx,x-48,y+32,96*Math.max(0,lives/20),4,2);ctx.fill();
}
function draw(){
  ctx.clearRect(0,0,W,H);
  // Tiny Swords grass texture, tiled cleanly across the battlefield.
  if(imageReady(ASSET.grass)){
    const pattern=ctx.createPattern(ASSET.grass,"repeat");
    ctx.fillStyle=pattern;ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#17351f22";ctx.fillRect(0,0,W,H);
  }else{ctx.fillStyle="#78a94b";ctx.fillRect(0,0,W,H)}

  // Soft vignette and a darker playable center.
  const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,"#19341d33");shade.addColorStop(.55,"#0f2a1b11");shade.addColorStop(1,"#07150d44");ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);

  // Winding path: intentionally quieter than the old giant brown road.
  ctx.lineCap="round";ctx.lineJoin="round";
  ctx.strokeStyle="#3b3023aa";ctx.lineWidth=82;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
  ctx.strokeStyle="#806a4aaa";ctx.lineWidth=68;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
  ctx.strokeStyle="#a38b63aa";ctx.lineWidth=2;ctx.setLineDash([4,10]);ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);

  // Asset decorations around, not over, the playable path.
  const deco=[
    [65,55,"tree1",.70],[205,48,"tree2",.62],[350,65,"tree1",.72],[515,48,"tree2",.60],[700,60,"tree1",.68],[875,48,"tree2",.62],[1040,62,"tree1",.68],
    [55,570,"tree2",.68],[175,600,"tree1",.60],[320,590,"bush1",.72],[500,610,"tree2",.58],[760,600,"tree1",.62],[900,585,"bush2",.72],[1050,600,"tree2",.65],
    [85,190,"rock1",.9],[455,500,"rock2",.85],[840,545,"rock1",.8],[1040,250,"rock2",.8],[555,50,"rock1",.65]
  ];
  deco.forEach(([x,y,k,s])=>{
    const im=ASSET[k];if(!imageReady(im))return;
    const frames=im.naturalWidth>im.naturalHeight?Math.floor(im.naturalWidth/192):1;
    const frame=frames>1?Math.floor(performance.now()/900)%frames:0;
    const fh=im.naturalHeight,fw=im.naturalWidth/frames;
    const h=(k.startsWith("tree")?92: k.startsWith("bush")?48:34)*s,w=h*fw/fh;
    ctx.globalAlpha=.95;ctx.drawImage(im,frame*fw,0,fw,fh,x-w/2,y-h+10,w,h);ctx.globalAlpha=1;
  });

  // Build pads: small, clean golden plots.
  pads.forEach(p=>{
    let occupied=towers.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<1);
    shadowEllipse(p.x,p.y+12,27,8,.20);
    ctx.fillStyle=occupied?"#30432f":"#b18b45";ctx.globalAlpha=occupied?.55:.78;ctx.beginPath();ctx.ellipse(p.x,p.y,27,17,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle=occupied?"#66765b":"#f2d789";ctx.lineWidth=1.5;ctx.stroke();
    if(!occupied){ctx.fillStyle="#fff1b0";ctx.font="bold 16px system-ui";ctx.textAlign="center";ctx.fillText("+",p.x,p.y+5)}
  });

  drawCrystal();
  towers.forEach(drawTower);
  enemies.forEach(drawEnemy);

  // Projectiles use the actual Tiny Swords arrow asset where possible.
  shots.forEach(s=>{
    const im=ASSET.arrow;
    if(imageReady(im)){
      const ang=Math.atan2(s.target.y-s.y,s.target.x-s.x);
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(ang);ctx.drawImage(im,-14,-5,28,10);ctx.restore();
    }else{
      ctx.strokeStyle=types[s.type].color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-15,s.y);ctx.stroke();
    }
  });
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.45);ctx.fillStyle="#f5d36b";ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;

  const v=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,680);v.addColorStop(0,"transparent");v.addColorStop(1,"#0006");ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
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
// Mobile-friendly controls: normal click remains the primary activation,
// while touch-action: manipulation prevents the browser from treating taps as scrolling/zoom gestures.
