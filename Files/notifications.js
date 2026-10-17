(() => {
  "use strict";
  const KEY="maxdashboard:notifications:v1", MAX=100;
  const $=id=>document.getElementById(id);
  let entries=[];
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");entries=Array.isArray(x)?x.filter(n=>n&&typeof n.id==="string"&&typeof n.title==="string"&&typeof n.body==="string"&&Number.isFinite(n.time)&&typeof n.read==="boolean").slice(0,MAX):[]}catch(_){entries=[]}}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(entries));return true}catch(_){return false}}
  function render(){
    const count=entries.filter(n=>!n.read).length, badge=$("notification-center-count"), list=$("notification-center-list");
    if(badge){badge.textContent=String(count);badge.hidden=count===0;badge.setAttribute("aria-label",`${count} unread notifications`)}
    if(list)list.innerHTML=entries.length?entries.slice().sort((a,b)=>b.time-a.time).map(n=>`<li class="notification-item"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${esc(new Date(n.time).toLocaleString())}${n.read?" · Read":" · Unread"}</small><div class="notification-actions"><button class="btn ghost" type="button" data-notification-read="${esc(n.id)}">${n.read?"Read":"Mark read"}</button><button class="btn ghost" type="button" data-notification-dismiss="${esc(n.id)}">Dismiss</button></div></li>`).join(""):`<li class="notification-item"><strong>You're all caught up.</strong><p>Schedule reminders and focus alerts will appear here.</p></li>`;
    if(list){list.querySelectorAll("[data-notification-read]").forEach(b=>b.addEventListener("click",()=>{const n=entries.find(x=>x.id===b.dataset.notificationRead);if(n)n.read=true;persist();render()}));list.querySelectorAll("[data-notification-dismiss]").forEach(b=>b.addEventListener("click",()=>{entries=entries.filter(x=>x.id!==b.dataset.notificationDismiss);persist();render()}))}
  }
  function add(detail){
    if(!detail||typeof detail.title!=="string"||typeof detail.body!=="string")return;
    const id=String(detail.id||`${Date.now()}-${Math.random()}`);
    if(entries.some(n=>n.id===id))return;
    entries.push({id,title:detail.title.slice(0,120),body:detail.body.slice(0,500),time:Number.isFinite(detail.time)?detail.time:Date.now(),kind:String(detail.kind||"general").slice(0,30),read:false});
    entries=entries.slice(-MAX);persist();render();
  }
  $("notification-center-open")?.addEventListener("click",()=>{$("notification-center-dialog").showModal();render()});
  $("notification-center-close")?.addEventListener("click",()=> $("notification-center-dialog").close());
  $("notification-center-read")?.addEventListener("click",()=>{entries.forEach(n=>n.read=true);persist();render()});
  $("notification-center-clear")?.addEventListener("click",()=>{entries=[];persist();render()});
  window.addEventListener("maxdash:notification",e=>add(e.detail));
  window.addEventListener("storage",e=>{if(e.key===KEY){load();render()}});
  load();render();
  window.maxDashboardNotify=(title,body,kind="general")=>add({id:`${kind}-${Date.now()}-${Math.random()}`,title,body,kind,time:Date.now()});
})();