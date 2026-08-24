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
let dragging=null,dragGhost=null,activePointerId=null,touchDragIndex=null,touchActive=false;

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
function dragPoint(x,y){return {x,y:y-76}}
function clearPreview(){document.querySelectorAll(".cell.preview,.cell.invalid").forEach(e=>e.classList.remove("preview","invalid"))}
function showPreview(point){
 clearPreview();if(!dragging)return;
 const cell=cellFromPoint(point.x,point.y);if(!cell)return;
 const valid=fit(dragging.shape,cell.r,cell.c);
 dragging.shape.forEach(([x,y])=>{
  const rr=cell.r+y,cc=cell.c+x;
  if(rr>=0&&rr<N&&cc>=0&&cc<N){
   const e=document.querySelector(`.cell[data-r="${rr}"][data-c="${cc}"]`);
   if(e){e.classList.add(valid?"preview":"invalid");if(valid)e.style.setProperty("--preview",dragging.color+"88")}
  }
 });
}
function makeGhost(piece,x,y){
 if(dragGhost)dragGhost.remove();
 dragGhost=document.createElement("div");dragGhost.className="dragGhost";
 const sh=document.createElement("div");sh.className="shape";
 for(let yy=0;yy<5;yy++)for(let xx=0;xx<5;xx++){
  const m=document.createElement("i");m.className="mini";
  const on=piece.shape.some(([sx,sy])=>sx===xx&&sy===yy);
  if(on){m.style.background=piece.color;m.dataset.empty="0"}else{m.dataset.empty="1"}
  sh.appendChild(m);
 }
 dragGhost.appendChild(sh);document.body.appendChild(dragGhost);moveGhost(x,y);
}
function moveGhost(x,y){
 if(!dragGhost)return;const p=dragPoint(x,y);
 dragGhost.style.left=p.x+"px";dragGhost.style.top=p.y+"px";showPreview(p);
}

function startTouchDrag(index,touch){
 const p=pieces[index];
 if(!p||p.used)return;
 touchActive=true;
 touchDragIndex=index;
 dragging=p;
 makeGhost(p,touch.clientX,touch.clientY);
 moveGhost(touch.clientX,touch.clientY);
}
function findTouch(e){
 if(!e.touches||!e.touches.length)return null;
 return e.touches[0];
}
function finishTouchDrag(touch,cancel=false){
 if(!touchActive)return;
 if(cancel){
   if(dragGhost)dragGhost.remove();
   dragGhost=null;clearPreview();dragging=null;touchActive=false;touchDragIndex=null;
   render();$("message").textContent="Piece returned.";
   return;
 }
 endDrag({clientX:touch.clientX,clientY:touch.clientY});
 touchActive=false;touchDragIndex=null;
}
function startDrag(index,e){
 const p=pieces[index];if(!p||p.used)return;
 e.preventDefault();activePointerId=e.pointerId;
 try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
 dragging=p;e.currentTarget.classList.add("selected");
 makeGhost(p,e.clientX,e.clientY);moveGhost(e.clientX,e.clientY);
}
function endDrag(e){
 if(!dragging)return;
 const p=dragging,target=dragPoint(e.clientX,e.clientY),cell=cellFromPoint(target.x,target.y),can=!!cell&&fit(p.shape,cell.r,cell.c);
 if(can){
  p.shape.forEach(([x,y])=>board[cell.r+y][cell.c+x]=p.color);
  const lines=clearLines();score+=p.shape.length*10;
  if(lines)score+=lines===1?100:lines===2?250:500+lines*100;
  best=Math.max(best,score);localStorage.blocksBest=best;
  $("message").textContent=lines?`✨ ${lines} line${lines>1?"s":""} cleared!`:"Good move. Keep building.";
  p.used=true;if(pieces.every(x=>x.used))pieces=[makePiece(),makePiece(),makePiece()];
 }else $("message").textContent="Not placed — move to a valid position and release.";
 if(dragGhost)dragGhost.remove();dragGhost=null;clearPreview();dragging=null;activePointerId=null;render();
 if(can){
  const possible=pieces.some(p=>!p.used&&board.some((row,r)=>row.some((_,c)=>fit(p.shape,r,c))));
  if(!possible)gameOver();
 }
}
function clearLines(){
 let rows=[],cols=[];
 for(let r=0;r<N;r++)if(board[r].every(Boolean))rows.push(r);
 for(let c=0;c<N;c++)if(board.every(row=>row[c]))cols.push(c);
 rows.forEach(r=>board[r].fill(null));cols.forEach(c=>board.forEach(row=>row[c]=null));
 return rows.length+cols.length;
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
   e.addEventListener("pointerdown",ev=>startDrag(i,ev),{passive:false});
   e.addEventListener("touchstart",bindTouchToPiece,{passive:false});
  }
  q.appendChild(e);
 });
}

