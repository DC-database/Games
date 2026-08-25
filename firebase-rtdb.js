// IRWFLIX PLAY — Passwordless player identity + Realtime Database
const RTDB_BASE_URL = "https://leaderboard-90b9b-default-rtdb.firebaseio.com";
const SESSION_KEY = "irwflixSession";

function getSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } }
function setSession(s){ localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }
function cleanName(v,max){ return String(v||"").trim().slice(0,max); }
function nameKey(v){ return cleanName(v,64).toLowerCase(); }
function rtdbUrl(path, query=""){
  const clean=String(path).replace(/^\/+|\/+$/g, "");
  return `${RTDB_BASE_URL}/${clean}.json${query}`;
}
async function rtdbGet(path, query="", options={}){ return fetch(rtdbUrl(path,query), options); }
async function rtdbPost(path,data,options={}){
  const {headers,...rest}=options;
  return fetch(rtdbUrl(path),{method:"POST",headers:{"Content-Type":"application/json",...(headers||{})},body:JSON.stringify(data),...rest});
}
async function rtdbPatch(path,data,options={}){
  const {headers,...rest}=options;
  return fetch(rtdbUrl(path),{method:"PATCH",headers:{"Content-Type":"application/json",...(headers||{})},body:JSON.stringify(data),...rest});
}
async function rtdbPut(path,data,options={}){
  const {headers,...rest}=options;
  return fetch(rtdbUrl(path),{method:"PUT",headers:{"Content-Type":"application/json",...(headers||{})},body:JSON.stringify(data),...rest});
}
function requirePlayer(){
  const s=getSession();
  if(!s?.idName || !s?.gameName){ location.href="../"; return null; }
  return s;
}
async function loadPlayerByIdName(idName){
  const key=nameKey(idName);
  const res=await rtdbGet(`players/${encodeURIComponent(key)}`);
  if(!res.ok) throw new Error(`PLAYER_READ_${res.status}`);
  const p=await res.json();
  return p ? {...p,uid:key,idName:p.idName||idName} : null;
}
