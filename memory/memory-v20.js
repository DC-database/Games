
const RTDB_GAME_PATH="leaderboard/memory";
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[<>&"]/g,"");
let player=getSession()?.gameName||"";
if(!getSession()?.uid || !player){ location.href="../"; }
const levelSets=[
  // Level 1 — Farm Friends
  ["dog","cat","rabbit","chicken"],
  // Level 2 — Jungle Crew
  ["lion","tiger","monkey","elephant","giraffe","zebra"],
  // Level 3 — Ocean Life
  ["dolphin","whale","octopus","shark","turtle","crab","fish","seahorse"],
  // Level 4 — Forest Friends
  ["fox","bear","wolf","deer","owl","frog","hedgehog","squirrel","panda","koala"],
  // Level 5 — Safari
  ["lion","elephant","giraffe","zebra","rhino","hippo","cheetah","crocodile","monkey","parrot","flamingo","snake"],
  // Level 6 — Pets & Farm
  ["dog","cat","rabbit","chicken","horse","pig","sheep","goat","duck","cow","hamster","mouse"],
  // Level 7 — Ocean Deep
  ["dolphin","whale","octopus","shark","turtle","crab","fish","squid","jellyfish","shrimp","seal","penguin"],
  // Level 8 — Wild Animals
  ["tiger","wolf","bear","fox","deer","panda","koala","kangaroo","gorilla","leopard","sloth","otter"],
  // Level 9 — Birds & Reptiles
  ["owl","eagle","parrot","flamingo","penguin","peacock","snake","crocodile","lizard","turtle","frog","snail"],
  // Level 10 — Animal Kingdom Mix
  ["lion","tiger","elephant","giraffe","zebra","panda","koala","dolphin","whale","eagle","fox","dog"]
];
function levelIcons(){return levelSets[Math.min(level-1,levelSets.length-1)];}

let level=1,moves=0,score=0,seconds=0,timeLeft=60,first=null,second=null,lock=false,matched=0,timer=null,runStarted=false,submitted=false,gameOver=false;
const GAME_TIME=60;

// External sound assets. Audio is explicitly unlocked on the first user gesture
// so Chrome/Android autoplay restrictions do not silently block the effects.
let soundEnabled=localStorage.getItem("memorySoundEnabled")!=="0";
let audioUnlocked=false;
const CARD_ASSET_BASE="assets/cards/front/";
const CARD_BACK_ASSET="assets/cards/back/card-back.svg";
const SOUND_ASSET_BASE="assets/sounds/";
const soundFiles={
  flip:"card_flip.wav",
  correct:"correct_match.wav",
  wrong:"wrong_match.wav",
  tick:"countdown_tick.wav",
  last:"last_second.wav",
  level:"level_complete.wav",
  gameover:"game_over.wav",
  click:"button_click.wav"
};
const soundBank={};
Object.entries(soundFiles).forEach(([key,file])=>{
  const a=new Audio();
  a.src=SOUND_ASSET_BASE+file;
  a.preload="auto";
  a.setAttribute("playsinline","");
  soundBank[key]=a;
});
function unlockSounds(){
  if(audioUnlocked||!soundEnabled)return;
  audioUnlocked=true;
  Object.values(soundBank).forEach(a=>{
    try{
      a.muted=true;
      const p=a.play();
      if(p&&p.catch)p.catch(()=>{});
      setTimeout(()=>{try{a.pause();a.currentTime=0;a.muted=false;}catch(e){}},80);
    }catch(e){}
  });
}
function playSound(kind){
  if(!soundEnabled)return;
  const src=soundBank[kind];
  if(!src)return;
  try{
    const a=src.cloneNode(true);
    a.volume=(kind==="gameover"||kind==="level")?0.82:0.68;
    a.play().catch(()=>{});
  }catch(e){}
}
function updateSoundButton(){
  const b=$("soundToggle"); if(!b)return;
  b.textContent=soundEnabled?"🔊":"🔇";
  b.setAttribute("aria-label",soundEnabled?"Mute sounds":"Turn sounds on");
  b.title=soundEnabled?"Mute sounds":"Turn sounds on";
}
function shuffled(a){return [...a].sort(()=>Math.random()-.5)}
function levelPairs(){return Math.min(12,4+Math.floor((level-1)*2))}
function renderTime(){
  const left=Math.max(0,Math.min(GAME_TIME,timeLeft));
  $("time").textContent=`0:${String(left).padStart(2,"0")}`;
  $("time").classList.toggle("time-danger",left<=10);
}
function changeTime(delta,card){
  if(gameOver)return;
  const before=timeLeft;
  timeLeft=Math.max(0,Math.min(GAME_TIME,timeLeft+delta));
  seconds=GAME_TIME-timeLeft;
  renderTime();
  floatText(`${delta>0?"+":"−"}${Math.abs(delta)}s`,card,delta>0);
  if(delta>0)playSound("correct"); else playSound("wrong");
  if(timeLeft<=0){clearInterval(timer);timer=null;finish("GAME OVER");}
}
function startRun(){
  if(runStarted||gameOver)return;
  unlockSounds();
  runStarted=true;
  renderTime();
  timer=setInterval(()=>{
    timeLeft=Math.max(0,timeLeft-1);
    seconds=GAME_TIME-timeLeft;
    renderTime();
    if(timeLeft>0&&timeLeft<=5)playSound(timeLeft===1?"last":"tick");
    if(timeLeft<=0){
      clearInterval(timer);timer=null;
      finish("GAME OVER");
    }
  },1000);
}
function levelTheme(){return ["Farm Friends","Jungle Crew","Ocean Life","Forest Friends","Safari","Pets & Farm","Ocean Deep","Wild Animals","Birds & Reptiles","Animal Kingdom Mix"][Math.min(level-1,9)]}
function setup(resetRun=true){
  if(resetRun){
    clearInterval(timer);timer=null;
    moves=score=seconds=matched=0;timeLeft=GAME_TIME;first=second=null;lock=false;submitted=false;runStarted=false;gameOver=false;
  }else{
    first=null;second=null;lock=false;matched=0;gameOver=false;
  }
  $("moves").textContent=moves;$("score").textContent=score.toLocaleString();$("level").textContent=level;if(resetRun)renderTime();$("levelFill").style.width=`${Math.min(100,level*10)}%`;
  const count=levelPairs(), pool=levelIcons(), vals=shuffled(pool.slice(0,count).flatMap(x=>[x,x]));
  $("board").innerHTML="";
  vals.forEach((icon,i)=>{
    const b=document.createElement("button");b.className="card";b.dataset.icon=icon;b.setAttribute("aria-label","Memory card");
    b.innerHTML=`<span class="card-inner"><span class="face back" aria-hidden="true"></span><span class="face front"><img src="${CARD_ASSET_BASE}${icon}.svg" alt="${icon}" draggable="false"></span></span>`;
    b.addEventListener("click",()=>flip(b));$("board").appendChild(b);
  });
  $("message").textContent=`Level ${level}: ${levelTheme()} — find ${count} pairs. +3 seconds correct · −1 second wrong`;
}
function flip(card){
  if(lock||card.classList.contains("flipped")||card.classList.contains("matched")||gameOver)return;
  unlockSounds();
  startRun();
  card.classList.add("flipped");
  playSound("flip");
  if(!first){first=card;return}
  second=card;moves++;$("moves").textContent=moves;lock=true;
  setTimeout(()=>{
    if(first.dataset.icon===second.dataset.icon){
      first.classList.add("matched");second.classList.add("matched");matched+=2;
      // +3 / -1 affect TIME, not score. Score is separate: 100 points per pair.
      score+=100;
      $("score").textContent=score.toLocaleString();
      changeTime(+3,second);
      burst(second);
      if(!gameOver&&matched===levelPairs()*2)setTimeout(levelComplete,500);
      first=null;second=null;lock=false;
    }else{
      changeTime(-1,second);
      if(gameOver)return;
      const a=first,b=second;
      a.classList.add("bad");b.classList.add("bad");
      setTimeout(()=>{
        a.classList.remove("bad");b.classList.remove("bad");
        requestAnimationFrame(()=>{
          a.classList.remove("flipped");b.classList.remove("flipped");
          first=null;second=null;
          setTimeout(()=>{lock=false},430);
        });
      },330);
    }
  },500);
}
function countSafe(){return levelPairs()}
function levelComplete(){
  if(gameOver)return;
  playSound("level");
  if(level<10){
    level++;
    $("level").textContent=level;
    $("message").textContent=`🎉 Level cleared! Level ${level} starting…`;
    setTimeout(()=>{if(!gameOver)setup(false)},650);
  }else{
    finish("🏆 ALL LEVELS COMPLETE");
  }
}
function showGameOverOverlay(title="GAME OVER", autoSaved=false){
  const overlay=$("overlay");
  overlay.className="overlay gameover-overlay";
  overlay.innerHTML=`
    <div class="gameover-screen">
      <div class="gameover-badge">⏱️ TIME UP</div>
      <h2>${title}</h2>
      <div class="gameover-label">FINAL SCORE</div>
      <div class="gameover-score">${score.toLocaleString()}</div>
      <div class="gameover-stats">
        <div><b>${level}</b><span>Level</span></div>
        <div><b>${moves}</b><span>Moves</span></div>
        <div><b>${matched/2}</b><span>Pairs</span></div>
      </div>
      <p id="saveStatus">${autoSaved?"Saving your score to the global leaderboard…":"Your run has ended."}</p>
      <div class="gameover-actions">
        <button class="submit" id="playAgain">▶ PLAY AGAIN</button>
        <button class="again" id="mainMenu">⌂ MAIN MENU</button>
      </div>
    </div>`;
  $("playAgain").onclick=()=>{overlay.className="overlay hidden";level=1;setup()};
  $("mainMenu").onclick=()=>showMainMenu();
}
function showMainMenu(){
  const overlay=$("overlay");
  overlay.className="overlay gameover-overlay";
  overlay.innerHTML=`<div class="gameover-screen menu-screen"><div class="menu-icon">🧠</div><h2>Memory Match</h2><p>Start with 60 seconds. <b>+3s</b> for a correct pair and <b>−1s</b> for a wrong pair.</p><button class="submit" id="startMenu">▶ START GAME</button></div>`;
  $("startMenu").onclick=()=>{overlay.className="overlay hidden";level=1;setup()};
}
async function finish(title="GAME OVER"){
  if(gameOver)return;
  gameOver=true;
  clearInterval(timer);timer=null;
  playSound("gameover");
  lock=true;
  submitted=false;
  showGameOverOverlay(title,true);
  await submitScore(true);
}
async function submitScore(auto=false){
  if(submitted)return;
  submitted=true;
  try{
    const session=getSession();
    if(!session?.idName || !session?.gameName) throw new Error("PLAYER_NOT_LOGGED_IN");
    const payload={game:"memory",idName:String(session.idName),uid:String(session.idName),gameName:String(session.gameName),name:String(session.gameName),score:Number(score)||0,level:Number(level)||1,moves:Number(moves)||0,timeSeconds:Number(seconds)||0,createdAt:Date.now()};
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    const res=await rtdbPost(RTDB_GAME_PATH,payload,{signal:controller.signal});
    if(res.ok){
      const best=Number((getSession()?.scores||{})?.memory||0);
      if((Number(score)||0)>best) await rtdbPut(`players/${String(session.idName).toLowerCase()}/scores/memory`,Number(score)||0);
      const ss=getSession()||{}; ss.scores={...(ss.scores||{}),memory:Number(score)||0}; setSession(ss);
    }
    clearTimeout(timeout);
    if(!res.ok){
      const detail=await res.text().catch(()=>"");
      throw new Error("Realtime Database upload failed: HTTP "+res.status+" "+detail);
    }
    const status=$("saveStatus");
    if(status)status.textContent="✅ Score saved to the global leaderboard.";
    $("message").textContent="✅ Score registered on the global leaderboard.";
    loadLeaderboard();
  }catch(e){
    console.error(e);
    submitted=false;
    const status=$("saveStatus");
    if(status)status.textContent="⚠️ Score could not be saved. Check Firebase Realtime Database rules.";
    $("message").textContent="⚠️ Score could not be uploaded. Check the console for the Firebase response.";
  }
}

$("newGame").onclick=()=>{playSound("click");if(gameOver){$("overlay").className="overlay hidden";level=1;setup()}else{level=1;setup()}};
$("endRun").onclick=()=>{playSound("click");if(runStarted&&!gameOver)finish("GAME OVER");else if(!runStarted)$("message").textContent="Tap a card to start the 60-second run."};
$("refresh").onclick=()=>{playSound("click");loadLeaderboard()};
$("soundToggle").onclick=()=>{
  soundEnabled=!soundEnabled;
  localStorage.setItem("memorySoundEnabled",soundEnabled?"1":"0");
  updateSoundButton();
  if(soundEnabled){unlockSounds();setTimeout(()=>playSound("click"),20);}
};
updateSoundButton();
document.addEventListener("pointerdown",()=>unlockSounds(),{once:false,passive:true});
document.addEventListener("touchstart",()=>unlockSounds(),{once:false,passive:true});
document.addEventListener("keydown",()=>unlockSounds(),{once:false,passive:true});

async function loadLeaderboard(){
  const list=$("leaderboard");list.innerHTML="<li>Loading…</li>";
  try{
    const controller=new AbortController(); const to=setTimeout(()=>controller.abort(),8000);
    const res=await rtdbGet(RTDB_GAME_PATH,'?orderBy=%22score%22&limitToLast=10',{signal:controller.signal});
    clearTimeout(to);
    if(!res.ok){const detail=await res.text().catch(()=>"");throw new Error("Realtime Database read failed: HTTP "+res.status+" "+detail);}
    const data=await res.json();
    const rows=Object.values(data||{}).map(x=>({game:x.game||"memory",name:x.gameName||x.name||"Player",score:Number(x.score||0),level:Number(x.level||0),moves:Number(x.moves||0),timeSeconds:Number(x.timeSeconds||0)}));
    rows.sort((a,b)=>Number(b.score||0)-Number(a.score||0));list.innerHTML="";
    rows.slice(0,10).forEach((x,i)=>{const li=document.createElement("li");li.innerHTML=`<b>${i+1}. ${safe(x.name||"Player")}</b><span class="lbscore">${Number(x.score||0).toLocaleString()}</span>`;list.appendChild(li)});
    if(!list.children.length)list.innerHTML="<li>No scores yet — be the first!</li>";
  }catch(e){
    console.error("Leaderboard error:",e);
    list.innerHTML="<li>Leaderboard unavailable — check Firebase Realtime Database rules.</li>";
  }
}

function floatText(text,card,positive=true){const r=card.getBoundingClientRect(),e=document.createElement("div");e.className=`float ${positive?"positive":"negative"}`;e.textContent=text;e.style.left=(r.left+r.width/2-20)+"px";e.style.top=(r.top+r.height/2)+"px";document.body.appendChild(e);setTimeout(()=>e.remove(),900)}
function burst(card){
  const r=(card||$("board")).getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  for(let i=0;i<18;i++){const e=document.createElement("i");e.className="confetti";e.style.left=cx+"px";e.style.top=cy+"px";e.style.setProperty("--dx",(Math.random()*260-130)+"px");e.style.setProperty("--dy",(Math.random()*220-110)+"px");e.style.background=["#73e6a2","#b98cff","#ffd36a","#6ea8ff","#ff6e73"][i%5];document.body.appendChild(e);setTimeout(()=>e.remove(),1250)}
}
showMainMenu();loadLeaderboard();
