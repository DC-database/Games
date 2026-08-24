const firebaseConfig={
 apiKey:"AIzaSyC2jNNzAkghm5VE6KLOeGPtd3CCTzpw3qo",
 authDomain:"leaderboard-90b9b.firebaseapp.com",
 projectId:"leaderboard-90b9b",
 storageBucket:"leaderboard-90b9b.firebasestorage.app",
 messagingSenderId:"891059392275",
 appId:"1:891059392275:web:757305992c2d83d39214e6",
 measurementId:"G-RXNVYRFXC5"
};
const FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/leaderboard-90b9b/databases/(default)/documents/leaderboard";
const FIREBASE_API_KEY=firebaseConfig.apiKey;
const FIRESTORE_COLLECTION_URL=`${FIRESTORE_URL}?key=${encodeURIComponent(FIREBASE_API_KEY)}`;

const N=10;
const COLORS=["#ff4f9a","#8d62ff","#ff5b54","#39b8ff","#41d68a","#ffd34f","#27d5c7","#ff9d38"];
const SHAPES=[
 [[0,0],[1,0],[2,0],[3,0]],
 [[0,0],[0,1],[1,1],[2,1]],
 [[1,0],[0,1],[1,1],[2,1]],
 [[0,0],[1,0],[0,1],[1,1]],
 [[0,0],[1,0],[1,1],[2,1]],
 [[0,0],[0,1],[0,2],[1,2]],
 [[0,0],[1,0],[2,0],[2,1],[2,2]],
 [[0,0],[0,1],[1,1],[2,1],[2,2]],
 [[0,0],[1,0],[2,0],[1,1]]
];

let board=[],pieces=[],score=0,best=Number(localStorage.blocksBest||0);
const START_TIME=120, MOVE_BONUS=3, STAGE_CLEAR_BONUS=30, MAX_TIME=180;
let timeLeft=START_TIME, timerHandle=null, stage=1, stageClearCount=0;
let player=(localStorage.blocksPlayer||"").trim();
let dragging=null,dragGhost=null,activePointerId=null,touchDragIndex=null,touchActive=false,clearAnimating=false,gameEnded=false;
let runStartedAt=0, runSeconds=0, rushActive=false, rushUntil=0, rushTimer=null, comboCount=0, lastClearAt=0, submitted=false, audioCtx=null, audioEnabled=localStorage.blocksSound!=="off";

