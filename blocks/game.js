import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={
 apiKey:"AIzaSyC2jNNzAk5ghmVE6KLOeGPtd3CCTzpw3qo",
 authDomain:"leaderboard-90b9b.firebaseapp.com",
 projectId:"leaderboard-90b9b",
 storageBucket:"leaderboard-90b9b.firebasestorage.app",
 messagingSenderId:"891059392275",
 appId:"1:891059392275:web:757305992c2d83d39214e6",
 measurementId:"G-RXNVYRFXC5"
};
const firebaseApp=initializeApp(firebaseConfig);
const db=getFirestore(firebaseApp);

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
let player=(localStorage.blocksPlayer||"").trim();
let dragging=null,dragGhost=null,activePointerId=null,touchDragIndex=null,touchActive=false,clearAnimating=false;

const $=id=>document.getElementById(id);
function ensurePlayer(){
 if(!player){
   const entered=prompt("Enter your player name:","Player");
   player=(entered||"Player").trim().slice(0,18)||"Player";
   localStorage.blocksPlayer=player;
 }
 $("player").textContent=player;
}
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
function dragPoint(x,y){
 // Project the finger onto the board. The finger may stay completely
 // outside the board; the logical piece position is clamped to the board.
 const rect=$("board").getBoundingClientRect();
 const pad=9;
 const minX=rect.left+pad, maxX=rect.right-pad;
 const minY=rect.top+pad, maxY=rect.bottom-pad;
 return {
   x:Math.max(minX,Math.min(maxX,x)),
   y:Math.max(minY,Math.min(maxY,y-72))
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
 let gained=p.shape.length*10;
 if(lines.count)gained+=lines.count===1?100:lines.count===2?250:500+lines.count*100;

 score+=gained;
 checkLevelUp();
 best=Math.max(best,score);localStorage.blocksBest=best;

 if(dragGhost)dragGhost.remove();
 dragGhost=null;clearPreview();dragging=null;activePointerId=null;
 document.querySelectorAll(".piece.selected").forEach(e=>e.classList.remove("selected"));

 if(lines.count){
   $("message").textContent=`✨ ${lines.count} line${lines.count>1?"s":""} clearing!`;
   render();
   animateClearCells(lines.cells,()=>{
     removeCompletedLines(lines);
     celebrateClear(gained,lines.count,lines.cells);
     $("message").textContent=`🎉 ${lines.count} line${lines.count>1?"s":""} cleared!`;
     if(pieces.every(x=>x.used))pieces=[makePiece(),makePiece(),makePiece()];
     render();
     const possible=pieces.some(p=>!p.used&&board.some((row,r)=>row.some((_,c)=>fit(p.shape,r,c))));
     if(!possible)gameOver();
   });
 }else{
   if(pieces.every(x=>x.used))pieces=[makePiece(),makePiece(),makePiece()];
   animateScoreValue(score-gained,score,220);
   $("message").textContent="Good move. Keep building.";
   render();
   const possible=pieces.some(p=>!p.used&&board.some((row,r)=>row.some((_,c)=>fit(p.shape,r,c))));
   if(!possible)gameOver();
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
 ensurePlayer();$("score").textContent=score.toLocaleString();$("best").textContent=best.toLocaleString();
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


let level=1;
const levelTargets=[0,1000,2500,5000,8500,13000,19000,27000,38000,52000,70000];
function targetForLevel(l){
  if(l<levelTargets.length)return levelTargets[l];
  return Math.round(levelTargets[levelTargets.length-1]*Math.pow(1.32,l-levelTargets.length+1));
}
function updateLevelUI(){
 const target=targetForLevel(level);
 const prev=targetForLevel(Math.max(1,level-1));
 const pct=Math.max(0,Math.min(100,((score-prev)/(target-prev))*100));
 const el=$("level"),fill=$("levelFill");
 if(el)el.textContent=`LEVEL ${level}`;
 if(fill)fill.style.width=pct+"%";
}
function checkLevelUp(){
 let changed=false;
 while(score>=targetForLevel(level)){level++;changed=true}
 if(changed){
   const msg=document.createElement("div");
   msg.className="level-up-pop";
   msg.innerHTML=`<b>LEVEL ${level}</b><span>TARGET ${targetForLevel(level).toLocaleString()}</span>`;
   document.body.appendChild(msg);
   setTimeout(()=>msg.remove(),1100);
 }
 updateLevelUI();
}
function hasAnyMove(){
 return pieces.some(p=>!p.used && board.some((row,r)=>row.some((_,c)=>fit(p.shape,r,c))));
}
function showFinalGameOver(){
 const panel=document.createElement("div");
 panel.className="game-over-panel";
 panel.innerHTML=`<div class="game-over-card">
   <h2>GAME OVER</h2>
   <div class="final-score">${score.toLocaleString()}</div>
   <div class="final-level">LEVEL ${level} · BEST ${best.toLocaleString()}</div>
   <button class="submit" id="goSubmit">SUBMIT SCORE</button>
   <button class="again" id="goAgain">PLAY AGAIN</button>
 </div>`;
 document.body.appendChild(panel);
 panel.querySelector("#goAgain").onclick=()=>location.reload();
 panel.querySelector("#goSubmit").onclick=()=>document.querySelector("#submit")?.click();
}
function gameOver(){
 updateLevelUI();
 showFinalGameOver();
}
async function loadLeaderboard(){
 const status=$("lbStatus"),list=$("lbList");
 try{
  const q=query(collection(db,"leaderboard"),limit(200)),snap=await getDocs(q);
  const rows=[];
  snap.forEach(d=>{const x=d.data();if(x.game==="blocks")rows.push(x)});
  rows.sort((a,b)=>Number(b.score||0)-Number(a.score||0));
  list.innerHTML="";let i=1;
  rows.slice(0,10).forEach(x=>{const li=document.createElement("li");li.innerHTML=`<span>${i++}</span><b>${escapeHtml(String(x.name||"Player"))}</b><span class="lb-score">${Number(x.score||0).toLocaleString()}</span>`;list.appendChild(li)});
  status.textContent=list.children.length?"Top 10":"No scores yet.";
 }catch(err){console.error(err);status.textContent="Leaderboard not connected yet."}
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function newGame(){if(dragGhost)dragGhost.remove();dragGhost=null;board=Array.from({length:N},()=>Array(N).fill(null));pieces=[makePiece(),makePiece(),makePiece()];score=0;dragging=null;$("over").classList.remove("show");$("message").textContent="Press and hold a piece, then drag it onto the board.";render()}

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

$("new").onclick=newGame;$("again").onclick=newGame;$("submit").onclick=submitScore;$("refreshLB").onclick=loadLeaderboard;
ensurePlayer();newGame();loadLeaderboard();


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
