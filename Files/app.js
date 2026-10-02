(function(){
"use strict";

const $=s=>document.querySelector(s),KEY="maxdashboard:max-dashboard:v4",OLD_KEY="maxdashboard:maxdash:v3",LEGACY_KEY="maxdash.v2",KEY_REV=KEY+":rev",WX_KEY=KEY+":weather",WX_LEASE=KEY+":weather:lease",REPAIR_KEY=KEY+":repair",STATE_LOCK=KEY+":lock",STATE_SCHEMA=4;
let TODAY,YDAY;
const ISO=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
function setDay(){const t=new Date();TODAY=ISO(t);YDAY=ISO(new Date(t.getFullYear(),t.getMonth(),t.getDate()-1))}
setDay();
function frameGuard(){
  if(window.top===window.self)return true;
  try{
    const testMode=new URLSearchParams(location.search).get("test")==="1";
    if(testMode&&window.parent.location.origin===location.origin&&/\/tests\/(?:startup|audit-regression)-test\.html$/.test(window.parent.location.pathname))return true;
  }catch(_){}
  document.documentElement.innerHTML="<title>Max Dashboard</title><p>This dashboard cannot be embedded in a frame.</p>";
  return false;
}
function startup(){
if(!frameGuard())return false;
function ensureFreshDay(){if(TODAY===ISO(new Date()))return;setDay();reconcileState();save();stats()}
const D={schema:STATE_SCHEMA,focus:[["Finish Homework (PT1)",1,TODAY],["Learn / Revise Science",0],["Work on GALACTO",0],["Explore Sarvam AI (Roadmap)",0],["Exercise + Healthy Meals",0]],
goals:[["Score well in PT1",1,TODAY],["Build GALACTO v0.1",0],["Improve Minecraft modding",0],["Learn AI & LLMs",0],["Stay healthy & fit",0],["Help family (business)",0]],
notes:[["Minecraft mod ideas",1,TODAY],["App features (Lovit)",0],["UHLM architecture",0],["Neumann commands",0],["Zythera v0.3 words",0],["Content ideas",0]],
proj:[["GALACTO",40,"#b45cff"],["UHLM (Synthesize)",30,"#22d3ee"],["Neumann (Linux)",20,"#34e37f"],["Zythera (Lang)",50,"#ffa726"],["Ayurveda App",25,"#ff4d8d"]],
streak:{last:"",n:0},pomo:{day:"",n:0},done:{day:"",n:0}};
D.xp=0;D.pref={b:"self",e:"google"};D.hist={};D.rewards=Object.create(null);D.pomoHist=Object.create(null);D.timer={mode:25,T:1500,st:"idle",end:0,id:""};const clone=x=>typeof structuredClone==="function"?structuredClone(x):JSON.parse(JSON.stringify(x));
const dayAgo=n=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()-n)};
const isNum=x=>typeof x==="number"&&Number.isFinite(x);
const isInt=(x,max)=>Number.isInteger(x)&&x>=0&&x<=max;
const isStr=x=>typeof x==="string";
const isText=x=>isStr(x)&&x.length<=500;
const isColor=x=>typeof x==="string"&&/^#[0-9a-fA-F]{6}$/.test(x);
const isDay=x=>{
  if(!isStr(x)||!/^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(x))return false;
  const [y,m,d]=x.split("-").map(Number),dt=new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d&&x<=TODAY;
};
const isDS=x=>x===""||isDay(x);
const normalizePersistedDay=x=>isDay(x)?x:null;
const normalizeDay=x=>{if(isDay(x))return x;if(isStr(x)&&/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/.test(x)){const d=new Date(x);if(Number.isFinite(d.getTime())){const y=ISO(d);return isDay(y)?y:null}}return null};
const isTaskId=x=>isStr(x)&&/^[a-zA-Z0-9_-]{8,80}$/.test(x);
const isTask=x=>Array.isArray(x)&&x.length>=2&&x.length<=4&&isText(x[0])&&(x[1]===0||x[1]===1)&&(x.length<3||x[2]===""||isDay(x[2]))&&(x.length<4||isTaskId(x[3]));
const isProj=x=>Array.isArray(x)&&x.length===3&&isText(x[0])&&Number.isInteger(x[1])&&x[1]>=0&&x[1]<=100&&isColor(x[2]);
const isNonNegNum=x=>isNum(x)&&x>=0;
const LIM={xp:1e6,streak:36500,pomo:500,done:5000,hist:5000,items:1000,days:400,backupBytes:2_000_000};
const BROWSERS=["self","chrome","edge","firefox","brave"],ENGINES=["google","ddg","bing","brave"];
const ROOT_KEYS=new Set(["schema","focus","goals","notes","proj","xp","streak","pomo","done","pref","hist","timer","rewards","pomoHist"]);
const MAX_STATE_BYTES=2_000_000;
function validState(j){
  if(!j||typeof j!=="object"||Array.isArray(j)||j.schema!==STATE_SCHEMA)return false;
  for(const k of Object.keys(j))if(!ROOT_KEYS.has(k))return false;
  if(!["focus","goals","notes"].every(k=>Array.isArray(j[k])&&j[k].length<=LIM.items&&j[k].every(isTask)))return false;
  if(!Array.isArray(j.proj)||j.proj.length>LIM.items||!j.proj.every(isProj))return false;
  if("xp"in j&&!isInt(j.xp,LIM.xp))return false;
  if("streak"in j&&!(j.streak&&typeof j.streak==="object"&&!Array.isArray(j.streak)&&isInt(j.streak.n,LIM.streak)&&isDS(j.streak.last)))return false;
  if("pomo"in j&&!(j.pomo&&typeof j.pomo==="object"&&!Array.isArray(j.pomo)&&isInt(j.pomo.n,LIM.pomo)&&isDS(j.pomo.day)))return false;
  if("done"in j&&!(j.done&&typeof j.done==="object"&&!Array.isArray(j.done)&&isInt(j.done.n,LIM.done)&&isDS(j.done.day)))return false;
  if("pref"in j&&!(j.pref&&typeof j.pref==="object"&&!Array.isArray(j.pref)&&BROWSERS.includes(j.pref.b)&&ENGINES.includes(j.pref.e)))return false;
  if("hist"in j&&!(j.hist&&typeof j.hist==="object"&&!Array.isArray(j.hist)&&(Object.getPrototypeOf(j.hist)===Object.prototype||Object.getPrototypeOf(j.hist)===null)&&Object.keys(j.hist).length<=LIM.days&&Object.entries(j.hist).every(([k,v])=>isDay(k)&&isInt(v,LIM.hist))))return false;
  if("timer"in j&&!(j.timer&&typeof j.timer==="object"&&!Array.isArray(j.timer)&&isInt(j.timer.mode,60)&&[5,25].includes(j.timer.mode)&&isInt(j.timer.T,3600)&&["idle","running","paused"].includes(j.timer.st)&&isNum(j.timer.end)&&j.timer.end>=0&&j.timer.end<=Number.MAX_SAFE_INTEGER&&(!("id"in j.timer)||isStr(j.timer.id)&&j.timer.id.length<=100)))return false;
  if("rewards"in j&&!(j.rewards&&typeof j.rewards==="object"&&!Array.isArray(j.rewards)&&Object.getPrototypeOf(j.rewards)===null&&Object.keys(j.rewards).length<=LIM.items*3&&Object.values(j.rewards).every(v=>v===1)))return false;
  if("pomoHist"in j&&!(j.pomoHist&&typeof j.pomoHist==="object"&&!Array.isArray(j.pomoHist)&&Object.getPrototypeOf(j.pomoHist)===null&&Object.keys(j.pomoHist).length<=LIM.days&&Object.entries(j.pomoHist).every(([k,v])=>isDay(k)&&isInt(v,LIM.pomo))))return false;
  return true;
}
function makeId(){return (crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10)).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80)}
function sanitizeState(j){
  const out=clone(D);out.schema=STATE_SCHEMA;let repaired=!!(j&&j.schema!==undefined&&j.schema!==STATE_SCHEMA);
  const taskList=k=>{
    if(!Array.isArray(j?.[k])){repaired=true;return clone(D[k])}
    const src=j[k].slice(0,LIM.items),good=[];
    for(const t of src){
      if(!Array.isArray(t)||!isText(t[0])||(t[1]!==0&&t[1]!==1)){repaired=true;continue}
      const d=t.length>=3?normalizeDay(t[2]):null;
      if(t.length>=3&&!d){repaired=true;continue}
      let id=t[3];if(!isTaskId(id)){id=makeId();repaired=true}
      good.push(d?[t[0],t[1],d,id]:[t[0],t[1],"",id]);
    }
    if(j[k].length>LIM.items)repaired=true;return good;
  };
  out.focus=taskList("focus");out.goals=taskList("goals");out.notes=taskList("notes");
  if(Array.isArray(j?.proj)){const src=j.proj.slice(0,LIM.items),good=[];for(const p of src){if(isProj(p))good.push([p[0],p[1],p[2]]);else repaired=true}if(j.proj.length>LIM.items)repaired=true;out.proj=good}else repaired=true;
  if(isInt(j?.xp,LIM.xp))out.xp=j.xp;else if(j&&"xp"in j)repaired=true;
  if(j?.streak&&typeof j.streak==="object"&&!Array.isArray(j.streak)&&isInt(j.streak.n,LIM.streak)&&(j.streak.last===""||normalizeDay(j.streak.last)!==null))out.streak={last:j.streak.last===""?"":normalizeDay(j.streak.last),n:j.streak.n};else if(j&&"streak"in j)repaired=true;
  if(j?.pomo&&typeof j.pomo==="object"&&!Array.isArray(j.pomo)&&isInt(j.pomo.n,LIM.pomo)&&(j.pomo.day===""||normalizeDay(j.pomo.day)!==null))out.pomo={day:j.pomo.day===""?"":normalizeDay(j.pomo.day),n:j.pomo.n};else if(j&&"pomo"in j)repaired=true;
  if(j?.done&&typeof j.done==="object"&&!Array.isArray(j.done)&&isInt(j.done.n,LIM.done)&&(j.done.day===""||normalizeDay(j.done.day)!==null))out.done={day:j.done.day===""?"":normalizeDay(j.done.day),n:j.done.n};else if(j&&"done"in j)repaired=true;
  if(j?.pref&&typeof j.pref==="object"&&!Array.isArray(j.pref)&&BROWSERS.includes(j.pref.b)&&ENGINES.includes(j.pref.e))out.pref={b:j.pref.b,e:j.pref.e};else if(j&&"pref"in j)repaired=true;
  if(j?.hist&&typeof j.hist==="object"&&!Array.isArray(j.hist)&&(Object.getPrototypeOf(j.hist)===Object.prototype||Object.getPrototypeOf(j.hist)===null)){const e=Object.entries(j.hist).slice(0,LIM.days).map(([k,v])=>[normalizeDay(k),v]).filter(([k,v])=>k&&isInt(v,LIM.hist));if(e.length!==Object.keys(j.hist).length)repaired=true;out.hist=Object.assign(Object.create(null),Object.fromEntries(e))}else if(j&&"hist"in j)repaired=true;
  if(j?.timer&&typeof j.timer==="object"&&!Array.isArray(j.timer)&&isInt(j.timer.mode,60)&&[5,25].includes(j.timer.mode)&&isInt(j.timer.T,3600)&&["idle","running","paused"].includes(j.timer.st)&&isNum(j.timer.end)&&j.timer.end>=0&&j.timer.end<=Number.MAX_SAFE_INTEGER)out.timer={mode:j.timer.mode,T:j.timer.T,st:j.timer.st,end:j.timer.end,id:isTaskId(j.timer.id)?j.timer.id:""};else if(j&&"timer"in j)repaired=true;
  if(j?.rewards&&typeof j.rewards==="object"&&!Array.isArray(j.rewards)){const r=Object.create(null);for(const [k,v] of Object.entries(j.rewards).slice(0,LIM.items*3))if(v===1&&isStr(k)&&k.length<=500)r[k]=1;if(Object.keys(r).length!==Object.keys(j.rewards).length)repaired=true;out.rewards=r}else if(j&&"rewards"in j)repaired=true;
  if(j?.pomoHist&&typeof j.pomoHist==="object"&&!Array.isArray(j.pomoHist)){const r=Object.create(null);for(const [k,v] of Object.entries(j.pomoHist).slice(0,LIM.days)){const d=normalizeDay(k);if(d&&isInt(v,LIM.pomo))r[d]=v;else repaired=true}out.pomoHist=r}else if(j&&"pomoHist"in j)repaired=true;
  return {state:out,repaired};
}
function buildState(j){return sanitizeState(j).state}
function countDay(day){return ["focus","goals","notes"].reduce((n,k)=>n+S[k].filter(t=>t[2]===day).length,0)}
function countToday(){return countDay(TODAY)}
function rebuildHistory(){const next=Object.create(null);for(let i=0;i<90;i++){const d=ISO(dayAgo(i)),n=countDay(d);if(n>0)next[d]=Math.min(LIM.hist,n)}S.hist=next}
function securityGuard(){const r=sanitizeState(S);S=r.state;Object.defineProperty(S,"_repairNotice",{value:Boolean(r.repaired||S._repairNotice),writable:true,configurable:true,enumerable:false});S.xp=Math.max(0,Math.min(LIM.xp,Math.trunc(S.xp)));pruneHist()}
function reconcileState(){
  securityGuard();
  for(const k of["focus","goals","notes"])for(const t of S[k])if(t[1]===1&&t[2]&&t[2]<TODAY)t[1]=0;
  rebuildHistory();S.done={day:TODAY,n:countToday()};
  if(!S.pomoHist||typeof S.pomoHist!=="object")S.pomoHist=Object.create(null);
  const timer=S.timer;
  if(timer.st==="running"&&(!Number.isFinite(timer.end)||timer.end<=Date.now())){
    const completedMs=Number.isFinite(timer.end)&&timer.end>0?timer.end:Date.now(),completedDay=ISO(new Date(completedMs)),timerId=isTaskId(timer.id)?timer.id:"";
    if(isDay(completedDay)&&completedDay<=TODAY)grantPomoReward(completedDay,timerId,timer.mode);
    S.timer={mode:timer.mode,T:timer.mode*60,st:"idle",end:0,id:""};rebuildHistory();S.done.n=countToday();
  }else if(timer.st==="running")S.timer.T=Math.min(3600,Math.max(0,Math.round((timer.end-Date.now())/1000)));
  S.pomo={day:TODAY,n:Math.min(LIM.pomo,Number(S.pomoHist[TODAY]||0))};recomputeStreak();
}
function recomputeStreak(){const days=Object.keys(S.hist).filter(k=>isDay(k)&&isInt(S.hist[k],LIM.hist)&&S.hist[k]>0).sort().reverse();if(!days.length){S.streak={last:"",n:0};return}const cursor=new Date();cursor.setHours(0,0,0,0);const today=ISO(cursor);if(days[0]!==today){S.streak={last:days[0],n:0};return}let n=0;for(const k of days){const expected=ISO(cursor);if(k!==expected)break;n++;cursor.setDate(cursor.getDate()-1)}S.streak={last:today,n}}
let S;
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let toastT;function toast(m){const t=$("#toast");if(!t)return;t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),4000)}
addEventListener("maxdash:layout-save-error",()=>toast("⚠️ Widget layout could not be saved; your previous layout was kept."));
let baseState=null,stateChannel=null;
try{if("BroadcastChannel"in window)stateChannel=new BroadcastChannel("maxdashboard-state-v4")}catch(e){stateChannel=null}
const deepEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function taskMerge(base,remote,local){const map=new Map(),bm=new Map(),idOf=t=>isTaskId(t?.[3])?t[3]:"legacy:"+t?.[0]+":"+t?.[2];for(const t of(base||[]))bm.set(idOf(t),t);for(const t of(remote||[]))map.set(idOf(t),t);for(const t of(local||[])){const id=idOf(t),b=bm.get(id),r=map.get(id);if(!b)map.set(id,t);else if(!r){if(!deepEqual(t,b))map.set(id,t)}else if(deepEqual(r,b)&&!deepEqual(t,b))map.set(id,t);else if(!deepEqual(t,b)&&!deepEqual(r,b))map.set(id,t)}return[...map.values()].slice(0,LIM.items)}
function mergeStates(base,remote,local){const m=clone(remote);for(const k of["focus","goals","notes"])m[k]=taskMerge(base?.[k],remote?.[k],local?.[k]);
  const projectMap=new Map((remote?.proj||[]).map(p=>[p[0],p])),baseProj=new Map((base?.proj||[]).map(p=>[p[0],p]));
  for(const p of(local?.proj||[])){const b=baseProj.get(p[0]),r=projectMap.get(p[0]);if(!b||!r||deepEqual(r,b)&&!deepEqual(p,b))projectMap.set(p[0],p);else if(!deepEqual(p,b)&&!deepEqual(r,b))projectMap.set(p[0],p)}
  m.proj=[...projectMap.values()].slice(0,LIM.items);
  const ph=Object.create(null);for(const key of new Set([...Object.keys(base?.pomoHist||{}),...Object.keys(remote?.pomoHist||{}),...Object.keys(local?.pomoHist||{})])){const b=Number(base?.pomoHist?.[key]||0),r=Number(remote?.pomoHist?.[key]||0),l=Number(local?.pomoHist?.[key]||0);ph[key]=Math.min(LIM.pomo,Math.max(0,r+l-b))}
  m.pomoHist=ph;const rr=Object.create(null);for(const src of[remote?.rewards,local?.rewards])for(const[key,val]of Object.entries(src||{}))if(val===1)rr[key]=1;m.rewards=rr;
  m.xp=Math.min(LIM.xp,Math.max(0,Number(remote?.xp||0)+(Number(local?.xp||0)-Number(base?.xp||0))));
  for(const k of["streak","pomo","done","pref","timer"])m[k]=deepEqual(local?.[k],base?.[k])?remote?.[k]:local?.[k];
  return sanitizeState(m).state}
