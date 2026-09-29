
const $=s=>document.querySelector(s),KEY="maxdash.v2";
let TODAY,YDAY;
function setDay(){const t=new Date();TODAY=t.toDateString();YDAY=new Date(t.getFullYear(),t.getMonth(),t.getDate()-1).toDateString()}
setDay();
function ensureFreshDay(){if(TODAY===new Date().toDateString())return;setDay();if(S.pomo.day!==TODAY)S.pomo={day:TODAY,n:0};if(S.done.day!==TODAY)S.done={day:TODAY,n:0};save();stats()}
const D={focus:[["Finish Homework (PT1)",1],["Learn / Revise Science",0],["Work on GALACTO",0],["Explore Sarvam AI (Roadmap)",0],["Exercise + Healthy Meals",0]],
goals:[["Score well in PT1",1],["Build GALACTO v0.1",0],["Improve Minecraft modding",0],["Learn AI & LLMs",0],["Stay healthy & fit",0],["Help family (business)",0]],
notes:[["Minecraft mod ideas",1],["App features (Lovit)",0],["UHLM architecture",0],["Neumann commands",0],["Zythera v0.3 words",0],["Content ideas",0]],
proj:[["GALACTO",40,"#b45cff"],["UHLM (Synthesize)",30,"#22d3ee"],["Neumann (Linux)",20,"#34e37f"],["Zythera (Lang)",50,"#ffa726"],["Ayurveda App",25,"#ff4d8d"]],
streak:{last:"",n:0},pomo:{day:"",n:0},done:{day:"",n:0}};
D.xp=0;D.pref={b:"self",e:"google"};D.hist={};const ISO=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const isTask=x=>Array.isArray(x)&&isText(x[0])&&(x[1]===0||x[1]===1),isProj=x=>Array.isArray(x)&&isText(x[0])&&typeof x[1]==="number"&&x[1]>=0&&x[1]<=100&&typeof x[2]==="string",isNum=x=>typeof x==="number"&&isFinite(x),isNonNegNum=x=>isNum(x)&&x>=0,isStr=x=>typeof x==="string",isInt=(x,max)=>Number.isInteger(x)&&x>=0&&x<=max,isDay=x=>isStr(x)&&/^\d{4}-\d{2}-\d{2}$/.test(x),isDS=x=>x===""||(isStr(x)&&/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/.test(x)),isText=x=>isStr(x)&&x.length<=500,LIM={xp:1e6,streak:36500,pomo:500,done:5000,hist:5000,items:1000,days:400},BROWSERS=["self","chrome","edge","firefox","brave"],ENGINES=["google","ddg","bing","brave"];
function validState(j){if(!j||typeof j!=="object")return false;
if(!["focus","goals","notes"].every(k=>Array.isArray(j[k])&&j[k].length<=LIM.items&&j[k].every(isTask)))return false;
if(!Array.isArray(j.proj)||!(j.proj.length<=LIM.items&&j.proj.every(isProj)))return false;
if("xp"in j&&!isInt(j.xp,LIM.xp))return false;
if("streak"in j&&!(j.streak&&isInt(j.streak.n,LIM.streak)&&isDS(j.streak.last)))return false;
if("pomo"in j&&!(j.pomo&&isInt(j.pomo.n,LIM.pomo)&&isDS(j.pomo.day)))return false;
if("done"in j&&!(j.done&&isInt(j.done.n,LIM.done)&&isDS(j.done.day)))return false;
if("pref"in j&&!(j.pref&&BROWSERS.includes(j.pref.b)&&ENGINES.includes(j.pref.e)))return false;
if("hist"in j&&!(j.hist&&typeof j.hist==="object"&&!Array.isArray(j.hist)&&Object.keys(j.hist).length<=LIM.days&&Object.entries(j.hist).every(([k,v])=>isDay(k)&&isInt(v,LIM.hist))))return false;
return true}
let S;try{const j=JSON.parse(localStorage.getItem(KEY));S=Object.assign(structuredClone(D),(j&&validState(j))?j:{})}catch(e){S=structuredClone(D)}
if(window.IMG){document.documentElement.style.setProperty("--hero","url("+IMG.hero+")");$("#av").src=IMG.avatar;$("#av").style.display="block"}
let toastT;function toast(m){const t=$("#toast");t.textContent=m;t.style.opacity=1;t.style.transform="translate(-50%,0)";clearTimeout(toastT);toastT=setTimeout(()=>{t.style.opacity=0;t.style.transform="translate(-50%,120%)"},4000)}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast("⚠️ Couldn't save — your changes may be lost")}};
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
if(S.pomo.day!==TODAY)S.pomo={day:TODAY,n:0};if(S.done.day!==TODAY)S.done={day:TODAY,n:0};save();
function bumpStreak(){if(S.streak.last===TODAY)return;S.streak.n=S.streak.last===YDAY?S.streak.n+1:1;S.streak.last=TODAY}
function list(k){$("#l-"+k).innerHTML=S[k].map((t,i)=>`<li class="t"><input type="checkbox" data-k="${k}" data-i="${i}" ${t[1]?"checked":""} aria-label="${esc(t[0])}"><span>${esc(t[0])}</span><button data-x="${k}:${i}" aria-label="Delete">×</button></li>`).join("");stats()}
function xp(n){S.xp=Math.max(0,S.xp+n)}
const dayAgo=n=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()-n)};
function pruneHist(){const cut=ISO(dayAgo(90));for(const k in S.hist)if(k<cut)delete S.hist[k]}
function stats(){S.hist[ISO(new Date())]=S.done.n;pruneHist();save();$("#lv").textContent="Level "+((S.xp/100|0)+1);$("#xpn").textContent=S.xp;$("#xpb").style.width=S.xp%100+"%";
const days=[...Array(7)].map((_,i)=>{const d=dayAgo(6-i);return[d.toLocaleDateString([],{weekday:"narrow"}),S.hist[ISO(d)]||0]}),mx=Math.max(1,...days.map(d=>d[1]));$("#wk").innerHTML=days.map(d=>`<div><i style="height:${d[1]/mx*64}px"></i>${d[0]}</div>`).join("");$("#best").textContent=Math.max(0,...Object.values(S.hist));$("#td").textContent=S.done.n;$("#streak").textContent="🔥 "+S.streak.n+"-day streak"}
["focus","goals","notes"].forEach(list);
document.addEventListener("change",e=>{ensureFreshDay();const c=e.target;if(c.dataset.k){const was=S[c.dataset.k][c.dataset.i][1];S[c.dataset.k][c.dataset.i][1]=c.checked?1:0;if(c.checked&&!was){S.done.n++;xp(10);bumpStreak()}if(!c.checked&&was&&S.done.n){S.done.n--;xp(-10)}save();stats()}});
document.addEventListener("click",e=>{const x=e.target.dataset.x;if(x){const[k,i]=x.split(":");if(S[k][+i][1]&&S.done.n){S.done.n--;xp(-10)}S[k].splice(+i,1);save();list(k)}const g=e.target.closest("[data-go]");if(g){document.querySelectorAll("nav a,nav button").forEach(a=>a.classList.remove("on"));g.classList.add("on");(g.dataset.go=="top"?$("main"):$("#"+g.dataset.go)).scrollIntoView({behavior:"smooth",block:"start"})}});
document.querySelectorAll("[data-add]").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter"&&i.value.trim()){S[i.dataset.add].push([i.value.trim().slice(0,120),0]);i.value="";save();list(i.dataset.add)}}));
function proj(){$("#proj").innerHTML=S.proj.map((p,i)=>`<div class="pr"><span>${esc(p[0])}</span><input type="range" min="0" max="100" value="${p[1]}" data-p="${i}" style="background:linear-gradient(90deg,${p[2]} ${p[1]}%,rgba(255,255,255,.1) ${p[1]}%)" aria-label="${esc(p[0])} progress"><b>${p[1]}%</b></div>`).join("")}
proj();$("#proj").addEventListener("input",e=>{const i=e.target.dataset.p;if(i!=null){S.proj[i][1]=+e.target.value;e.target.style.background=`linear-gradient(90deg,${S.proj[i][2]} ${e.target.value}%,rgba(255,255,255,.1) ${e.target.value}%)`;e.target.nextSibling.textContent=e.target.value+"%";save()}});
const APPS=[["VS Code","💠","vscode://"],["Minecraft","🟩","minecraft://"],["Sarvam AI","🟣","https://indus.sarvam.ai/indus"],["YouTube","▶️","https://youtube.com"],["Claude","✳️","https://claude.ai"],["ChatGPT","🌀","https://chatgpt.com"],["Gemini","✦","https://gemini.google.com"],["Ollama","🦙","https://ollama.com"]];
$("#apps").innerHTML=APPS.map(a=>`<a class="app" href="${a[2]}" target="_blank" rel="noopener"><em>${a[1]}</em>${a[0]}</a>`).join("");
const SCH=[["06:00","Wake Up","#34e37f"],["07:00","School","#8be34a"],["15:00","Homework / Study","#dfe3ff"],["17:00","Projects (GALACTO / Mods)","#ffa726"],["19:00","Exercise","#ffa726"],["20:00","Dinner","#ff8a3d"],["21:00","Free Time / YouTube","#ff4d6d"],["22:30","Sleep","#4d7cff"]];
function tick(){ensureFreshDay();const n=new Date(),m=n.getHours()*60+n.getMinutes();$("#clk").textContent=n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});$("#dt").textContent=n.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short",year:"numeric"});
let cur=-1;SCH.forEach((s,i)=>{if(+s[0].slice(0,2)*60+ +s[0].slice(3)<=m)cur=i});
$("#sch").innerHTML=SCH.map((s,i)=>`<li class="${i==cur?"now":i<cur?"past":""}"><span>${s[0]}</span><i class="dot" style="background:${s[2]}"></i><span>${s[1]}</span></li>`).join("");
const p=Math.round(m/14.4);$("#dp").textContent=p+"%";$("#dpb").style.width=p+"%"}
tick();setInterval(tick,30000);
const Q=[["Discipline beats mood. Small steps, big future.","Max Cooper"],["Ideas, build, learn, improve, repeat.","Max Cooper"],["Same kid. Bigger ideas.","Max Cooper"],["Ship it small, then make it better.","Max Cooper"]];
$("#q").innerHTML=(q=>`“${q[0]}”<small>— ${q[1]}</small>`)(Q[new Date().getDate()%Q.length]);
const WC={0:"Clear sky",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",51:"Drizzle",61:"Rain",63:"Rain",65:"Heavy rain",71:"Snow",80:"Showers",95:"Thunderstorm"};
fetch("https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.21&current=temperature_2m,weather_code,is_day&timezone=auto").then(r=>r.json()).then(j=>{const c=j.current;$("#wx").textContent=(c.is_day?"☀️ ":"🌙 ")+Math.round(c.temperature_2m)+"°C";$("#wxs").textContent="New Delhi · "+(WC[c.weather_code]||"—")}).catch(()=>{$("#wxs").textContent="New Delhi · offline"});
let T=25*60,mode=25,st="idle",iv,end=0;const draw=()=>{const s=`${String(T/60|0).padStart(2,"0")}:${String(T%60).padStart(2,"0")}`;$("#tm").textContent=s;document.title=st=="running"?s+" · Max Dashboard":"Max Dashboard"};
function beep(){try{const a=new AudioContext(),o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start();o.stop(a.currentTime+.4)}catch(e){}}
const psBtn=()=>{$("#ps").textContent=st=="running"?"Pause":st=="paused"?"Resume":"Start"};
function ptick(){T=Math.max(0,Math.round((end-Date.now())/1000));if(T<=0)return finish();draw()}
function finish(){clearInterval(iv);st="completed";beep();ensureFreshDay();if(mode==25){S.pomo.n++;xp(25);bumpStreak();stats();save();$("#pn").textContent=S.pomo.n}T=mode*60;st="idle";psBtn();draw()}
$("#ps").onclick=()=>{ensureFreshDay();clearInterval(iv);if(st=="running"){T=Math.max(0,Math.round((end-Date.now())/1000));st="paused"}else{st="running";end=Date.now()+T*1000;iv=setInterval(ptick,1000)}psBtn();draw()};
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&st=="running")ptick()});
$("#pr").onclick=()=>{clearInterval(iv);st="idle";T=mode*60;psBtn();draw()};
$("#pm").onclick=()=>{mode=mode==25?5:25;$("#pr").click()};$("#pn").textContent=S.pomo.n;
navigator.getBattery?.().then(b=>{const u=()=>{const p=Math.round(b.level*100);$("#bt").textContent=p+"%"+(b.charging?" ⚡":"");$("#btb").style.width=p+"%"};u();b.onlevelchange=b.onchargingchange=u});
const net=()=>$("#nw").textContent=navigator.onLine?"Online":"Offline";net();addEventListener("online",net);addEventListener("offline",net);
$("#hw").textContent=(navigator.hardwareConcurrency||"?")+" / "+(navigator.deviceMemory?navigator.deviceMemory+" GB":"n/a");
const fs=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});
$("#fs").onclick=fs;$("#hero").onclick=e=>e.currentTarget.classList.toggle("big");
function pal(){$("#k").showModal();$("#ki").value="";find("")}
function find(q){q=q.toLowerCase();const r=[...APPS.filter(a=>a[0].toLowerCase().includes(q)).map(a=>[a[1]+" "+a[0],()=>open(a[2],"_blank","noopener")]),...["focus","goals","notes"].flatMap(k=>S[k].filter(t=>q&&t[0].toLowerCase().includes(q)).map(t=>["📌 "+t[0],()=>$("#p-"+k).scrollIntoView()]))].slice(0,7);
$("#kr").innerHTML=r.map((x,i)=>`<li class="t"><a href="#" data-r="${i}" style="color:var(--ink);text-decoration:none;flex:1">${esc(x[0])}</a></li>`).join("");$("#kr").onclick=e=>{const i=e.target.dataset.r;if(i!=null){e.preventDefault();$("#k").close();r[i][1]()}};$("#ki").onkeydown=e=>{if(e.key==="Enter"&&r[0]){$("#k").close();r[0][1]()}}}
$("#ki").oninput=e=>find(e.target.value);$("#k-open").onclick=pal;
addEventListener("keydown",e=>{const t=e.target.tagName;if((e.ctrlKey||e.metaKey)&&e.key=="k"){e.preventDefault();pal()}else if(!e.ctrlKey&&!e.altKey&&!/INPUT|TEXTAREA|BUTTON|SELECT/.test(t)&&!document.querySelector("dialog[open]")&&e.key.toLowerCase()=="f")fs();else if(e.key=="/"&&!/INPUT|TEXTAREA|SELECT/.test(t)&&!document.querySelector("dialog[open]")){e.preventDefault();$("#gq").focus()}});
$("#set").onclick=()=>$("#sd").showModal();
$("#ex").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:"application/json"}));a.download="max-dashboard-backup.json";a.click()};
$("#im").onclick=()=>$("#fi").click();$("#fi").onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const j=JSON.parse(t);if(!validState(j))throw 0;
S=Object.assign(structuredClone(D),j);S.done={day:TODAY,n:["focus","goals","notes"].reduce((n,k)=>n+S[k].filter(t=>t[1]).length,0)};save();location.reload()}catch(x){alert("That file is not a valid Max Dashboard backup.")}})};
$("#rs").onclick=()=>{if(confirm("Delete all saved tasks, progress and streaks?")){try{localStorage.removeItem(KEY)}catch(e){}location.reload()}};
draw();
const ENG={google:"https://www.google.com/search?q=",ddg:"https://duckduckgo.com/?q=",bing:"https://www.bing.com/search?q=",brave:"https://search.brave.com/search?q="},UA=navigator.userAgent,IOS=/iPhone|iPad|iPod/.test(UA),AND=/Android/i.test(UA),PK={chrome:"com.android.chrome",firefox:"org.mozilla.firefox",brave:"com.brave.browser",edge:"com.microsoft.emmx"};
function toUrl(q){q=q.trim();if(!q)return null;let u;
if(/^https?:\/\//i.test(q))u=q;else if(/^[^\s\/]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(q)||/^localhost(:\d+)?(\/\S*)?$/i.test(q))u="https://"+q;else u=ENG[S.pref.e]+encodeURIComponent(q);
try{const p=new URL(u);return/^https?:$/.test(p.protocol)?p.href:null}catch(x){return null}}
function openIn(u,b){const h=u.replace(/^https?:\/\//,""),e=encodeURIComponent(u);let t=null;
if(AND&&PK[b])t="intent://"+h+"#Intent;scheme="+u.split(":")[0]+";package="+PK[b]+";end";
else if(IOS&&b=="chrome")t=(u.startsWith("https")?"googlechromes://":"googlechrome://")+h;
else if(IOS&&b=="firefox")t="firefox://open-url?url="+e;
else if(IOS&&b=="brave")t="brave://open-url?url="+e;
else if(b=="edge"&&!IOS&&!AND)t="microsoft-edge:"+u;
if(t){const seen=Date.now();$("#gh").textContent="Opening in "+b[0].toUpperCase()+b.slice(1)+"…";location.href=t;
setTimeout(()=>{if(!document.hidden&&Date.now()-seen<1600){open(u,"_blank","noopener");$("#gh").textContent=b[0].toUpperCase()+b.slice(1)+" didn't open, so it launched in this browser instead."}},900)}
else{open(u,"_blank","noopener");$("#gh").textContent=b=="self"?"":"A website can't start "+b[0].toUpperCase()+b.slice(1)+" on this device, so it opened in this browser."}}
$("#gb").value=S.pref.b;$("#ge").value=S.pref.e;
$("#gb").onchange=()=>{S.pref.b=$("#gb").value;save()};$("#ge").onchange=()=>{S.pref.e=$("#ge").value;save()};
$("#go").onsubmit=ev=>{ev.preventDefault();const u=toUrl($("#gq").value);if(!u){$("#gh").textContent="Type a website like example.com or words to search.";return}openIn(u,S.pref.b)};
const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){document.querySelectorAll("nav button[data-go]").forEach(a=>a.classList.toggle("on",a.dataset.go==x.target.id))}}),{root:$("main"),threshold:.6});["p-go","p-focus","p-proj","p-apps","p-notes","p-sch","p-goals"].forEach(id=>io.observe($("#"+id)));
addEventListener("storage",e=>{if(e.key==KEY)location.reload()});
