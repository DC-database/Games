const N=10;
const COLORS=["#39b8ff","#8d62ff","#ff9d38","#41d68a","#f35f8f","#ffd34f","#27d5c7","#ff5c5c"];
const SHAPES=[
 [[0,0],[1,0],[2,0],[3,0]],
 [[0,0],[0,1],[1,1],[2,1]],
 [[1,0],[0,1],[1,1],[2,1]],
 [[0,0],[1,0],[0,1],[1,1]],
 [[0,0],[1,0],[1,1],[2,1]],
 [[0,0],[0,1],[0,2],[1,2]],
 [[0,0],[1,0],[2,0],[2,1],[2,2]],
 [[0,0],[1,0],[1,1],[1,2]],
 [[0,0],[1,0],[2,0],[1,1]],
 [[0,0],[0,1],[1,1],[2,1],[2,2]]
];

let board=[], pieces=[], score=0;
let best=Number(localStorage.blocksBest||0);
let dragging=null, dragGhost=null;

const $=id=>document.getElementById(id);

function rotate(shape){
 let a=shape.map(([x,y])=>[y,-x]);
 let minX=Math.min(...a.map(p=>p[0])), minY=Math.min(...a.map(p=>p[1]));
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
 const rect=$("board").getBoundingClientRect();
 if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
 const gap=2,pad=9;
 const cell=(rect.width-pad*2-gap*(N-1))/N;
 const c=Math.floor((x-rect.left-pad)/(cell+gap));
 const r=Math.floor((y-rect.top-pad)/(cell+gap));
 return r>=0&&r<N&&c>=0&&c<N?{r,c}:null;
}
function dragPoint(x,y){
 // Keep the lifted piece above the finger so the player can see the landing position.
 return {x,y:y-62};
}
function clearPreview(){
 document.querySelectorAll(".cell.preview,.cell.invalid").forEach(e=>e.classList.remove("preview","invalid"));
}
function showPreview(point){
 clearPreview();
 if(!dragging)return;
 const cell=cellFromPoint(point.x,point.y);
 if(!cell)return;
 const valid=fit(dragging.shape,cell.r,cell.c);
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
function makeGhost(piece,x,y){
 if(dragGhost)dragGhost.remove();
 dragGhost=document.createElement("div");
 dragGhost.className="dragGhost";
 const sh=document.createElement("div");
 sh.className="shape";
 for(let yy=0;yy<5;yy++)for(let xx=0;xx<5;xx++){
   const m=document.createElement("i");
   m.className="mini";
   const on=piece.shape.some(([sx,sy])=>sx===xx&&sy===yy);
   if(on)m.style.background=piece.color; else m.style.visibility="hidden";
   sh.appendChild(m);
 }
 dragGhost.appendChild(sh);
 document.body.appendChild(dragGhost);
 moveGhost(x,y);
}
function moveGhost(x,y){
 if(!dragGhost)return;
 const p=dragPoint(x,y);
 dragGhost.style.left=p.x+"px";
 dragGhost.style.top=p.y+"px";
 showPreview(p);
}
function startDrag(index,e){
 const p=pieces[index];
 if(p.used)return;
 e.preventDefault();
 if(e.pointerType==="touch" && e.currentTarget.setPointerCapture){
   try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
 }
 dragging=p;
 e.currentTarget.classList.add("selected");
 makeGhost(p,e.clientX,e.clientY);
 moveGhost(e.clientX,e.clientY);
}
function endDrag(e){
 if(!dragging)return;
 const p=dragging;
 const target=dragPoint(e.clientX,e.clientY);
 const cell=cellFromPoint(target.x,target.y);
 const can=!!cell&&fit(p.shape,cell.r,cell.c);

 if(can){
   p.shape.forEach(([x,y])=>board[cell.r+y][cell.c+x]=p.color);
   const lines=clearLines();
   score+=p.shape.length*10;
   if(lines)score+=lines===1?100:lines===2?250:500+lines*100;
   best=Math.max(best,score);
   localStorage.blocksBest=best;
   $("message").textContent=lines?`✨ ${lines} line${lines>1?"s":""} cleared!`:"Good move. Keep building.";
   p.used=true;
   if(pieces.every(x=>x.used))pieces=[makePiece(),makePiece(),makePiece()];
 }else{
   $("message").textContent="Not placed — move to a valid position and release.";
 }
 if(dragGhost){dragGhost.remove();dragGhost=null}
 clearPreview();
 dragging=null;
 render();

 if(can){
   const possible=pieces.some(p=>!p.used&&board.some((row,r)=>row.some((_,c)=>fit(p.shape,r,c))));
   if(!possible)gameOver();
 }
}
function clearLines(){
 let rows=[],cols=[];
 for(let r=0;r<N;r++)if(board[r].every(Boolean))rows.push(r);
 for(let c=0;c<N;c++)if(board.every(row=>row[c]))cols.push(c);
 rows.forEach(r=>board[r].fill(null));
 cols.forEach(c=>board.forEach(row=>row[c]=null));
 return rows.length+cols.length;
}
function render(){
 $("score").textContent=score.toLocaleString();
 $("best").textContent=best.toLocaleString();

 const b=$("board");b.innerHTML="";
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){
   const e=document.createElement("div");
   e.className="cell";
   e.dataset.r=r;e.dataset.c=c;
   if(board[r][c]){e.classList.add("f");e.style.setProperty("--fill",board[r][c]);}
   b.appendChild(e);
 }
 const q=$("pieces");q.innerHTML="";
 pieces.forEach((p,i)=>{
   const e=document.createElement("div");
   e.className="piece"+(p.used?" used":"");
   const sh=document.createElement("div");sh.className="shape";
   for(let y=0;y<5;y++)for(let x=0;x<5;x++){
     const m=document.createElement("i");m.className="mini";
     const on=p.shape.some(([sx,sy])=>sx===x&&sy===y);
     if(on)m.style.background=p.color;else m.style.visibility="hidden";
     sh.appendChild(m);
   }
   e.appendChild(sh);
   if(!p.used)e.addEventListener("pointerdown",ev=>startDrag(i,ev));
   q.appendChild(e);
 });
}
function gameOver(){
 $("final").textContent=score.toLocaleString();
 $("over").classList.add("show");
}
function newGame(){
 board=Array.from({length:N},()=>Array(N).fill(null));
 pieces=[makePiece(),makePiece(),makePiece()];
 score=0;
 dragging=null;
 $("over").classList.remove("show");
 $("message").textContent="Press and hold a piece, then drag it onto the board.";
 render();
}
document.addEventListener("pointermove",e=>{
 if(!dragging)return;
 e.preventDefault();
 moveGhost(e.clientX,e.clientY);
},{passive:false});
document.addEventListener("pointerup",e=>{
 if(!dragging)return;
 e.preventDefault();
 endDrag(e);
},{passive:false});
document.addEventListener("pointercancel",e=>{
 if(!dragging)return;
 e.preventDefault();
 if(dragGhost)dragGhost.remove();
 dragGhost=null;clearPreview();dragging=null;render();
 $("message").textContent="Piece returned.";
},{passive:false});
$("new").onclick=newGame;
$("again").onclick=newGame;
newGame();
document.addEventListener("contextmenu",e=>{if(dragging)e.preventDefault()});