function acquireStateLease(){
  const token=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random()),now=Date.now();
  try{
    const raw=localStorage.getItem(STATE_LOCK);
    if(raw){const x=JSON.parse(raw);if(x&&isNum(x.until)&&x.until>now)return null}
    localStorage.setItem(STATE_LOCK,JSON.stringify({token,until:now+1500}));
    const check=JSON.parse(localStorage.getItem(STATE_LOCK)||"null");
    return check?.token===token?token:null;
  }catch(e){return null}
}
function releaseStateLease(token){if(!token)return;try{const x=JSON.parse(localStorage.getItem(STATE_LOCK)||"null");if(x?.token===token)localStorage.removeItem(STATE_LOCK)}catch(e){}}
function persistState(){
  let lease=null;
  try{
    if(TODAY!==ISO(new Date())){setDay();reconcileState()}
    S.schema=STATE_SCHEMA;securityGuard();if(!validState(S))throw new Error("invalid-state");
    let payload=JSON.stringify(S);if(new Blob([payload]).size>MAX_STATE_BYTES)throw new Error("state-too-large");
    lease=acquireStateLease();if(!lease)throw new Error("state-busy");
    let currentRev=Number(localStorage.getItem(KEY_REV)||0),expected=Number(S?._rev||0);
    if(expected!==currentRev){
      const raw=localStorage.getItem(KEY);if(!raw||new Blob([raw]).size>MAX_STATE_BYTES)throw new Error("state-conflict");
      const remote=sanitizeState(JSON.parse(raw)).state;S=mergeStates(baseState||remote,remote,S);S.schema=STATE_SCHEMA;
      currentRev=Number(localStorage.getItem(KEY_REV)||0);payload=JSON.stringify(S);
      if(new Blob([payload]).size>MAX_STATE_BYTES)throw new Error("state-too-large");
    }
    for(let attempt=0;attempt<3;attempt++){
      const before=Number(localStorage.getItem(KEY_REV)||0);
      if(before!==currentRev){
        const raw=localStorage.getItem(KEY);if(!raw||new Blob([raw]).size>MAX_STATE_BYTES)throw new Error("state-conflict");
        const remote=sanitizeState(JSON.parse(raw)).state;S=mergeStates(baseState||remote,remote,S);S.schema=STATE_SCHEMA;
        currentRev=Number(localStorage.getItem(KEY_REV)||0);payload=JSON.stringify(S);
        if(new Blob([payload]).size>MAX_STATE_BYTES)throw new Error("state-too-large");
        continue;
      }
      const next=currentRev+1;
      if(JSON.parse(localStorage.getItem(STATE_LOCK)||"null")?.token!==lease)throw new Error("state-busy");
      localStorage.setItem(KEY,payload);if(localStorage.getItem(KEY)!==payload)throw new Error("state-write-verify");
      if(Number(localStorage.getItem(KEY_REV)||0)!==currentRev)continue;
      localStorage.setItem(KEY_REV,String(next));if(Number(localStorage.getItem(KEY_REV))!==next)continue;
      Object.defineProperty(S,"_rev",{value:next,writable:true,configurable:true,enumerable:false});baseState=clone(S);try{stateChannel?.postMessage({type:"state",rev:next})}catch(e){}releaseStateLease(lease);lease=null;return true
    }
    throw new Error("state-conflict");
  }catch(e){releaseStateLease(lease);toast(e.message==="state-too-large"?"⚠️ Dashboard data is too large to save.":e.message==="state-busy"?"⚠️ Another tab is saving; your changes remain in memory.":"⚠️ Couldn't save — your changes are still in memory");return false}
}
const save=persistState;
function bootstrap(){
  let canPersist=true;
  try{const raw=localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY)||localStorage.getItem(LEGACY_KEY);if(raw&&new Blob([raw]).size>MAX_STATE_BYTES)throw new Error("state-too-large");const j=raw?JSON.parse(raw):null,r=raw?sanitizeState(j):{state:sanitizeState(clone(D)).state,repaired:false};S=r.state;Object.defineProperty(S,"_repairNotice",{value:r.repaired,writable:true,configurable:true,enumerable:false});Object.defineProperty(S,"_rev",{value:Number(localStorage.getItem(KEY_REV)||0),writable:true,configurable:true,enumerable:false});baseState=clone(S)}catch(e){canPersist=false;S=clone(D);Object.defineProperty(S,"_repairNotice",{value:true,writable:true,configurable:true,enumerable:false});Object.defineProperty(S,"_rev",{value:Number(localStorage.getItem(KEY_REV)||0),writable:true,configurable:true,enumerable:false});baseState=clone(S);toast(e.message==="state-too-large"?"⚠️ Saved dashboard data is too large to load; safe defaults are running in memory.":"⚠️ Saved dashboard data could not be read; safe defaults are running in memory.")}reconcileState();if(canPersist){const persisted=save();if(!persisted)toast("⚠️ Dashboard loaded, but saved changes could not be persisted.")}return true
}
if(!bootstrap())return false;window.__MAX_BOOTSTRAP_OK=true;
if(S._repairNotice||sessionStorage.getItem(REPAIR_KEY)){toast("⚠️ Some saved data was repaired. Export a backup to keep the repaired state.");try{sessionStorage.removeItem(REPAIR_KEY)}catch(e){}}
if(window.IMG){
  const av=$("#av");
  if(typeof IMG.avatar==="string" && /^Files\/media\/[^"']+\.(?:webp|png|jpe?g)$/i.test(IMG.avatar)){
    av.src=IMG.avatar;av.classList.add("visible");
  }
}
function bumpStreak(){rebuildHistory();recomputeStreak()}
function list(k){$("#l-"+k).innerHTML=S[k].map((t,i)=>`<li class="t"><input type="checkbox" data-k="${k}" data-i="${i}" ${t[1]?"checked":""} aria-label="${esc(t[0])}"><span>${esc(t[0])}</span><button data-x="${k}:${i}" aria-label="Delete">×</button></li>`).join("");renderStats()}
function ensureRewards(){if(!S.rewards||typeof S.rewards!=="object"||Array.isArray(S.rewards))S.rewards=Object.create(null)}
function grantTaskReward(k,i,t){ensureRewards();if(!isTaskId(t[3]))t[3]=makeId();const key="task:"+t[3]+":"+TODAY;if(S.rewards[key])return false;S.rewards[key]=1;xp(10);return true}
function revokeTaskReward(k,i,t){ensureRewards();const key="task:"+t[3]+":"+TODAY;if(!S.rewards[key])return false;delete S.rewards[key];xp(-10);return true}
function grantPomoReward(completedDay,timerId,sessionMode){if(!isDay(completedDay)||completedDay>TODAY||!isTaskId(timerId)||sessionMode!==25)return false;ensureRewards();const key="pomo:"+timerId;if(S.rewards[key]===1)return false;const used=Math.min(LIM.pomo,Number(S.pomoHist?.[completedDay]||0));if(used>=LIM.pomo)return false;S.pomoHist[completedDay]=used+1;S.rewards[key]=1;xp(25);return true}
function xp(n){S.xp=Math.max(0,Math.min(LIM.xp,Math.trunc(S.xp+n)))}
function pruneHist(){const cut=ISO(dayAgo(90));for(const k of Object.keys(S.hist))if(k<cut)delete S.hist[k]}
function updateStatsData(){rebuildHistory();pruneHist();recomputeStreak();save()}
function setPct(el,n,prefix=""){
  if(!el)return;
  const n2=Math.max(0,Math.min(100,Math.round(Number(n)||0)));
  [...el.classList].filter(c=>c.startsWith("pct-"+prefix)).forEach(c=>el.classList.remove(c));
  el.classList.add("pct-"+prefix+"-"+n2);
}
function stats(){updateStatsData();renderStats()}
function renderStats(){$("#lv").textContent="Level "+((S.xp/100|0)+1);$("#xpn").textContent=S.xp;setPct($("#xpb"),S.xp%100,"w");
const days=[...Array(7)].map((_,i)=>{const d=dayAgo(6-i);return[d.toLocaleDateString([],{weekday:"narrow"}),S.hist[ISO(d)]||0]}),mx=Math.max(1,...days.map(d=>d[1]));$("#wk").innerHTML=days.map(d=>`<div><i class="pct-h-${Math.min(64,Math.max(0,Math.round(d[1]/mx*64)))}"></i>${d[0]}</div>`).join("");$("#best").textContent=Math.max(0,...Object.values(S.hist));$("#td").textContent=S.done.n;$("#streak").textContent="🔥 "+S.streak.n+"-day streak"}
["focus","goals","notes"].forEach(list);
document.addEventListener("change",e=>{ensureFreshDay();const c=e.target;if(c.dataset.k){const item=S[c.dataset.k]?.[Number(c.dataset.i)];if(!item)return;const was=item[1];item[1]=c.checked?1:0;if(c.checked&&!was){item[2]=TODAY;S.done.n++;grantTaskReward(c.dataset.k,Number(c.dataset.i),item);bumpStreak()}if(!c.checked&&was){uncount(item,c.dataset.k,Number(c.dataset.i));item.length=2}save();stats()}});
/* undo a completion: only touch today's counter if completed today; undated legacy tasks change nothing */
function uncount(t,k,i){if(!t[2]||t[2]!==TODAY)return false;if(S.done.n)S.done.n--;revokeTaskReward(k,i,t);return true}
function showTab(id){document.querySelectorAll("nav button[data-go]").forEach(b=>b.classList.toggle("on",b.dataset.go==id));document.querySelectorAll(".tab").forEach(t=>t.hidden=t.id!="tab-"+id);$("main").scrollTop=0;if(id=="top"&&window.packWidgets)window.packWidgets()}
document.addEventListener("click",e=>{ensureFreshDay();const x=e.target.dataset.x;if(x){const[k,i]=x.split(":");if(!S[k]||!Number.isInteger(+i)||+i<0||+i>=S[k].length)return;if(S[k][+i][1])uncount(S[k][+i],k,+i);S[k].splice(+i,1);save();list(k)}const g=e.target.closest("[data-go]");if(g)showTab(g.dataset.go)});
document.querySelectorAll("[data-add]").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter"&&i.value.trim()){const k=i.dataset.add;if(!Array.isArray(S[k])||S[k].length>=LIM.items){toast("⚠️ Task limit reached (1000 max).");return}S[k].push([i.value.trim().slice(0,120),0,"",makeId()]);i.value="";save();list(k)}}));
const PROJ_COLORS=["#b45cff","#22d3ee","#34e37f","#ffa726","#ff4d8d","#4d7cff"];
function projCustomCss(){for(const sh of document.styleSheets){try{if(!sh.href||new URL(sh.href,location.href).origin!==location.origin)continue;const own=/^\.proj-custom-\d+$/;for(let pass=0;pass<2;pass++){for(let i=sh.cssRules.length-1;i>=0;i--){const r=sh.cssRules[i];if(r.selectorText&&own.test(r.selectorText))sh.deleteRule(i)}if(![...sh.cssRules].some(r=>r.selectorText&&own.test(r.selectorText)))break}for(let i=0;i<S.proj.length;i++){const col=isColor(S.proj[i][2])?S.proj[i][2]:null;if(col&&PROJ_COLORS.indexOf(col)<0)sh.insertRule(`.proj-custom-${i}{--pc:${col}}`,sh.cssRules.length)}break}catch(e){}}}
function proj() {projCustomCss();$("#proj").innerHTML=S.proj.map((p,i)=>{const v=Math.min(100,Math.max(0,Math.round(+p[1])||0)),col=isColor(p[2])?p[2]:"#4d7cff",ci=PROJ_COLORS.indexOf(col),cls=ci>=0?`proj-c${ci}`:`proj-custom-${i}`;return`<div class="pr"><span>${esc(p[0])}</span><input class="proj-range ${cls} pct-${v}" type="range" min="0" max="100" value="${v}" data-p="${i}" aria-label="${esc(p[0])} progress"><b>${v}%</b></div>`}).join("")}
let projSaveTimer,projLastSave=0;proj();const updateProj=e=>{const i=e.target.dataset.p;if(i!=null){S.proj[i][1]=+e.target.value;e.target.classList.forEach(c=>{if(/^pct-\d+$/.test(c))e.target.classList.remove(c)});e.target.classList.add("pct-"+Math.max(0,Math.min(100,+e.target.value)));e.target.nextSibling.textContent=e.target.value+"%"}};$("#proj").addEventListener("input",e=>{updateProj(e);clearTimeout(projSaveTimer);projSaveTimer=setTimeout(()=>{const wait=Math.max(0,300-(Date.now()-projLastSave));projSaveTimer=setTimeout(()=>{projLastSave=Date.now();save()},wait)},350)});$("#proj").addEventListener("change",e=>{updateProj(e);clearTimeout(projSaveTimer);projLastSave=Date.now();save()});
const APPS=[["VS Code","💠","vscode://"],["Minecraft","🟩","minecraft://"],["Sarvam AI","🟣","https://indus.sarvam.ai/indus"],["YouTube","▶️","https://youtube.com"],["Claude","✳️","https://claude.ai"],["ChatGPT","🌀","https://chatgpt.com"],["Gemini","✦","https://gemini.google.com"],["Ollama","🦙","https://ollama.com"]];
$("#apps").innerHTML=APPS.map(a=>`<a class="app" href="${a[2]}" target="_blank" rel="noopener noreferrer"><em>${a[1]}</em>${a[0]}</a>`).join("");
const SCH=[["06:00","Wake Up","#34e37f"],["07:00","School","#8be34a"],["15:00","Homework / Study","#dfe3ff"],["17:00","Projects (GALACTO / Mods)","#ffa726"],["19:00","Exercise","#ffa726"],["20:00","Dinner","#ff8a3d"],["21:00","Free Time / YouTube","#ff4d6d"],["22:30","Sleep","#4d7cff"]];
function tick(){ensureFreshDay();const n=new Date(),m=n.getHours()*60+n.getMinutes();$("#clk").textContent=n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});$("#dt").textContent=n.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short",year:"numeric"});
let cur=-1;SCH.forEach((s,i)=>{if(+s[0].slice(0,2)*60+ +s[0].slice(3)<=m)cur=i});
$("#sch").innerHTML=SCH.map((s,i)=>`<li class="${i==cur?"now":i<cur?"past":""}"><span>${s[0]}</span><i class="dot dot-${["#34e37f","#8be34a","#dfe3ff","#ffa726","#ff8a3d","#ff4d6d","#4d7cff"].indexOf(s[2])}"></i><span>${s[1]}</span></li>`).join("");
const p=Math.min(100,Math.max(0,Math.round(m/14.4)));$("#dp").textContent=p+"%";setPct($("#dpb"),p,"w")}
tick();setInterval(tick,30000);
const Q=[["Discipline beats mood. Small steps, big future.","Max Cooper"],["Ideas, build, learn, improve, repeat.","Max Cooper"],["Same kid. Bigger ideas.","Max Cooper"],["Ship it small, then make it better.","Max Cooper"]];
$("#q").innerHTML=(q=>`“${q[0]}”<small>— ${q[1]}</small>`)(Q[new Date().getDate()%Q.length]);
const WC={0:"Clear sky",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",51:"Drizzle",61:"Rain",63:"Rain",65:"Heavy rain",71:"Snow",80:"Showers",95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm"};
const WEATHER_TTL=15*60*1000,WEATHER_FAIL=5*60*1000;
function weatherCache(){try{const x=JSON.parse(localStorage.getItem(WX_KEY)||"null");return x&&isNum(x.ts)&&validWeather(x.data)?x:null}catch(e){return null}}
function validWeather(j){const c=j?.current;return !!(c&&isNum(c.temperature_2m)&&c.temperature_2m>=-100&&c.temperature_2m<=70&&Number.isInteger(c.weather_code)&&Object.prototype.hasOwnProperty.call(WC,c.weather_code)&&(c.is_day===0||c.is_day===1))}
function renderWeather(j,source="live"){const c=j.current;$("#wx").textContent=(c.is_day?"☀️ ":"🌙 ")+Math.round(c.temperature_2m)+"°C";$("#wxs").textContent="New Delhi · "+WC[c.weather_code]+(source==="cache"?" · cached":"")}
let wxBusy=false,weatherStatus="unknown";
const net=()=>$("#nw").textContent=navigator.onLine?("Network online · weather "+weatherStatus):"Network offline";
const markWeather=ok=>{weatherStatus=ok===true?"available":ok===false?"unavailable":"unknown";net()};
net();
async function loadWeather(force=false){
  const cache=weatherCache(),now=Date.now();
  if(!force&&cache&&cache.data&&now-cache.ts<WEATHER_TTL){renderWeather(cache.data,"cache");markWeather("unknown");return}
  if(!force&&cache?.failUntil&&now<cache.failUntil){if(cache.data){renderWeather(cache.data,"cache");markWeather(false)}else markWeather(false);return}
  if(wxBusy)return;
  try{const lease=JSON.parse(localStorage.getItem(WX_LEASE)||"0");if(lease>now-10000){setTimeout(()=>loadWeather(false),1100);return}}catch(e){}
  try{localStorage.setItem(WX_LEASE,String(now))}catch(e){}
  wxBusy=true;
  const ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),8000);
  try{const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.21&current=temperature_2m,weather_code,is_day&timezone=auto",{signal:ctrl.signal,cache:"no-store"});if(!r.ok)throw new Error("weather-"+r.status);const j=await r.json();if(!validWeather(j))throw new Error("weather-shape");localStorage.setItem(WX_KEY,JSON.stringify({ts:now,data:j,failUntil:0}));renderWeather(j);markWeather(true)}
  catch(e){try{localStorage.setItem(WX_KEY,JSON.stringify({ts:cache?.ts||0,data:cache?.data||null,failUntil:now+WEATHER_FAIL}))}catch(_){}if(cache?.data){renderWeather(cache.data,"cache");markWeather(false)}else markWeather(false);$("#wxs").textContent=cache?.data?"New Delhi · cached; weather unavailable":"New Delhi · weather unavailable"}
  finally{clearTimeout(to);wxBusy=false;try{if(localStorage.getItem(WX_LEASE)===String(now))localStorage.removeItem(WX_LEASE)}catch(e){}}
}
loadWeather();setInterval(()=>{if(!document.hidden)loadWeather()},WEATHER_TTL);addEventListener("visibilitychange",()=>{if(!document.hidden)loadWeather()});
addEventListener("online",()=>{net();if(!document.hidden)loadWeather(true)});addEventListener("offline",()=>{weatherStatus="unknown";net()});
let T=25*60,mode=25,st="idle",iv,end=0,timerId="";
if(S.timer){
  mode=[5,25].includes(S.timer.mode)?S.timer.mode:25; T=(typeof S.timer.T==="number"&&Number.isInteger(S.timer.T)&&S.timer.T>=0&&S.timer.T<=3600)?S.timer.T:mode*60; st=["idle","running","paused"].includes(S.timer.st)?S.timer.st:"idle"; end=isNum(S.timer.end)&&S.timer.end>=0?S.timer.end:0; timerId=isStr(S.timer.id)?S.timer.id:"";
  if(st==="running"){T=Math.max(0,Math.round((end-Date.now())/1000));if(T<=0){st="idle";T=mode*60;S.timer={mode,T,st,end:0};}}
}
const persistTimer=()=>{S.timer={mode,T,st,end,id:timerId};save()};
const draw=()=>{const s=`${String(Math.max(0,T)/60|0).padStart(2,"0")}:${String(Math.max(0,T)%60).padStart(2,"0")}`;$("#tm").textContent=s;document.title=st=="running"?s+" · Max Dashboard":"Max Dashboard";};
function beep(){try{const a=new AudioContext(),o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.onended=()=>{try{a.close()}catch(e){}};o.start();o.stop(a.currentTime+.4)}catch(e){}}
const psBtn=()=>{$("#ps").textContent=st=="running"?"Pause":st=="paused"?"Resume":"Start"};
function ptick(){T=Math.max(0,Math.round((end-Date.now())/1000));if(T<=0)return finish();draw()}
function finish(){clearInterval(iv);ensureFreshDay();const finishedId=timerId,completionMs=end||Date.now(),completedDay=ISO(new Date(completionMs));grantPomoReward(completedDay,finishedId,mode);T=mode*60;st="idle";end=0;timerId="";S.timer={mode,T,st,end,id:""};rebuildHistory();S.done.n=countToday();recomputeStreak();const ok=save();beep();if(!ok)toast("⚠️ Timer completed but could not be persisted; keep this tab open and retry.");$("#pn").textContent=S.pomo.n;psBtn();draw()}
$("#ps").onclick=()=>{ensureFreshDay();clearInterval(iv);if(st=="running"){T=Math.max(0,Math.round((end-Date.now())/1000));st="paused";end=0}else{st="running";timerId=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random());end=Date.now()+T*1000;iv=setInterval(ptick,1000)}persistTimer();psBtn();draw()};
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&st=="running")ptick()});
$("#pr").onclick=()=>{clearInterval(iv);st="idle";T=mode*60;end=0;timerId="";persistTimer();psBtn();draw()};
$("#pm").onclick=()=>{mode=mode==25?5:25;$("#pr").click()};$("#pn").textContent=S.pomo.n;
if(st==="running"){iv=setInterval(ptick,1000);ptick()}
/* Privacy hardening: do not expose battery, CPU-count, or RAM fingerprinting data to the app. */
$("#bt").textContent="Protected";$("#btb").classList.add("pct-w-0");