const $=id=>document.getElementById(id);
function ensurePlayer(){
 if(!player){
   const entered=prompt("Enter your player name:","Player");
   player=(entered||"Player").trim().slice(0,18)||"Player";
   localStorage.blocksPlayer=player;
 }
 $("player").textContent=player;
}
const SFX_FILES={
 place:'assets/sfx/place.wav',
 clear:'assets/sfx/line-clear.wav',
 bonus:'assets/sfx/time-bonus.wav',
 stage:'assets/sfx/stage-clear.wav',
 warning:'assets/sfx/warning.wav',
 tick:'assets/sfx/countdown-tick.wav',
 gameover:'assets/sfx/game-over.wav',
 click:'assets/sfx/click.wav'
};
const audioPool={};
function initAudio(){
 if(!audioEnabled)return;
 try{
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  Object.keys(SFX_FILES).forEach(name=>{
   if(!audioPool[name]){
    const a=new Audio(SFX_FILES[name]);
    a.preload='auto'; a.volume=.55;
    audioPool[name]=a;
   }
  });
 }catch(_){ }
}
function tone(freq,duration=0.08,type='sine',gain=0.045,delay=0){
 if(!audioEnabled)return;
 try{
  if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,audioCtx.currentTime+delay);
  g.gain.exponentialRampToValueAtTime(gain,audioCtx.currentTime+delay+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+delay+duration);
  o.connect(g).connect(audioCtx.destination);
  o.start(audioCtx.currentTime+delay);o.stop(audioCtx.currentTime+delay+duration+0.02);
 }catch(_){ }
}
function fallbackSfx(name){
 const map={
  place:[[420,.06,'sine',.035,0]],
  clear:[[520,.08,'triangle',.05,0],[740,.1,'triangle',.05,.07]],
  bonus:[[660,.08,'sine',.05,0],[880,.1,'sine',.05,.08],[1100,.14,'triangle',.055,.17]],
  stage:[[440,.1,'triangle',.045,0],[660,.1,'triangle',.05,.1],[990,.18,'triangle',.06,.2]],
  warning:[[240,.08,'square',.03,0],[240,.08,'square',.03,.18]],
  tick:[[700,.045,'square',.025,0]],
  gameover:[[220,.16,'sawtooth',.05,0],[150,.22,'sawtooth',.045,.16]],
  click:[[380,.045,'sine',.025,0]]
 };
 (map[name]||[]).forEach(a=>tone(...a));
}
function sfx(name){
 if(!audioEnabled)return;
 initAudio();
 const base=audioPool[name];
 if(base){
  try{
   const a=base.cloneNode(true); a.volume=base.volume; a.currentTime=0;
   const p=a.play(); if(p&&p.catch)p.catch(()=>fallbackSfx(name));
   return;
  }catch(_){ }
 }
 fallbackSfx(name);
}
function toggleSound(){
 audioEnabled=!audioEnabled;localStorage.blocksSound=audioEnabled?'on':'off';
 $('sound').textContent=audioEnabled?'🔊':'🔇'; if(audioEnabled){initAudio();sfx('click');}
}
function startRun(){
 if(gameEnded)return;
 if(!runStartedAt){runStartedAt=Date.now();startTimer();sfx('click');}
}
function startTimer(){
 stopRunClock();
 timerHandle=setInterval(()=>{
   if(gameEnded)return;
   timeLeft=Math.max(0,timeLeft-0.1);
   updateTimerUI();
   if(timeLeft<=0){timeLeft=0;updateTimerUI();gameOver('TIME');}
 },100);
 updateTimerUI();
}
function updateTimerUI(){
 const sec=Math.ceil(timeLeft);
 const m=Math.floor(sec/60),s=sec%60;
 const text=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
 $('timer').textContent=text;
 $('timer').classList.toggle('danger',sec<=10);
 $('timer').classList.toggle('warning',sec<=30&&sec>10);
 if(sec>0&&sec<=10&&sec!==updateTimerUI.lastSec){sfx(sec<=5?'tick':'warning');updateTimerUI.lastSec=sec;}
}
function addTime(seconds,label){
 const before=timeLeft;timeLeft=Math.min(MAX_TIME,timeLeft+seconds);
 updateTimerUI();
 const toast=document.createElement('div');toast.className='time-bonus';toast.textContent=`+${Math.round(timeLeft-before)} SEC`;
 document.body.appendChild(toast);setTimeout(()=>toast.remove(),1000);
 sfx(seconds>=20?'bonus':'place');
}
function stopRunClock(){
 if(timerHandle){clearInterval(timerHandle);timerHandle=null;}
 if(rushTimer){clearInterval(rushTimer);rushTimer=null;}
}
function runBucket(){
 const elapsed=START_TIME-Math.floor(timeLeft);
 if(elapsed<120)return 'under_2_minutes';
 if(elapsed<300)return 'under_5_minutes';
 return '5_plus_minutes';
}
function updateRushUI(){}
function scoreMultiplier(){return stage>=5?2:stage>=3?1.5:1;}
function rotate(shape){
 let a=shape.map(([x,y])=>[y,-x]);
 let minX=Math.min(...a.map(p=>p[0])),minY=Math.min(...a.map(p=>p[1]));
 return a.map(([x,y])=>[x-minX,y-minY]);
}
function makePiece(){
 let shape=SHAPES[Math.floor(Math.random()*SHAPES.length)].map(p=>p.slice());
 for(let i=Math.floor(Math.random()*4);i--;)shape=rotate(shape);
 return {shape,color:COLORS[Math.floor(Math.random()*COLORS.length)],used:false};
}
function fit(shape,r,c){
 return shape.every(([x,y])=>{
   const rr=r+y,cc=c+x;
   return rr>=0&&rr<N&&cc>=0&&cc<N&&!board[rr][cc];
 });
}
function cellFromPoint(x,y){
 const rect=$("board").getBoundingClientRect(),pad=7,gap=1;
 const inner=rect.width-pad*2-gap*(N-1),cell=inner/N;
 if(x<rect.left+pad||x>rect.right-pad||y<rect.top+pad||y>rect.bottom-pad)return null;
 const c=Math.floor((x-rect.left-pad)/(cell+gap)),r=Math.floor((y-rect.top-pad)/(cell+gap));
 return r>=0&&r<N&&c>=0&&c<N?{r,c}:null;
}
const TOUCH_LIFT_PX=140; // invisible magnetic repulsion: keeps the lifted block well above the fingertip
function dragPoint(x,y){
 // Project the finger onto the board. The finger may stay completely
 // outside the board; the logical piece position is clamped to the board.
 const rect=$("board").getBoundingClientRect();
 const pad=9;
 const minX=rect.left+pad, maxX=rect.right-pad;
 const minY=rect.top+pad, maxY=rect.bottom-pad;
 return {
   x:Math.max(minX,Math.min(maxX,x)),
   y:Math.max(minY,Math.min(maxY,y-TOUCH_LIFT_PX))
 };
}
function clearPreview(){
 document.querySelectorAll(".cell.preview,.cell.invalid").forEach(e=>e.classList.remove("preview","invalid"));
}
function showPreview(point){
 clearPreview();if(!dragging)return;
 const cell=cellFromPoint(point.x,point.y);if(!cell)return;
 const valid=fit(dragging.shape,cell.r,cell.c);
 dragging._dragCell=cell;
 dragging.shape.forEach(([x,y])=>{
  const rr=cell.r+y,cc=cell.c+x;
  if(rr>=0&&rr<N&&cc>=0&&cc<N){
   const e=document.querySelector(`.cell[data-r="${rr}"][data-c="${cc}"]`);
   if(e){
    e.classList.add(valid?"preview":"invalid");
    if(valid)e.style.setProperty("--preview",dragging.color+"88");
   }
  }
 });
}
function makeDragGhost(piece){
 if(dragGhost)dragGhost.remove();
 dragGhost=document.createElement("div");
 dragGhost.className="dragGhost";
 const sh=document.createElement("div");sh.className="shape";
 for(let y=0;y<5;y++)for(let x=0;x<5;x++){
  const m=document.createElement("i");m.className="mini";
  const on=piece.shape.some(([sx,sy])=>sx===x&&sy===y);
  if(on){m.style.background=piece.color;m.dataset.empty="0"}else{m.style.background="transparent";m.dataset.empty="1"}
  sh.appendChild(m);
 }
 dragGhost.appendChild(sh);document.body.appendChild(dragGhost);
}
function moveGhost(x,y){
 if(!dragGhost||!dragging)return;
 const point=dragPoint(x,y);
 const cell=cellFromPoint(point.x,point.y);
 const board=$("board").getBoundingClientRect();
 const pad=9,gap=2;
 const inner=board.width-pad*2-gap*(N-1);
 const cellSize=inner/N;
 // The ghost's 5x5 logical grid uses exactly the board cell geometry,
 // so its visible blocks and the board preview occupy the same cells.
 const gridW=cellSize*5+gap*4;
 const gridH=gridW;
 let left,top;
 if(cell){
   left=board.left+pad+cell.c*(cellSize+gap);
   top=board.top+pad+cell.r*(cellSize+gap);
 }else{
   left=point.x-gridW/2; top=point.y-gridH/2;
 }
 dragGhost.style.width=gridW+"px";
 dragGhost.style.height=gridH+"px";
 dragGhost.style.left=left+"px";
 dragGhost.style.top=top+"px";
 dragGhost.style.transform="translate(0,0)";
 dragGhost.style.setProperty("--drag-cell",cellSize+"px");
}
function moveDrag(x,y){
 const p=dragPoint(x,y);
 showPreview(p);
 moveGhost(x,y);
}

