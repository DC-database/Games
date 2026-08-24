
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {getFirestore,collection,addDoc,getDocs,query,limit} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig={
 apiKey:"AIzaSyC2jNNzAk5ghmVE6KLOeGPtd3CCTzpw3qo",
 authDomain:"leaderboard-90b9b.firebaseapp.com",
 projectId:"leaderboard-90b9b",
 storageBucket:"leaderboard-90b9b.firebasestorage.app",
 messagingSenderId:"891059392275",
 appId:"1:891059392275:web:757305992c2d83d39214e6",
 measurementId:"G-RXNVYRFXC5"
};
const app=initializeApp(firebaseConfig);
const db=getFirestore(app);

const icons=["🐶","🐱","🦊","🐼","🐸","🦁","🐯","🐵","🐨","🐰","🐙","🦄","🐝","🦋","🐢","🐳","🚀","⭐"];
const levels=[
 {pairs:4,target:800,cols:4},
 {pairs:6,target:1500,cols:4},
 {pairs:8,target:2600,cols:4},
 {pairs:10,target:4200,cols:5},
 {pairs:12,target:6500,cols:6},
 {pairs:15,target:9500,cols:6}
];
let level=1,moves=0,score=0,best=Number(localStorage.memoryBest||0),seconds=0;
let first=null,second=null,lock=false,matched=0,timer=null,started=false,combo=0;
let player=localStorage.memoryPlayer||"";
if(!player){player=(prompt("Enter your player name:","Player")||"Player").trim().slice(0,18)||"Player";localStorage.memoryPlayer=player}

const $=id=>document.getElementById(id);
function cfg(){return levels[Math.min(level-1,levels.length-1)]}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function startTimer(){if(timer)return;timer=setInterval(()=>{seconds++;update()},1000)}
function update(){
 $("level").textContent=level;
 $("moves").textContent=moves;
 $("score").textContent=score.toLocaleString();
 $("time").textContent=Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");
 const target=cfg().target,prev=level===1?0:levels[level-2].target;
 $("levelFill").style.width=Math.min(100,Math.max(0,(score-prev)/(target-prev)*100))+"%";
}
function build(){
 const c=cfg(),arr=shuffle([...icons.slice(0,c.pairs),...icons.slice(0,c.pairs)]);
 $("board").style.gridTemplateColumns=`repeat(${c.cols},1fr)`;
 $("board").innerHTML="";
 arr.forEach((icon,i)=>{
   const b=document.createElement("button");b.className="card";b.dataset.icon=icon;
   b.innerHTML=`<span class="card-inner"><span class="face back"></span><span class="face front"><span class="emoji">${icon}</span></span></span>`;
   b.onclick=()=>flip(b);$("board").appendChild(b);
 });
 matched=0;first=second=null;lock=false;moves=0;combo=0;started=false;
 $("message").textContent="Find all matching pairs.";
 $("combo").textContent="";update();
}
function flip(card){
 if(lock||card.classList.contains("flipped")||card.classList.contains("matched"))return;
 if(!started){started=true;startTimer();$("message").textContent="Find the matching pairs!"}
 card.classList.add("flipped");
 if(!first){first=card;return}
 second=card;moves++;lock=true;
 setTimeout(check,420);
}
function check(){
 if(first.dataset.icon===second.dataset.icon){
   first.classList.add("matched");second.classList.add("matched");matched+=2;combo++;
   const base=100+Math.max(0,40-combo*3); const speed=Math.max(0,60-Math.floor(seconds/8));
   const gained=base+speed+combo*15;score+=gained;best=Math.max(best,score);localStorage.memoryBest=best;
   floatText("+"+gained,first);burst(second);
   $("combo").textContent=combo>1?`🔥 COMBO ×${combo}`:"✨ MATCH!";
   if(matched===cfg().pairs*2){levelComplete()} else {first=second=null;lock=false;update()}
 }else{
   combo=0;$("combo").textContent="";
   setTimeout(()=>{first.classList.remove("flipped");second.classList.remove("flipped");first=second=null;lock=false;},380);
 }
 update();
}
function levelComplete(){
 const old=level; level++;
 const gained=250+old*100;score+=gained;best=Math.max(best,score);localStorage.memoryBest=best;
 burst(second||first);floatText("LEVEL UP! +"+gained,second||first);
 update();
 setTimeout(()=>{
   if(level>levels.length)level=levels.length;
   build();
   $("message").textContent=`Level ${level} — ${cfg().pairs} pairs.`;
 },900);
}
function burst(card){
 const r=(card||$("board")).getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
 const colors=["#72e6a0","#ffd86b","#63b7ff","#ff6d9c","#b18cff","#fff"];
 for(let i=0;i<42;i++){const p=document.createElement("i");p.className="fx";p.style.left=cx+"px";p.style.top=cy+"px";p.style.background=colors[i%colors.length];const a=Math.PI*2*i/42,d=45+Math.random()*130;p.style.setProperty("--x",Math.cos(a)*d+"px");p.style.setProperty("--y",Math.sin(a)*d+"px");p.style.setProperty("--r",(Math.random()*720-360)+"deg");document.body.appendChild(p);setTimeout(()=>p.remove(),900)}
}
function floatText(text,card){const r=card.getBoundingClientRect();const e=document.createElement("div");e.className="float";e.textContent=text;e.style.left=(r.left+r.width/2)+"px";e.style.top=(r.top+r.height/2)+"px";document.body.appendChild(e);setTimeout(()=>e.remove(),950)}
function finish(){
 clearInterval(timer);timer=null;
 const overlay=$("overlay");overlay.hidden=false;
 overlay.innerHTML=`<div class="overlay"><div class="modal"><h2>🎉 GAME COMPLETE</h2><div class="final">${score.toLocaleString()}</div><p>${player} · Level ${level} · ${moves} moves · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}</p><button class="submit" id="submit">SUBMIT SCORE</button><button class="again" id="again">PLAY AGAIN</button></div></div>`;
 $("again").onclick=()=>{overlay.hidden=true;level=1;score=0;seconds=0;build()};
 $("submit").onclick=submitScore;
}
async function submitScore(){
 const name=player||"Player";
 try{await addDoc(collection(db,"leaderboard"),{game:"memory",name,score,level,moves,time:seconds,createdAt:Date.now()});$("submit").textContent="SCORE SAVED ✓";loadLeaderboard()}
 catch(e){$("submit").textContent="SAVE FAILED";console.error(e)}
}
async function loadLeaderboard(){
 const list=$("leaderboard");list.innerHTML="<li>Loading…</li>";
 try{
  const snap=await getDocs(query(collection(db,"leaderboard"),limit(300)));
  const rows=[];snap.forEach(d=>{const x=d.data();if(x.game==="memory")rows.push(x)});
  rows.sort((a,b)=>Number(b.score||0)-Number(a.score||0));
  list.innerHTML="";
  rows.slice(0,10).forEach((x,i)=>{const li=document.createElement("li");li.innerHTML=`<b>${i+1}. ${String(x.name||"Player").replace(/[<>&"]/g,"")}</b><span class="lbscore">${Number(x.score||0).toLocaleString()}</span>`;list.appendChild(li)});
  if(!list.children.length)list.innerHTML="<li>No scores yet — be the first!</li>";
 }catch(e){list.innerHTML="<li>Leaderboard unavailable</li>";console.error(e)}
}
$("newGame").onclick=()=>{level=1;score=0;seconds=0;clearInterval(timer);timer=null;build()};
$("mode").onclick=()=>{level=level>=levels.length?1:level+1;score=0;seconds=0;clearInterval(timer);timer=null;build()};
build();loadLeaderboard();
