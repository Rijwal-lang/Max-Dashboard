/* Floating draggable widgets (Home tab). Layout is saved separately from your data. */
(function(){
"use strict";
const KEY2="maxdashboard:max-dashboard:v4:layout",OLDKEY2="maxdashboard:maxdash:v3:layout",LEGACYKEY2="maxdash-layout-v2",LAYOUT_REV=KEY2+":rev",LAYOUT_LOCK=KEY2+":lock",LAYOUT_SCHEMA=2,g=document.querySelector(".grid"),cards=[...g.querySelectorAll(":scope>.c")],GAP=12;
let L=Object.create(null),knownGood=Object.create(null),baseLayout=Object.create(null),baseLayoutRev=0,layoutChannel=null,lastLayoutSave=0;
try{if("BroadcastChannel"in window)layoutChannel=new BroadcastChannel("maxdashboard-layout-v2")}catch(e){layoutChannel=null}
const finitePair=v=>Array.isArray(v)&&v.length===2&&v.every(n=>typeof n==="number"&&Number.isFinite(n));
const validLayout=x=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length<=100&&Object.entries(x).every(([k,v])=>/^[a-zA-Z0-9_-]{1,80}$/.test(k)&&finitePair(v)&&v[0]>=0&&v[1]>=0&&v[0]<=100000&&v[1]<=100000);
const parseStoredLayout=raw=>{try{const x=typeof raw==="string"?JSON.parse(raw):raw;if(x&&x.schema===LAYOUT_SCHEMA&&validLayout(x.data))return x.data;if(validLayout(x))return x;return null}catch(e){return null}};
try{
  const raw=localStorage.getItem(KEY2)||localStorage.getItem(OLDKEY2)||localStorage.getItem(LEGACYKEY2),parsed=parseStoredLayout(raw);
  if(parsed)for(const [key,value] of Object.entries(parsed))L[key]=[Math.max(0,Math.min(100000,value[0])),Math.max(0,Math.min(100000,value[1]))];
}catch(e){}
knownGood=JSON.parse(JSON.stringify(L));baseLayout=JSON.parse(JSON.stringify(L));baseLayoutRev=Number(localStorage.getItem(LAYOUT_REV)||0);
window.getLayoutBackup=()=>JSON.parse(JSON.stringify(L));
window.setLayoutBackup=x=>{if(!validLayout(x))return false;L=Object.create(null);for(const [k,v] of Object.entries(x))L[k]=[Math.max(0,Math.min(100000,v[0])),Math.max(0,Math.min(100000,v[1]))];const ok=saveL();if(ok)again();return ok};
window.applyLayoutBackup=raw=>{try{const x=typeof raw==="string"?JSON.parse(raw):raw,data=x?.schema===LAYOUT_SCHEMA?x.data:x;if(validLayout(data)){L=Object.create(null);for(const [k,v] of Object.entries(data))L[k]=[v[0],v[1]];knownGood=JSON.parse(JSON.stringify(L));baseLayout=JSON.parse(JSON.stringify(L));baseLayoutRev=Number(localStorage.getItem(LAYOUT_REV)||0);again()}}catch(e){}};
cards.forEach((c,i)=>c.dataset.w=(c.id&&/^[a-zA-Z0-9_-]{1,80}$/.test(c.id)?c.id:"w"+i));
const mobile=()=>matchMedia("(max-width:760px)").matches;

function acquireLayoutLease(){
  const token=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random()),now=Date.now();
  try{const raw=localStorage.getItem(LAYOUT_LOCK);if(raw){const x=JSON.parse(raw);if(x&&typeof x.until==="number"&&x.until>now)return null}localStorage.setItem(LAYOUT_LOCK,JSON.stringify({token,until:now+1500}));const x=JSON.parse(localStorage.getItem(LAYOUT_LOCK)||"null");return x?.token===token?token:null}catch(e){return null}
}
function releaseLayoutLease(token){if(!token)return;try{const x=JSON.parse(localStorage.getItem(LAYOUT_LOCK)||"null");if(x?.token===token)localStorage.removeItem(LAYOUT_LOCK)}catch(e){}}
const saveL=()=>{
  let lease=null;
  try{
    let rev=Number(localStorage.getItem(LAYOUT_REV)||0),base=JSON.parse(JSON.stringify(baseLayout));
    const current=parseStoredLayout(localStorage.getItem(KEY2));
    if(current&&rev!==baseLayoutRev){
      const merged=Object.create(null);
      for(const [k,v] of Object.entries(current))merged[k]=v;
      for(const [k,v] of Object.entries(L)){if(!Object.prototype.hasOwnProperty.call(base,k)||JSON.stringify(base[k])!==JSON.stringify(v))merged[k]=v}
      L=merged;baseLayout=JSON.parse(JSON.stringify(current));baseLayoutRev=rev;
    }
    lease=acquireLayoutLease();if(!lease)throw 0;
    for(let attempt=0;attempt<3;attempt++){
      const before=Number(localStorage.getItem(LAYOUT_REV)||0);if(before!==rev){const latest=parseStoredLayout(localStorage.getItem(KEY2))||Object.create(null),merged=Object.create(null);for(const[k,v]of Object.entries(latest))merged[k]=v;for(const[k,v]of Object.entries(L))if(!Object.prototype.hasOwnProperty.call(base,k)||JSON.stringify(base[k])!==JSON.stringify(v))merged[k]=v;L=merged;baseLayout=JSON.parse(JSON.stringify(latest));rev=before;continue}
      const payload=JSON.stringify({schema:LAYOUT_SCHEMA,data:L}),next=rev+1;
      if(JSON.parse(localStorage.getItem(LAYOUT_LOCK)||"null")?.token!==lease)throw 0;
      localStorage.setItem(KEY2,payload);if(localStorage.getItem(KEY2)!==payload)throw 0;
      if(Number(localStorage.getItem(LAYOUT_REV)||0)!==rev)continue;
      localStorage.setItem(LAYOUT_REV,String(next));if(Number(localStorage.getItem(LAYOUT_REV))!==next)continue;
      knownGood=JSON.parse(JSON.stringify(L));baseLayout=JSON.parse(JSON.stringify(L));baseLayoutRev=next;lastLayoutSave=Date.now();try{layoutChannel?.postMessage({type:"layout",rev:next})}catch(e){}releaseLayoutLease(lease);lease=null;return true
    }
    throw 0
  }catch(e){releaseLayoutLease(lease);L=JSON.parse(JSON.stringify(knownGood));try{dispatchEvent(new CustomEvent("maxdash:layout-save-error"))}catch(_){}return false}
};
let busy=0,z=10,ruleMap=new Map();
function sheet(){
  for(const ss of document.styleSheets){
    try{if(ss.href&&new URL(ss.href,location.href).origin===location.origin&&ss.href.includes("/Files/dashboard.css"))return ss}catch(e){}
  }
  return null;
}
const ss=sheet();
function ruleFor(key,selector){
  if(!ss)return null;
  if(ruleMap.has(key))return ruleMap.get(key).style;
  try{
    const idx=ss.insertRule(selector+"{}",ss.cssRules.length),r=ss.cssRules[idx];
    ruleMap.set(key,r);return r.style;
  }catch(e){return null}
}
function setStyle(key,selector,props){
  const st=ruleFor(key,selector);if(!st)return;
  for(const [k,v] of Object.entries(props))st[k]=v;
}
function clearStyle(key){
  const st=ruleMap.get(key);if(!st)return;
  for(let i=st.length-1;i>=0;i--)st.removeProperty(st[i]);
}
function pack(){
  if(busy||!g.clientWidth)return;
  busy=1;
  if(mobile()){
    clearStyle("grid-height");
    cards.forEach((c,i)=>clearStyle("card-"+i));
    busy=0;return;
  }
  const W=g.clientWidth,cols=W>1300?4:W>900?3:2,cw=(W-(cols-1)*GAP)/cols,y0=Math.round(innerHeight*.42),colH=Array(cols).fill(y0);
  cards.forEach((c,i)=>{
    const width=(c.classList.contains("s12")?Math.min(2,cols)*cw+(Math.min(2,cols)-1)*GAP:cw);
    setStyle("card-"+i,`.grid>.${"widget-"+i}`,{width:width+"px"});
  });
  let bottom=0;
  cards.forEach((c,i)=>{
    const h=c.offsetHeight,w=c.offsetWidth;let x,y;
    const saved=L[c.dataset.w];
    if(finitePair(saved)){x=Math.max(0,Math.min(saved[0],Math.max(0,W-w)));y=Math.max(0,saved[1])}
    else if(c.classList.contains("s12")){x=0;y=8}
    else{const j=colH.indexOf(Math.min(...colH));x=j*(cw+GAP);y=colH[j];colH[j]+=h+GAP}
    setStyle("card-"+i,`.grid>.${"widget-"+i}`,{left:x+"px",top:y+"px"});
    bottom=Math.max(bottom,y+h);
  });
  const placed=[];let collision=false,changed=false;
  cards.forEach((c)=>{const x=c.offsetLeft,y=c.offsetTop,w=c.offsetWidth,h=c.offsetHeight;for(const p of placed){if(x<p.x+p.w&&x+w>p.x&&y<p.y+p.h&&y+h>p.y){collision=true;break}}placed.push({x,y,w,h})});
  if(collision){colH=Array(cols).fill(y0);bottom=0;cards.forEach((c,i)=>{const h=c.offsetHeight,w=c.offsetWidth,j=colH.indexOf(Math.min(...colH)),x=c.classList.contains("s12")?0:j*(cw+GAP),y=colH[j];setStyle("card-"+i,`.grid>.widget-${i}`,{left:x+"px",top:y+"px"});colH[j]+=h+GAP;bottom=Math.max(bottom,y+h);const nv=[Math.round(x),Math.round(y)];if(JSON.stringify(L[c.dataset.w])!==JSON.stringify(nv)){L[c.dataset.w]=nv;changed=true}})}
  else cards.forEach(c=>{const nv=[Math.round(c.offsetLeft),Math.round(c.offsetTop)];if(JSON.stringify(L[c.dataset.w])!==JSON.stringify(nv)&&L[c.dataset.w]){L[c.dataset.w]=nv;changed=true}});
  if(changed&&Date.now()-lastLayoutSave>=300)saveL();
  setStyle("grid-height",".grid",{height:bottom+20+"px"});
  busy=0;
}
cards.forEach((c,i)=>c.classList.add("widget-"+i));
window.packWidgets=pack;
let raf=0;const again=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(pack)};
addEventListener("resize",again);document.fonts&&document.fonts.ready.then(again);
if(window.ResizeObserver){const ro=new ResizeObserver(again);cards.forEach(c=>ro.observe(c))}
cards.forEach((c,i)=>{
  const h=c.querySelector("h2");if(!h)return;
  h.addEventListener("pointerdown",e=>{
    if(mobile()||e.button||e.target.closest("button,input,select,a"))return;
    const sx=e.clientX,sy=e.clientY,ox=c.offsetLeft,oy=c.offsetTop;
    h.setPointerCapture(e.pointerId);c.classList.add("drag");z++;
    setStyle("card-"+i,`.grid>.${"widget-"+i}`,{zIndex:String(z)});
    const mv=ev=>{
      const x=Math.max(0,Math.min(ox+ev.clientX-sx,g.clientWidth-c.offsetWidth));
      const y=Math.max(0,oy+ev.clientY-sy);
      setStyle("card-"+i,`.grid>.${"widget-"+i}`,{left:x+"px",top:y+"px"});
    };
    const up=()=>{
      h.removeEventListener("pointermove",mv);h.removeEventListener("pointerup",up);h.removeEventListener("pointercancel",up);
      window.removeEventListener("pointerup",up);window.removeEventListener("pointercancel",up);window.removeEventListener("blur",up);
      c.classList.remove("drag");
      const x=Math.max(0,Math.min(c.offsetLeft,g.clientWidth-c.offsetWidth)),y=Math.max(0,c.offsetTop);
      L[c.dataset.w]=[Math.round(x),Math.round(y)];saveL();again();
    };
    window.addEventListener("pointerup",up,{once:true});window.addEventListener("pointercancel",up,{once:true});window.addEventListener("blur",up,{once:true});
    h.addEventListener("pointermove",mv);h.addEventListener("pointerup",up);h.addEventListener("pointercancel",up);
  });
});
const rl=document.getElementById("rl");
if(rl)rl.onclick=()=>{const old=L;L=Object.create(null);if(saveL()){try{localStorage.removeItem(OLDKEY2);localStorage.removeItem(LEGACYKEY2);localStorage.removeItem(LAYOUT_REV);localStorage.removeItem(LAYOUT_LOCK)}catch(e){}for(let i=0;i<cards.length;i++)clearStyle("card-"+i);clearStyle("grid-height");pack()}else L=old};
function syncLayout(){
  try{
    const raw=localStorage.getItem(KEY2);if(!raw){L=Object.create(null);knownGood=Object.create(null);baseLayout=Object.create(null);baseLayoutRev=Number(localStorage.getItem(LAYOUT_REV)||0);again();return;}
    if(raw.length>100000)return;const incoming=parseStoredLayout(raw);if(!incoming)return;
    const rev=Number(localStorage.getItem(LAYOUT_REV)||0);if(rev<baseLayoutRev)return;
    L=Object.create(null);for(const [k,v] of Object.entries(incoming))L[k]=[v[0],v[1]];
    knownGood=JSON.parse(JSON.stringify(L));baseLayout=JSON.parse(JSON.stringify(L));baseLayoutRev=rev;again();
  }catch(_){}
}
addEventListener("storage",e=>{if(e.key===KEY2||e.key===LAYOUT_REV)syncLayout()});
try{layoutChannel?.addEventListener("message",e=>{if(e.data?.type==="layout")syncLayout()})}catch(e){}
pack();
})();