function beginDrag(index,e){
 const p=pieces[index];
 if(!p||p.used)return;
 e.preventDefault();
 startRun();
 dragging=p;
 activePointerId=e.pointerId;
 makeDragGhost(p);
 try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
 e.currentTarget.classList.add("selected");
 moveDrag(e.clientX,e.clientY);
}
function cancelDrag(){
 if(dragGhost)dragGhost.remove();
 dragGhost=null;
 clearPreview();
 dragging=null;
 activePointerId=null;
 document.querySelectorAll('.piece.selected').forEach(e=>e.classList.remove('selected'));
 render();
 $("message").textContent="Piece returned.";
}
function endDrag(e){
 if(!dragging)return;
 const p=dragging;
 const target=dragPoint(e.clientX,e.clientY);
 const cell=cellFromPoint(target.x,target.y);
 const can=!!cell&&fit(p.shape,cell.r,cell.c);

 if(!can){
   $("message").textContent="Move over a valid position and release.";
   if(dragGhost)dragGhost.remove();
   dragGhost=null;clearPreview();dragging=null;activePointerId=null;
   document.querySelectorAll(".piece.selected").forEach(e=>e.classList.remove("selected"));
   render();
   return;
 }

 p.shape.forEach(([x,y])=>board[cell.r+y][cell.c+x]=p.color);
 p.used=true;

 const lines=findCompletedLines();
 const now=Date.now();
 if(lines.count){
   comboCount=(now-lastClearAt<5000)?comboCount+1:1;
   lastClearAt=now;
 }else{
   comboCount=0;
 }
 let gained=p.shape.length*10;
 if(lines.count)gained+=lines.count===1?100:lines.count===2?250:500+lines.count*100;
 if(comboCount>1)gained+=Math.min(1000,(comboCount-1)*150);
 const mult=scoreMultiplier();
 gained*=mult;
 score+=Math.round(gained);
 gained=Math.round(gained);
 addTime(MOVE_BONUS,"+3 SEC");
 best=Math.max(best,score);localStorage.blocksBest=best;
 sfx(lines.count?"clear":"place");
 $('combo').textContent=`COMBO ×${Math.max(1,comboCount||1)}${mult>1?'  ⚡×2':''}`;

 if(dragGhost)dragGhost.remove();
 dragGhost=null;clearPreview();dragging=null;activePointerId=null;
 document.querySelectorAll(".piece.selected").forEach(e=>e.classList.remove("selected"));

 if(lines.count){
   $("message").textContent=`✨ ${lines.count} line${lines.count>1?"s":""} clearing!`;
   render();
   animateClearCells(lines.cells,()=>{
     removeCompletedLines(lines);
     celebrateClear(gained,lines.count,lines.cells);
     if(isBoardEmpty()){
       stageClearCount++;
       const bonus=500+stage*250;
       score+=bonus;
       addTime(STAGE_CLEAR_BONUS,"+30 SEC");
       stage++;
       sfx('stage');
       showStageTransition(bonus);
     } else {
       $("message").textContent=`🎉 ${lines.count} line${lines.count>1?"s":""} cleared!`;
     }
     if(pieces.every(x=>x.used))pieces=[makePiece(),makePiece(),makePiece()];
     render();
     if(!hasAnyMove())gameOver('NO_MOVES');
   });
 }else{
   if(pieces.every(x=>x.used))pieces=[makePiece(),makePiece(),makePiece()];
   animateScoreValue(score-gained,score,220);
   $("message").textContent="Good move. Keep building.";
   render();
   if(!hasAnyMove())gameOver();
 }
}