// Explicit touch fallback for Android/iOS browsers.
// Pointer events remain enabled for desktop; touch events guarantee drag behavior on mobile.
function bindTouchToPiece(e){
 const pieceEl=e.currentTarget;
 const index=[...$("pieces").children].indexOf(pieceEl);
 if(index<0||pieces[index].used)return;
 e.preventDefault();
 const t=findTouch(e);
 if(t)startTouchDrag(index,t);
}
function touchMoveHandler(e){
 if(!touchActive)return;
 e.preventDefault();
 const t=findTouch(e);
 if(t)moveGhost(t.clientX,t.clientY);
}
function touchEndHandler(e){
 if(!touchActive)return;
 e.preventDefault();
 const t=(e.changedTouches&&e.changedTouches[0])||{clientX:0,clientY:0};
 finishTouchDrag(t,false);
}
function touchCancelHandler(e){
 if(!touchActive)return;
 e.preventDefault();
 finishTouchDrag(null,true);
}
function gameOver(){$("final").textContent=score.toLocaleString();$("over").classList.add("show");$("submitStatus").textContent=""}
async function submitScore(){
 const btn=$("submit");btn.disabled=true;$("submitStatus").textContent="Submitting…";
 try{
  await addDoc(collection(db,"leaderboard"),{game:"blocks",name:player,score:Number(score),createdAt:serverTimestamp()});
  $("submitStatus").textContent="Score submitted ✓";loadLeaderboard();
 }catch(err){
  console.error(err);$("submitStatus").textContent="Leaderboard unavailable. Check Firebase rules.";
 }finally{btn.disabled=false}
}
async function loadLeaderboard(){
 const status=$("lbStatus"),list=$("lbList");
 try{
  const q=query(collection(db,"leaderboard"),orderBy("score","desc"),limit(10)),snap=await getDocs(q);
  list.innerHTML="";let i=1;
  snap.forEach(d=>{const x=d.data();if(x.game!=="blocks")return;const li=document.createElement("li");li.innerHTML=`<span>${i++}</span><b>${escapeHtml(String(x.name||"Player"))}</b><span class="lb-score">${Number(x.score||0).toLocaleString()}</span>`;list.appendChild(li)});
  status.textContent=list.children.length?"Top 10":"No scores yet.";
 }catch(err){console.error(err);status.textContent="Leaderboard not connected yet."}
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function newGame(){board=Array.from({length:N},()=>Array(N).fill(null));pieces=[makePiece(),makePiece(),makePiece()];score=0;dragging=null;$("over").classList.remove("show");$("message").textContent="Press and hold a piece, then drag it onto the board.";render()}

document.addEventListener("touchmove",touchMoveHandler,{passive:false});
document.addEventListener("touchend",touchEndHandler,{passive:false});
document.addEventListener("touchcancel",touchCancelHandler,{passive:false});

window.addEventListener("pointermove",e=>{if(!dragging)return;if(activePointerId!==null&&e.pointerId!==activePointerId)return;e.preventDefault();moveGhost(e.clientX,e.clientY)},{passive:false});
window.addEventListener("pointerup",e=>{if(!dragging)return;if(activePointerId!==null&&e.pointerId!==activePointerId)return;e.preventDefault();endDrag(e)},{passive:false});
window.addEventListener("pointercancel",e=>{if(!dragging)return;if(activePointerId!==null&&e.pointerId!==activePointerId)return;if(dragGhost)dragGhost.remove();dragGhost=null;clearPreview();dragging=null;activePointerId=null;render();$("message").textContent="Piece returned."},{passive:false});
window.addEventListener("contextmenu",e=>{if(dragging)e.preventDefault()});
$("new").onclick=newGame;$("again").onclick=newGame;$("submit").onclick=submitScore;$("refreshLB").onclick=loadLeaderboard;
ensurePlayer();newGame();loadLeaderboard();

document.addEventListener("gesturestart",e=>{if(touchActive)e.preventDefault()},{passive:false});
