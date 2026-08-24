
async function saveDefenseFinalScore(reason){
  if (window.__defenseFirebaseSaved) return;
  window.__defenseFirebaseSaved=true;
  try{
    const finalScore=Number(typeof score!=="undefined"?score:0);
    const finalWave=Number(typeof wave!=="undefined"?wave:0);
    if(typeof window.saveDefenseScoreToFirebase==="function"){
      await window.saveDefenseScoreToFirebase(finalScore,finalWave,reason);
    }
  }catch(e){console.error(e);}
}
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

let gold=250,lives=20,wave=0,score=0,selectedType="arrow",selectedTower=null,towers=[],enemies=[],shots=[],waveRunning=false,spawnLeft=0,spawnTimer=0,last=performance.now(),gameOver=false;

function setMessage(t){msg.textContent=t;clearTimeout(setMessage.t);setMessage.t=setTimeout(()=>msg.textContent="Defend the crystal.",2200)}
function updateUI(){livesEl.textContent=lives;goldEl.textContent=gold;waveEl.textContent=`${wave}/20`;scoreEl.textContent=score;renderScores()}
function renderScores(){let a=JSON.parse(localStorage.getItem("realmScores")||"[]");a=[...a,{name:"YOU",score}].sort((x,y)=>y.score-x.score).slice(0,5);document.getElementById("scores").innerHTML=a.map((x,i)=>`<div class="lb-row"><span>${i+1}. <b>${x.name}</b></span><b>${x.score}</b></div>`).join("")}

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

startBtn.onclick=()=>{if(waveRunning||gameOver)return;if(wave>=20){winGame();return}wave++;waveRunning=true;spawnLeft=7+wave*2;spawnTimer=0;startBtn.disabled=true;setMessage(`Wave ${wave} incoming!`);updateUI()};

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
 if(waveRunning){spawnTimer-=dt*1000;if(spawnLeft>0&&spawnTimer<=0){spawnEnemy();spawnLeft--;spawnTimer=480-Math.min(220,wave*8)} if(spawnLeft<=0&&enemies.length===0){waveRunning=false;startBtn.disabled=false;gold+=35+wave*4;setMessage(`Wave ${wave} cleared! Bonus gold awarded.`);updateUI()}}
 enemies.forEach(e=>moveEnemy(e,dt));
 towers.forEach(t=>{t.cool-=dt*1000;if(t.cool>0)return;let targets=enemies.filter(e=>Math.hypot(e.x-t.x,e.y-t.y)<=t.range);if(!targets.length)return;targets.sort((a,b)=>b.seg-a.seg);shoot(t,targets[0])});
 shots.forEach(s=>{let dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy),step=430*dt;if(d<=step){s.x=s.target.x;s.y=s.target.y;s.life=0; if(s.type==="cannon"){enemies.filter(e=>Math.hypot(e.x-s.x,e.y-s.y)<55).forEach(e=>hit(e,s.damage))}else hit(s.target,s.damage)}else{s.x+=dx/d*step;s.y+=dy/d*step}});
 shots=shots.filter(s=>s.life>0);
}

function hit(e,d){if(!enemies.includes(e))return;e.hp-=d;if(e.hp<=0){gold+=e.reward;score+=e.reward*10;enemies=enemies.filter(x=>x!==e);updateUI()}}

function draw(){
 ctx.clearRect(0,0,W,H);
 let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#193c2a");g.addColorStop(1,"#0b2118");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // subtle forest texture
 for(let i=0;i<75;i++){let x=(i*137)%W,y=(i*83)%H;ctx.fillStyle=i%2?"#204a32":"#1a402c";ctx.beginPath();ctx.arc(x,y,18+(i%4)*4,0,Math.PI*2);ctx.fill()}
 // path
 ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#493d2d";ctx.lineWidth=66;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
 ctx.strokeStyle="#6c5a40";ctx.lineWidth=56;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
 // crystal/base
 ctx.fillStyle="#0a1110";ctx.beginPath();ctx.arc(1010,500,45,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#7fd0d5";ctx.lineWidth=3;ctx.stroke();
 ctx.font="28px sans-serif";ctx.textAlign="center";ctx.fillText("💎",1010,510);
 // pads
 pads.forEach(p=>{let occupied=towers.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<1);ctx.fillStyle=occupied?"#253a2d":"#b58a3a";ctx.globalAlpha=occupied?.35:.8;ctx.beginPath();ctx.arc(p.x,p.y,30,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(!occupied){ctx.strokeStyle="#e3bf63";ctx.lineWidth=2;ctx.stroke()}});
 // towers
 towers.forEach(t=>{let d=types[t.type];if(t===selectedTower){ctx.strokeStyle="#fff2a1";ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,t.range,0,Math.PI*2);ctx.stroke()}ctx.fillStyle="#101915";ctx.beginPath();ctx.arc(t.x,t.y,25,0,Math.PI*2);ctx.fill();ctx.strokeStyle=d.color;ctx.lineWidth=4;ctx.stroke();ctx.font="22px sans-serif";ctx.textAlign="center";ctx.fillText(d.icon,t.x,t.y+8);ctx.font="10px system-ui";ctx.fillStyle="#fff";ctx.fillText("Lv."+t.level,t.x,t.y+39)});
 // enemies
 enemies.forEach(e=>{ctx.fillStyle=e.type==="tank"?"#7c5140":e.type==="runner"?"#c38b48":"#8c6a52";ctx.beginPath();ctx.arc(e.x,e.y,16,0,Math.PI*2);ctx.fill();ctx.font="16px sans-serif";ctx.textAlign="center";ctx.fillText("👹",e.x,e.y+6);ctx.fillStyle="#291511";ctx.fillRect(e.x-19,e.y-27,38,5);ctx.fillStyle="#68c56d";ctx.fillRect(e.x-19,e.y-27,38*Math.max(0,e.hp/e.maxHp),5)});
 // shots
 shots.forEach(s=>{ctx.fillStyle=types[s.type].color;ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill()});
}

function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}
function loseGame(){saveDefenseFinalScore('game-over');gameOver=true;waveRunning=false;startBtn.disabled=true;saveScore();setMessage("💀 The crystal has fallen. Refresh to try again.");}
function winGame(){
  saveDefenseFinalScore('winGame');gameOver=true;saveScore();setMessage("🏆 YOU WIN! All 20 waves defeated.");startBtn.disabled=true}
function saveScore(){let a=JSON.parse(localStorage.getItem("realmScores")||"[]");a.push({name:"YOU",score});a.sort((x,y)=>y.score-x.score);localStorage.setItem("realmScores",JSON.stringify(a.slice(0,10)));renderScores()}
renderScores();updateUI();requestAnimationFrame(loop);