$("#hw").textContent="Protected";
const fs=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});
$("#fs").onclick=fs;
function pal(){const d=$("#k");if(d.open){d.close();return}d.showModal();$("#ki").value="";find("")}
$("#sd-x").onclick=()=>$("#sd").close();$("#k-x").onclick=()=>$("#k").close();$("#k").addEventListener("click",e=>{if(e.target===e.currentTarget)e.currentTarget.close()});$("#k").addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();e.currentTarget.close()}});
function find(q){q=q.toLowerCase();const r=[...APPS.filter(a=>a[0].toLowerCase().includes(q)).map(a=>[a[1]+" "+a[0],()=>safeOpen(a[2])]),...["focus","goals","notes"].flatMap(k=>S[k].filter(t=>q&&t[0].toLowerCase().includes(q)).map(t=>["📌 "+t[0],()=>{showTab("top");$("#p-"+k).scrollIntoView()}]))].slice(0,7);
$("#kr").innerHTML=r.map((x,i)=>`<li class="t"><a href="#" data-r="${i}" class="search-result">${esc(x[0])}</a></li>`).join("");$("#kr").onclick=e=>{const i=e.target.dataset.r;if(i!=null){e.preventDefault();$("#k").close();r[i][1]()}};$("#ki").onkeydown=e=>{if(e.key==="Enter"&&r[0]){e.preventDefault();$("#k").close();r[0][1]()}}}
$("#ki").oninput=e=>find(e.target.value);$("#k-open").onclick=pal;
addEventListener("keydown",e=>{const t=e.target.tagName;if((e.ctrlKey||e.metaKey)&&e.key=="k"){e.preventDefault();pal()}else if(!e.ctrlKey&&!e.altKey&&!/INPUT|TEXTAREA|BUTTON|SELECT/.test(t)&&!document.querySelector("dialog[open]")&&e.key.toLowerCase()=="f")fs();else if(e.key=="/"&&!/INPUT|TEXTAREA|SELECT/.test(t)&&!document.querySelector("dialog[open]")){e.preventDefault();showTab("top");$("#gq").focus()}});
$("#set").onclick=()=>$("#sd").showModal();
const BK_KEY=KEY+":lastbackup";
async function sha256Hex(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const sumBody=o=>JSON.stringify({version:o.version,state:o.state,layout:o.layout});
async function backupSumOk(raw){if(!(window.crypto&&crypto.subtle))return true;try{return await sha256Hex(sumBody(raw))===raw.sha256}catch(_){return false}}
$("#ex").onclick=async()=>{const body={version:5,state:S,layout:{version:2,data:window.getLayoutBackup?window.getLayoutBackup():{}}};try{if(window.crypto&&crypto.subtle)body.sha256=await sha256Hex(sumBody(body))}catch(_){}body.savedAt=new Date().toISOString();const a=document.createElement("a");const u=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:"application/json"}));a.href=u;a.download="max-dashboard-backup.json";a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);try{localStorage.setItem(BK_KEY,ISO(new Date()))}catch(_){}toast("💾 Backup exported (with integrity checksum)")};
$("#im").onclick=()=>{$("#fi").value="";$("#fi").click()};$("#fi").onchange=e=>{const f=e.target.files?.[0];if(!f)return;
if(f.size>LIM.backupBytes){toast("⚠️ Backup is too large (2 MB max).");e.target.value="";return}
f.text().then(async t=>{try{const raw=JSON.parse(t);if(raw&&typeof raw.sha256==="string"&&!(await backupSumOk(raw))){toast("⚠️ Backup failed its integrity check (file was edited or damaged).");e.target.value="";return}const j=raw&&raw.version>=3&&raw.state?raw.state:raw;if(!j||typeof j!=="object"||Array.isArray(j))throw 0;const repaired=sanitizeState(j);S=repaired.state;Object.defineProperty(S,"_repairNotice",{value:repaired.repaired,writable:true,configurable:true,enumerable:false});Object.defineProperty(S,"_rev",{value:Number(localStorage.getItem(KEY_REV)||0),writable:true,configurable:true,enumerable:false});reconcileState();if(!save())throw new Error("state-save");if(localStorage.getItem(KEY)!==JSON.stringify(S))throw new Error("state-verify");let layoutOk=true;if(raw&&raw.layout&&window.setLayoutBackup){const incomingLayout=raw.layout.version===2?raw.layout.data:raw.layout;layoutOk=window.setLayoutBackup(incomingLayout)}if(!layoutOk){toast("⚠️ State imported, but widget layout could not be saved. Export again after fixing storage.");return}if(repaired.repaired)try{sessionStorage.setItem(REPAIR_KEY,"1")}catch(_){}location.reload()}catch(x){toast("⚠️ That file is not a valid Max Dashboard backup or could not be saved.");e.target.value=""}}).catch(()=>toast("⚠️ Couldn't read that backup file."))};
$("#rs").onclick=()=>{if(confirm("Delete all saved tasks, progress and streaks?")){try{for(const k of[KEY,OLD_KEY,LEGACY_KEY,KEY_REV,STATE_LOCK,WX_KEY,WX_LEASE,KEY+":layout",KEY+":layout:rev",KEY+":layout:lock","maxdashboard:maxdash:v3:layout","maxdashboard:maxdash:v3:layout:rev","maxdash-layout-v2"])localStorage.removeItem(k)}catch(e){toast("⚠️ Could not reset saved data.");return}if([KEY,OLD_KEY,LEGACY_KEY,KEY_REV,STATE_LOCK,WX_KEY,WX_LEASE,KEY+":layout",KEY+":layout:rev",KEY+":layout:lock","maxdashboard:maxdash:v3:layout","maxdashboard:maxdash:v3:layout:rev","maxdash-layout-v2"].some(k=>localStorage.getItem(k)!==null)){toast("⚠️ Could not reset saved data.");return}location.reload()}};
draw();
const ENG={google:"https://www.google.com/search?q=",ddg:"https://duckduckgo.com/?q=",bing:"https://www.bing.com/search?q=",brave:"https://search.brave.com/search?q="},UA=navigator.userAgent,IOS=/iPhone|iPad|iPod/.test(UA),AND=/Android/i.test(UA),PK={chrome:"com.android.chrome",firefox:"org.mozilla.firefox",brave:"com.brave.browser",edge:"com.microsoft.emmx"};
function toUrl(q){
  q=q.trim();if(!q)return null;let u;
  const local=/^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?(?:\/.*)?$/i;
  if(/^https?:\/\//i.test(q))u=q;
  else if(local.test(q))u="http://"+q;
  else if(/^[^\s\/]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(q))u="https://"+q;
  else u=ENG[S.pref.e]+encodeURIComponent(q);
  try{const p=new URL(u);if(!/^https?:$/.test(p.protocol))return null;if(p.protocol==="http:"&&!/^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(p.hostname))return null;return p.href}catch(x){return null}
}
function safeOpen(u){const w=open(u,"_blank","noopener,noreferrer");if(w){try{w.opener=null}catch(e){}return true}location.href=u;return false}
function openIn(u,b){
  const p=new URL(u),h=p.host+p.pathname+(p.search||""),e=encodeURIComponent(u);let t=null;
  if(AND&&PK[b]){const scheme=p.protocol.slice(0,-1);const fallback=encodeURIComponent(u);t="intent://open/#Intent;scheme="+encodeURIComponent(scheme)+";package="+encodeURIComponent(PK[b])+";S.browser_fallback_url="+fallback+";end"}
  else if(IOS&&b=="chrome")t=(p.protocol=="https:"?"googlechromes://":"googlechrome://")+h;
  else if(IOS&&b=="firefox")t="firefox://open-url?url="+e;
  else if(IOS&&b=="brave")t="brave://open-url?url="+e;
  else if(b=="edge"&&!IOS&&!AND)t="microsoft-edge:"+u;
  if(t){let active=true;const cancel=()=>{active=false;removeEventListener("visibilitychange",onHide);removeEventListener("pagehide",cancel)};const onHide=()=>{if(document.hidden)cancel()};addEventListener("visibilitychange",onHide);addEventListener("pagehide",cancel,{once:true});$("#gh").textContent="Opening in "+b[0].toUpperCase()+b.slice(1)+"…";location.href=t;setTimeout(()=>{if(active&&!document.hidden){cancel();location.href=u;$("#gh").textContent=b[0].toUpperCase()+b.slice(1)+" didn't open, so it launched in this browser instead."}},1200)}
  else{const current=/brave/i.test(navigator.userAgent)?"brave":/edg\//i.test(navigator.userAgent)?"edge":/firefox/i.test(navigator.userAgent)?"firefox":/chrome/i.test(navigator.userAgent)?"chrome":"self";if(b===current){location.href=u;$("#gh").textContent="Opened in this browser."}else{$("#gh").textContent=safeOpen(u)?"Opened in a new tab; desktop browser selection is not directly controllable from a website.":"Popup blocked, so the link opened in this tab."}}
}
const supportedBrowsers=IOS?["self","chrome","firefox","brave"]:AND?["self","chrome","edge","firefox","brave"]:["self"];if(!supportedBrowsers.includes(S.pref.b)){S.pref.b="self";save()}$("#gb").innerHTML=supportedBrowsers.map(v=>`<option value="${v}">${v==="self"?"Open in: this browser":"Try "+v[0].toUpperCase()+v.slice(1)+" (mobile)"}</option>`).join("");$("#gb").value=S.pref.b;$("#ge").value=S.pref.e;
$("#gb").onchange=()=>{const v=$("#gb").value;if(BROWSERS.includes(v)){S.pref.b=v;save()}else $("#gb").value=S.pref.b};$("#ge").onchange=()=>{const v=$("#ge").value;if(ENGINES.includes(v)){S.pref.e=v;save()}else $("#ge").value=S.pref.e};
$("#go").onsubmit=ev=>{ev.preventDefault();const u=toUrl($("#gq").value);if(!u){$("#gh").textContent="Type a website like example.com or words to search.";return}openIn(u,S.pref.b)};
function captureTransientInputs(){
  const keep={};
  document.querySelectorAll("input.add").forEach(el=>{keep["add:"+el.dataset.add]=el.value});
  ["gq","ki"].forEach(id=>{const el=$("#"+id);if(el)keep[id]=el.value});
  return keep;
}
function restoreTransientInputs(keep){
  document.querySelectorAll("input.add").forEach(el=>{const k="add:"+el.dataset.add;if(Object.prototype.hasOwnProperty.call(keep,k))el.value=keep[k]});
  for(const id of["gq","ki"]){const el=$("#"+id);if(el&&Object.prototype.hasOwnProperty.call(keep,id))el.value=keep[id]}
}
function syncExternalState(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw){const keep=captureTransientInputs();S=clone(D);Object.defineProperty(S,"_rev",{value:Number(localStorage.getItem(KEY_REV)||0),writable:true,configurable:true,enumerable:false});baseState=clone(S);reconcileState();draw();["focus","goals","notes"].forEach(list);proj();renderStats();restoreTransientInputs(keep);toast("ℹ️ Saved dashboard data was cleared in another tab.");return}
    if(new Blob([raw]).size>MAX_STATE_BYTES)return;
    const remote=sanitizeState(JSON.parse(raw)).state, incoming=Number(localStorage.getItem(KEY_REV)||0);
    if(incoming<=Number(S?._rev||0))return;
    const keep=captureTransientInputs(),old=S;
    S=mergeStates(baseState||old,remote,old);S.schema=STATE_SCHEMA;
    Object.defineProperty(S,"_rev",{value:incoming,writable:true,configurable:true,enumerable:false});baseState=clone(S);reconcileState();draw();["focus","goals","notes"].forEach(list);proj();renderStats();restoreTransientInputs(keep);
  }catch(_){toast("⚠️ Another tab changed the dashboard, but the update could not be applied safely.")}
}
addEventListener("storage",e=>{
  if(e.key===KEY||e.key===KEY_REV)syncExternalState();
});
try{stateChannel?.addEventListener("message",e=>{if(e.data?.type==="state")syncExternalState()})}catch(e){}

return true;
}
window.__MAX_BOOTSTRAP_OK=false;
startup();
/* ---- Shortcuts help + backup reminder (v13) ---- */
(function(){const hp=$("#hp");if(!hp)return;
$("#hp-x").onclick=()=>hp.close();$("#hk").onclick=()=>{$("#sd").close();hp.showModal()};
document.addEventListener("keydown",e=>{if(e.key!=="?"||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||"")||document.querySelector("dialog[open]"))return;e.preventDefault();hp.showModal()});
/* friendly nudge: data lives only in this browser, so remind about a backup every 14 days once there is progress */
setTimeout(()=>{try{if(!(S.xp>0||S.pomo.n>0||S.done.n>0))return;const last=localStorage.getItem(BK_KEY);if(last&&(Date.now()-new Date(last+"T00:00:00").getTime())/864e5<14)return;toast("💾 Tip: Settings → Export backup keeps your progress safe.")}catch(_){}},4500)})();
})();
