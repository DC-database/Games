
const cfg={apiKey:"AIzaSyC2jNNzAkghmVE6KLOeGPtd3CCTzpw3qo",authDomain:"leaderboard-90b9b.firebaseapp.com",projectId:"leaderboard-90b9b",storageBucket:"leaderboard-90b9b.firebasestorage.app",messagingSenderId:"891059392275",appId:"1:891059392275:web:757305992c2d83d39214e6",measurementId:"G-RXNVYRFXC5"};
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[<>&"]/g,"");
let player=localStorage.getItem("irwflixPlayer")||localStorage.getItem("memoryPlayer")||"Player";
if(!player||player==="Player"){player=prompt("Enter your player name","Player")||"Player";localStorage.setItem("irwflixPlayer",player)}
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

let level=1,moves=0,score=0,seconds=0,first=null,second=null,lock=false,matched=0,timer=null,boostTimer=null,boostLeft=0,boostUsed=false,runStarted=false,submitted=false;

const emojiSVG={
  dog:"🐶",cat:"🐱",rabbit:"🐰",chicken:"🐔",lion:"🦁",tiger:"🐯",monkey:"🐵",elephant:"🐘",giraffe:"🦒",zebra:"🦓",
  dolphin:"🐬",whale:"🐋",octopus:"🐙",shark:"🦈",turtle:"🐢",crab:"🦀",fish:"🐠",squid:"🦑",shrimp:"🦐",fox:"🦊",bear:"🐻",
  wolf:"🐺",deer:"🦌",owl:"🦉",frog:"🐸",hedgehog:"🦔",squirrel:"🐿️",panda:"🐼",koala:"🐨",rhino:"🦏",hippo:"🦛",
  cheetah:"🐆",crocodile:"🐊",parrot:"🦜",flamingo:"🦩",snake:"🐍",horse:"🐴",pig:"🐷",sheep:"🐑",goat:"🐐",duck:"🦆",
  cow:"🐮",hamster:"🐹",mouse:"🐭",jellyfish:"🪼",seal:"🦭",penguin:"🐧",kangaroo:"🦘",gorilla:"🦍",
  leopard:"🐆",sloth:"🦥",otter:"🦦",eagle:"🦅",peacock:"🦚",lizard:"🦎",snail:"🐌"
};
function animalSvg(name){return `<svg viewBox="0 0 100 100" role="img" aria-label="${name}"><text x="50" y="74" text-anchor="middle" font-size="68" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emojiSVG[name]||"❓"}</text></svg>`}
const SVG={
apple:`<svg viewBox="0 0 100 100"><path d="M54 28c7-12 17-14 26-13-2 11-8 17-18 18" fill="#55a35b"/><path d="M49 35C31 20 10 39 18 61c7 20 17 26 32 28 16 2 34-10 37-30 3-20-16-34-38-24z" fill="#ef4f63"/><path d="M49 35c-3-8-2-14 3-20" stroke="#51402f" stroke-width="6" fill="none"/></svg>`,
rocket:`<svg viewBox="0 0 100 100"><path d="M54 12C76 20 84 38 76 58L57 78 35 58c-7-19 1-36 19-46z" fill="#6ea8ff"/><circle cx="58" cy="39" r="8" fill="#fff"/><path d="M36 57 18 68l8 12 21-11M58 76l-2 18 14-5 4-20" fill="#ffbd5c"/><path d="M35 59 22 82" stroke="#ff6e6e" stroke-width="8"/></svg>`,
crown:`<svg viewBox="0 0 100 100"><path d="M15 30 34 47 50 20l16 27 19-17-7 49H22z" fill="#ffd34f" stroke="#c89427" stroke-width="5"/><path d="M25 66h50" stroke="#fff1a1" stroke-width="6"/></svg>`,
car:`<svg viewBox="0 0 100 100"><path d="M20 58 28 37h43l12 21v20H18V58z" fill="#5d8cff"/><path d="M33 40h32l8 16H27z" fill="#b9dcff"/><circle cx="31" cy="79" r="9" fill="#27384e"/><circle cx="71" cy="79" r="9" fill="#27384e"/></svg>`,
cat:`<svg viewBox="0 0 100 100"><path d="M24 42V19l16 12c7-3 13-3 20 0l16-12v24c8 25-7 41-26 41S16 67 24 42z" fill="#f3a75c"/><circle cx="39" cy="51" r="4"/><circle cx="61" cy="51" r="4"/><path d="M46 62q4 5 8 0" stroke="#603c31" stroke-width="4" fill="none"/></svg>`,
dog:`<svg viewBox="0 0 100 100"><path d="M24 33 15 17l22 9c9-5 18-5 27 0l21-9-8 18c5 27-8 48-28 48S19 60 24 33z" fill="#b98255"/><circle cx="40" cy="51" r="4"/><circle cx="62" cy="51" r="4"/><path d="M43 65q7 8 14 0" stroke="#51352b" stroke-width="4" fill="none"/></svg>`,
sun:`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="23" fill="#ffd45c"/><g stroke="#ffb93f" stroke-width="7"><path d="M50 12v18M50 70v18M12 50h18M70 50h18M23 23l13 13M64 64l13 13M77 23 64 36M36 64 23 77"/></g></svg>`,
moon:`<svg viewBox="0 0 100 100"><path d="M67 18c-9 6-15 16-15 28 0 18 14 32 32 32 3 0 6 0 9-1-8 11-21 18-35 18-24 0-43-19-43-43S34 9 58 9c3 0 6 0 9 1z" fill="#8ea8ff"/></svg>`,
gem:`<svg viewBox="0 0 100 100"><path d="M20 34 34 18h32l14 16-30 49z" fill="#b88cff"/><path d="M20 34h60M34 18l16 65 16-65" stroke="#e5d7ff" stroke-width="4" fill="none"/></svg>`,
robot:`<svg viewBox="0 0 100 100"><rect x="22" y="28" width="56" height="48" rx="12" fill="#7b91a8"/><rect x="34" y="40" width="10" height="10" rx="2" fill="#73e6a2"/><rect x="56" y="40" width="10" height="10" rx="2" fill="#73e6a2"/><path d="M50 28V17M44 17h12M36 64h28" stroke="#41566c" stroke-width="6"/></svg>`,
ball:`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ff6e73"/><path d="M50 16q0 20 18 34M50 84q0-20-18-34M20 36q18 4 30-20M80 64q-18-4-30 20" stroke="#fff" stroke-width="5" fill="none"/></svg>`,
star:`<svg viewBox="0 0 100 100"><path d="m50 12 10 26 28 2-21 18 7 28-24-15-24 15 7-28-21-18 28-2z" fill="#ffd45c" stroke="#e4a83c" stroke-width="5"/></svg>`
};
Object.keys(emojiSVG).forEach(name=>{SVG[name]=animalSvg(name)});

function shuffled(a){return [...a].sort(()=>Math.random()-.5)}
function levelPairs(){return Math.min(12,4+Math.floor((level-1)*2))}
function startRun(){
  if(runStarted)return;
  runStarted=true;timer=setInterval(()=>{seconds++;$("time").textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`},1000);
}
function startBoost(){
  if(boostUsed)return;
  boostUsed=true;boostLeft=60;$("boost").classList.remove("hidden");
  $("message").textContent="⚡ SPEED BONUS! 2× score for 60 seconds!";
  boostTimer=setInterval(()=>{boostLeft--; $("boostTime").textContent=boostLeft;if(boostLeft<=0){clearInterval(boostTimer);$("boost").classList.add("hidden");$("message").textContent="Bonus expired — normal scoring continues."}},1000);
}
function levelTheme(){return ["Farm Friends","Jungle Crew","Ocean Life","Forest Friends","Safari","Pets & Farm","Ocean Deep","Wild Animals","Birds & Reptiles","Animal Kingdom Mix"][Math.min(level-1,9)]}
function setup(){
  clearInterval(timer);clearInterval(boostTimer);timer=null;boostTimer=null;
  moves=score=seconds=matched=0;first=second=null;lock=false;submitted=false;runStarted=false;boostUsed=false;boostLeft=0;
  $("moves").textContent=0;$("score").textContent=0;$("time").textContent="0:00";$("level").textContent=level;$("levelFill").style.width=`${Math.min(100,level*10)}%`;$("boost").classList.add("hidden");
  const count=levelPairs(), pool=levelIcons(), vals=shuffled(pool.slice(0,count).flatMap(x=>[x,x]));
  $("board").innerHTML="";
  vals.forEach((icon,i)=>{
    const b=document.createElement("button");b.className="card";b.dataset.icon=icon;b.setAttribute("aria-label","Memory card");
    b.innerHTML=`<span class="card-inner"><span class="face back"></span><span class="face front">${SVG[icon]}</span></span>`;
    b.addEventListener("click",()=>flip(b));$("board").appendChild(b);
  });
  $("message").textContent=`Level ${level}: ${levelTheme()} — find ${count} pairs.`;
}
function flip(card){
  if(lock||card.classList.contains("flipped")||card.classList.contains("matched"))return;
  startRun();card.classList.add("flipped");
  if(!first){first=card;return}
  second=card;moves++;$("moves").textContent=moves;lock=true;
  setTimeout(()=>{
    if(first.dataset.icon===second.dataset.icon){
      first.classList.add("matched");second.classList.add("matched");matched+=2;
      const base=100+Math.max(0,80-Math.min(80,seconds))*2;
      const combo=moves<=countSafe()*2?1:1;
      const mult=boostUsed&&boostLeft>0?2:1;
      score+=Math.round(base*mult);$("score").textContent=score.toLocaleString();
      floatText(`+${Math.round(base*mult)}`,second);burst(second);
      if(!boostUsed&&matched>=Math.floor(levelPairs()/2)*2)startBoost();
      if(matched===levelPairs()*2)setTimeout(levelComplete,500);
    }else{
      // Keep the board locked until both incorrect cards are actually turned back over.
      // Previously lock was released immediately, allowing another tap during the
      // 350ms reset animation and leaving cards in an incorrect state.
      const a=first, b=second;
      a.classList.add("bad");b.classList.add("bad");
      setTimeout(()=>{
        // End the shake first. Then remove `flipped` so the cards use the
        // normal 3D transition back to the original face-down position.
        a.classList.remove("bad");
        b.classList.remove("bad");
        requestAnimationFrame(()=>{
          a.classList.remove("flipped");
          b.classList.remove("flipped");
          first=null;
          second=null;
          // Keep the board locked until the return flip has visually started.
          setTimeout(()=>{ lock=false; },430);
        });
      },330);
      return;
    }
    first=null;
    second=null;
    lock=false;
  },500);
}
function countSafe(){return levelPairs()}
function levelComplete(){
  score+=500*level; $("score").textContent=score.toLocaleString(); burst();
  if(level<10){level++;$("level").textContent=level;$("message").textContent=`🎉 Level cleared! Level ${level} starting…`;setTimeout(setup,900)}
  else finish("🏆 MAX LEVEL COMPLETE");
}
function finish(title){
  clearInterval(timer);clearInterval(boostTimer);
  if(submitted)return;
  const overlay=$("overlay");overlay.className="overlay";
  overlay.innerHTML=`<div class="modal"><h2>${title}</h2><div class="final">${score.toLocaleString()}</div><p>${safe(player)} · Level ${level} · ${moves} moves · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}</p><button class="submit" id="submit">SUBMIT SCORE</button><button class="again" id="again">PLAY AGAIN</button></div>`;
  $("submit").onclick=async()=>{await submitScore();overlay.className="overlay hidden";loadLeaderboard()};
  $("again").onclick=()=>{overlay.className="overlay hidden";level=1;setup()};
}
async function submitScore(){
  if(submitted)return;
  submitted=true;
  try{
    const payload={fields:{
      game:{stringValue:"memory"},
      name:{stringValue:String(player)},
      score:{integerValue:String(Number(score)||0)},
      level:{integerValue:String(Number(level)||1)},
      moves:{integerValue:String(Number(moves)||0)},
      timeSeconds:{integerValue:String(Number(seconds)||0)},
      createdAt:{integerValue:String(Date.now())}
    }};
    const res=await fetch("https://firestore.googleapis.com/v1/projects/leaderboard-90b9b/databases/(default)/documents/leaderboard",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("Firestore upload failed: "+res.status);
    $("message").textContent="✅ Score registered on the global leaderboard.";
  }catch(e){console.error(e);submitted=false;$("message").textContent="⚠️ Score could not be uploaded. Try SUBMIT SCORE again."}
}
$("newGame").onclick=()=>{if(runStarted&&!submitted&&score>0)finish("RUN ENDED");else{level=1;setup()}};
$("endRun").onclick=()=>{if(runStarted&&score>0)finish("RUN ENDED");else $("message").textContent="Start playing before submitting a run."};
$("refresh").onclick=loadLeaderboard;
async function loadLeaderboard(){
  const list=$("leaderboard");list.innerHTML="<li>Loading…</li>";
  try{
    const controller=new AbortController(); const to=setTimeout(()=>controller.abort(),8000);
    const res=await fetch("https://firestore.googleapis.com/v1/projects/leaderboard-90b9b/databases/(default)/documents/leaderboard?pageSize=1000",{signal:controller.signal});
    clearTimeout(to);
    if(!res.ok) throw new Error("Firestore read failed: "+res.status);
    const data=await res.json();
    const rows=(data.documents||[]).map(d=>{
      const f=d.fields||{};
      return {game:f.game?.stringValue||"",name:f.name?.stringValue||"Player",score:Number(f.score?.integerValue||f.score?.doubleValue||0),level:Number(f.level?.integerValue||0),moves:Number(f.moves?.integerValue||0),timeSeconds:Number(f.timeSeconds?.integerValue||0)};
    }).filter(x=>x.game==="memory");
    rows.sort((a,b)=>Number(b.score||0)-Number(a.score||0));list.innerHTML="";
    rows.slice(0,10).forEach((x,i)=>{const li=document.createElement("li");li.innerHTML=`<b>${i+1}. ${safe(x.name||"Player")}</b><span class="lbscore">${Number(x.score||0).toLocaleString()}</span>`;list.appendChild(li)});
    if(!list.children.length)list.innerHTML="<li>No scores yet — be the first!</li>";
  }catch(e){console.error(e);list.innerHTML="<li>Leaderboard unavailable</li>"}
}
function floatText(text,card){const r=card.getBoundingClientRect(),e=document.createElement("div");e.className="float";e.textContent=text;e.style.left=(r.left+r.width/2-20)+"px";e.style.top=(r.top+r.height/2)+"px";document.body.appendChild(e);setTimeout(()=>e.remove(),900)}
function burst(card){
  const r=(card||$("board")).getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  for(let i=0;i<18;i++){const e=document.createElement("i");e.className="confetti";e.style.left=cx+"px";e.style.top=cy+"px";e.style.setProperty("--dx",(Math.random()*260-130)+"px");e.style.setProperty("--dy",(Math.random()*220-110)+"px");e.style.background=["#73e6a2","#b98cff","#ffd36a","#6ea8ff","#ff6e73"][i%5];document.body.appendChild(e);setTimeout(()=>e.remove(),1250)}
}
setup();loadLeaderboard();