function animateScoreValue(from,to,duration=520){
 const el=$("score");
 const start=performance.now();
 const tick=(now)=>{
   const p=Math.min(1,(now-start)/duration);
   const eased=1-Math.pow(1-p,3);
   el.textContent=Math.round(from+(to-from)*eased).toLocaleString();
   if(p<1)requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
function celebrateClear(points, lines, cells){
 const board=$("board");
 const rect=board.getBoundingClientRect();

 // Strong board flash.
 const flash=document.createElement("div");
 flash.className="clear-flash";
 flash.style.left=rect.left+"px";
 flash.style.top=rect.top+"px";
 flash.style.width=rect.width+"px";
 flash.style.height=rect.height+"px";
 document.body.appendChild(flash);
 setTimeout(()=>flash.remove(),360);

 // Large confetti/firework burst.
 const cx=rect.left+rect.width/2, cy=rect.top+rect.height*.42;
 const colors=["#ff4f9a","#8d62ff","#39b8ff","#41d68a","#ffd34f","#ff5b54","#fff"];
 for(let i=0;i<55;i++){
   const p=document.createElement("i");
   p.className="confetti";
   p.style.left=cx+"px"; p.style.top=cy+"px";
   p.style.background=colors[i%colors.length];
   const a=(Math.PI*2*i/55)+(Math.random()-.5)*.3;
   const d=45+Math.random()*150;
   p.style.setProperty("--dx",Math.cos(a)*d+"px");
   p.style.setProperty("--dy",Math.sin(a)*d-30+"px");
   p.style.setProperty("--rot",(Math.random()*720-360)+"deg");
   document.body.appendChild(p);
   setTimeout(()=>p.remove(),950);
 }

 // Big visible score pop.
 const pop=document.createElement("div");
 pop.className="big-score-pop";
 pop.innerHTML=`<b>+${points.toLocaleString()}</b><span>${lines>1?"COMBO ×"+lines:"CLEAR!"}</span>`;
 pop.style.left=cx+"px"; pop.style.top=(cy-15)+"px";
 document.body.appendChild(pop);
 setTimeout(()=>pop.remove(),1050);

 const oldScore=score-points;
 animateScoreValue(oldScore,score);
}
function animateClearCells(cells,done){
 const board=$("board");
 cells.forEach(([r,c])=>{
   const el=board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
   if(el)el.classList.add("clear-pop");
 });
 setTimeout(done,300);
}

function isBoardEmpty(){return board.every(row=>row.every(cell=>!cell));}
function showStageTransition(bonus){
 document.body.dataset.stage=String(stage);
 const el=document.createElement('div');el.className='stage-transition';
 el.innerHTML=`<small>AREA CLEARED</small><strong>STAGE ${stage}</strong><span>+${bonus.toLocaleString()} POINTS</span><em>NEW AREA</em>`;
 document.body.appendChild(el);setTimeout(()=>el.remove(),1700);
 $('message').textContent=`🌍 Stage ${stage} — new area!`;
}
function stageName(){const names=['CITY','FOREST','DESERT','ICE','VOLCANO','NEON CITY','SPACE','UNKNOWN'];return names[Math.min(stage-1,names.length-1)];}

function findCompletedLines(){
 let rows=[],cols=[],cells=[];
 for(let r=0;r<N;r++)if(board[r].every(Boolean))rows.push(r);
 for(let c=0;c<N;c++)if(board.every(row=>row[c]))cols.push(c);
 rows.forEach(r=>{for(let c=0;c<N;c++)cells.push([r,c])});
 cols.forEach(c=>{for(let r=0;r<N;r++)cells.push([r,c])});
 const unique=[...new Map(cells.map(x=>[x.join(","),x])).values()];
 return {rows,cols,cells:unique,count:rows.length+cols.length};
}
function removeCompletedLines(lines){
 lines.rows.forEach(r=>board[r].fill(null));
 lines.cols.forEach(c=>board.forEach(row=>row[c]=null));
}

function miniFor(sh,x,y,color){
 const m=document.createElement("i");m.className="mini";
 const on=sh.some(([sx,sy])=>sx===x&&sy===y);
 if(on){m.style.background=color;m.dataset.empty="0"}else m.dataset.empty="1";
 return m;
}
function render(){
 ensurePlayer();$("score").textContent=score.toLocaleString();$("best").textContent=best.toLocaleString();$("stage").textContent=`STAGE ${stage} · ${stageName()}`;updateTimerUI();$("sound").textContent=audioEnabled?"🔊":"🔇";document.body.dataset.stage=String(stage);
 const b=$("board");b.innerHTML="";
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){
  const e=document.createElement("div");e.className="cell";e.dataset.r=r;e.dataset.c=c;
  if(board[r][c]){e.classList.add("f");e.style.setProperty("--fill",board[r][c])}b.appendChild(e);
 }
 const q=$("pieces");q.innerHTML="";
 if(pieces.length!==3)pieces=[makePiece(),makePiece(),makePiece()];
 pieces.forEach((p,i)=>{
  const e=document.createElement("div");e.className="piece"+(p.used?" used":"");
  const sh=document.createElement("div");sh.className="shape";
  for(let y=0;y<5;y++)for(let x=0;x<5;x++)sh.appendChild(miniFor(p.shape,x,y,p.color));
  e.appendChild(sh);
  if(!p.used){
   e.addEventListener("pointerdown",ev=>beginDrag(i,ev),{passive:false});
  }
  q.appendChild(e);
 });
}

function hasAnyMove(){
 return pieces.some(p=>!p.used&&board.some((row,r)=>row.some((_,c)=>fit(p.shape,r,c))));
}
function gameOver(reason='TIME'){
 if(gameEnded)return;
 gameEnded=true;stopRunClock();
 runSeconds=Math.max(0,START_TIME-Math.ceil(timeLeft));
 if(dragGhost)dragGhost.remove();dragGhost=null;dragging=null;activePointerId=null;clearPreview();
 document.querySelectorAll('.piece.selected').forEach(e=>e.classList.remove('selected'));
 $('final').textContent=score.toLocaleString();$('overBest').textContent=best.toLocaleString();
 $('overTitle').textContent='GAME OVER';
 $('runSummary').innerHTML=`<b>STAGE ${stage} · ${stageName()}</b><br>${reason==='TIME'?'TIME EXPIRED':'NO MORE MOVES'} · ${Math.floor(runSeconds)}s`;
 $('submitStatus').textContent='Saving your score…';
 $('over').classList.add('show');
 sfx('gameover');render();
 submitScore();
}
function finishActiveRun(){gameOver('TIME');}

async function submitScore(){
 const btn=null;
 if(submitted){$('submitStatus').textContent='Score already registered ✓';return;}
 $('submitStatus').textContent='Saving score…';
 try{
  const payload={fields:{game:{stringValue:'blocks'},name:{stringValue:String(player)},score:{integerValue:String(Number(score)||0)},timeSeconds:{integerValue:String(Math.max(0,Math.floor(runSeconds)))},stage:{integerValue:String(stage)},stageName:{stringValue:stageName()},createdAt:{integerValue:String(Date.now())}}};
  const res=await fetch(FIRESTORE_COLLECTION_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!res.ok){let detail='';try{detail=await res.text()}catch{};throw new Error(`Firestore upload failed: ${res.status} ${detail}`);}
  submitted=true;$('submitStatus').textContent='Score saved ✓';
  await loadLeaderboard(true);
 }catch(err){console.error(err);$('submitStatus').textContent='Could not save score. Check Firebase / Firestore API.';}
 finally{}
}
async function loadLeaderboard(updatePersonalBest=false){
 const status=$('lbStatus'),list=$('lbList');
 status.textContent='Loading scores…';
 try{
  let url=FIRESTORE_COLLECTION_URL+'&pageSize=1000',all=[];
  for(let page=0;page<10&&url;page++){
   const res=await fetch(url);if(!res.ok)throw new Error('Firestore read failed: '+res.status);
   const data=await res.json();
   all.push(...(data.documents||[]));
   url=data.nextPageToken?FIRESTORE_COLLECTION_URL+'&pageSize=1000&pageToken='+encodeURIComponent(data.nextPageToken):'';
  }
  const rows=all.map(d=>{const f=d.fields||{};return {game:f.game?.stringValue||'',name:f.name?.stringValue||'Player',score:Number(f.score?.integerValue||f.score?.doubleValue||0),timeSeconds:Number(f.timeSeconds?.integerValue||0),stage:Number(f.stage?.integerValue||0),stageName:f.stageName?.stringValue||''}}).filter(x=>x.game==='blocks');
  const personal=rows.filter(x=>x.name===player);
  if(personal.length){const firebaseBest=Math.max(...personal.map(x=>x.score));best=Math.max(best,firebaseBest);localStorage.blocksBest=best;$('best').textContent=best.toLocaleString();}
  rows.sort((a,b)=>Number(b.score||0)-Number(a.score||0));list.innerHTML='';
  rows.slice(0,10).forEach((x,i)=>{const li=document.createElement('li');li.innerHTML=`<span>${i+1}</span><b>${escapeHtml(String(x.name||'Player'))}</b><span class="lb-score">${Number(x.score||0).toLocaleString()}</span>`;list.appendChild(li)});
  status.textContent=list.children.length?'Top 10':'No scores yet.';
 }catch(err){console.error(err);status.textContent='Leaderboard unavailable — check Firebase rules.';}
}

function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function newGame(force=false){
 if(!force && runStartedAt && !gameEnded && score>0){finishActiveRun();return;}
 stopRunClock();
 if(dragGhost)dragGhost.remove();
 gameEnded=false;submitted=false;dragGhost=null;board=Array.from({length:N},()=>Array(N).fill(null));pieces=[makePiece(),makePiece(),makePiece()];score=0;runStartedAt=0;runSeconds=0;timeLeft=START_TIME;stage=1;stageClearCount=0;rushActive=false;comboCount=0;lastClearAt=0;dragging=null;stopRunClock();
 document.body.dataset.stage='1';$("over").classList.remove("show");$("submitStatus").textContent="";$("message").textContent="Press and hold a piece, then drag it onto the board.";$("combo").textContent="COMBO ×1";render();
}

window.addEventListener("pointermove",e=>{
 if(!dragging || e.pointerId!==activePointerId)return;
 e.preventDefault();
 moveDrag(e.clientX,e.clientY);
},{passive:false});
window.addEventListener("pointerup",e=>{
 if(!dragging || e.pointerId!==activePointerId)return;
 e.preventDefault();
 endDrag(e);
},{passive:false});
window.addEventListener("pointercancel",e=>{
 if(!dragging || e.pointerId!==activePointerId)return;
 e.preventDefault();
 cancelDrag();
},{passive:false});
window.addEventListener("contextmenu",e=>{if(dragging)e.preventDefault()});

$("new").onclick=()=>newGame(false);$("again").onclick=()=>newGame(true);$("menu").onclick=()=>{location.href="../"};$("sound").onclick=toggleSound;$("refreshLB").onclick=loadLeaderboard;
ensurePlayer();newGame(true);while(!hasAnyMove()){pieces=[makePiece(),makePiece(),makePiece()]}render();loadLeaderboard();


/* v8: keep Android touch drag under game control */
window.addEventListener("touchstart", e => {
  if (dragging) e.preventDefault();
}, {passive:false});
window.addEventListener("touchmove", e => {
  if (dragging) e.preventDefault();
}, {passive:false});
window.addEventListener("touchend", e => {
  if (dragging) e.preventDefault();
}, {passive:false});
