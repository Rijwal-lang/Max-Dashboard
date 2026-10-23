/* Max's personal schedule: study first, build deliberately, protect recharge time. */
(() => {
  "use strict";
  const root = document.getElementById("tab-p-sch");
  if (!root) return;
  const KEY = "maxdashboard:schedule:v1";
  const CLAIM_PREFIX = "maxdashboard:schedule:reminder-claim:";
  const CATEGORIES = ["study", "work", "personal", "health", "other"];
  const PRESETS = {
    study: { title: "Homework + revise one tough topic", category: "study", notes: "Choose one assignment or one topic. Finish a real chunk before switching tasks." },
    build: { title: "Ship one small GALACTO / UHLM improvement", category: "work", notes: "Pick one concrete change, test it, and save a checkpoint. Don't open every project at once." },
    minecraft: { title: "SR SMP — test one Minecraft mod / server change", category: "work", notes: "Choose one bug or feature and test it in-game before calling it done." },
    ai: { title: "Learn one AI / LLM idea by trying it", category: "study", notes: "Understand one concept, run one small experiment, and write down what you learned." },
    reset: { title: "Move, hydrate, and rest my eyes", category: "health", notes: "Take a proper break away from the screen. A reset is part of the plan, not a reward you must earn." },
    family: { title: "Help with the family shop / business", category: "personal", notes: "Pick one useful thing that genuinely helps; keep it realistic for today." }
  };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pad = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayKey = () => dateKey(new Date());
  let selectedDate = todayKey(), items = read(), swRegistration = null, reminderTimer = null;

  function validDate(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T12:00:00`);
    return !Number.isNaN(d.getTime()) && dateKey(d) === s;
  }
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const v = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(v)) return [];
      return v.filter(x => x && typeof x.id === "string" && x.id.length > 0 && x.id.length <= 100 &&
        typeof x.title === "string" && x.title.trim().length > 0 && x.title.length <= 120 &&
        typeof x.notes === "string" && x.notes.length <= 500 && validDate(x.date) &&
        typeof x.time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.time) &&
        CATEGORIES.includes(x.category) && typeof x.done === "boolean")
        .slice(0, 500)
        .map(x => ({...x, remind: x.remind !== false, remindedAt: typeof x.remindedAt === "string" && x.remindedAt.length <= 40 ? x.remindedAt : ""}));
    } catch (_) { return []; }
  }
  function persist() {
    try {
      const value = JSON.stringify(items);
      localStorage.setItem(KEY, value);
      return localStorage.getItem(KEY) === value;
    } catch (_) { return false; }
  }
  function dateLabel(value) {
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  }
  function notificationsSupported() {
    return typeof window.Notification !== "undefined";
  }
  function notificationStatus() {
    if (!notificationsSupported()) return "Browser notifications unavailable here; in-page reminders still work while this dashboard is open.";
    if (Notification.permission === "granted") return "Browser notifications are enabled. Keep this dashboard open for timed reminders; this static build cannot alert while the browser is fully closed.";
    if (Notification.permission === "denied") return "Browser notifications are blocked. Allow them in this site's browser settings; in-page reminders still work while open.";
    return "Enable browser notifications for reminders while this dashboard is open. This static build cannot deliver reminders while the browser is fully closed.";
  }
  function updateNotificationControls() {
    const b = root.querySelector("[data-sched-enable-notifications]");
    const note = root.querySelector("[data-sched-notification-status]");
    if (b) {
      if (!notificationsSupported()) { b.textContent = "🔔 In-page reminders active"; b.disabled = true; }
      else if (Notification.permission === "granted") { b.textContent = "🔔 Notifications enabled"; b.disabled = true; }
      else if (Notification.permission === "denied") { b.textContent = "🔔 Allow in browser settings"; b.disabled = true; }
      else { b.textContent = "🔔 Enable browser reminders"; b.disabled = false; }
    }
    if (note) note.textContent = notificationStatus() + " Scheduled reminders are separate from the focus timer. Closing the tab stops its clock checks.";
  }
  function presetButtons() {
    const data = [
      ["study","📚","Study win","One assignment or tough topic"],
      ["build","🧠","Build something real","GALACTO / UHLM"],
      ["minecraft","⛏️","SR SMP / Minecraft","One mod or server task"],
      ["ai","🤖","AI / LLM lab","One concept + experiment"],
      ["reset","🌿","Proper reset","Move, water, eyes off-screen"],
      ["family","🏪","Help at home","Family shop / business"]
    ];
    return data.map(([id,icon,title,sub]) => `<button type="button" class="schedule-preset" data-sched-preset="${id}"><span class="schedule-preset-icon" aria-hidden="true">${icon}</span><span><strong>${title}</strong><small>${sub}</small></span><span class="schedule-preset-plus" aria-hidden="true">＋</span></button>`).join("");
  }
  function render() {
    const today = todayKey();
    const dayItems = items.filter(x => x.date === selectedDate).sort((a,b)=>a.time.localeCompare(b.time));
    const upcoming = items.filter(x=>!x.done && x.date>=today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5);
    const complete = dayItems.filter(x=>x.done).length;
    const focusLine = selectedDate === today ? "Today's game plan" : selectedDate < today ? "Looking back" : "Future-you's plan";
    root.innerHTML = `
      <section class="schedule-wrap">
        <header class="schedule-head"><div><p class="schedule-kicker">MAX'S REAL-LIFE QUEST LOG</p><h1>Max, let's make a day that fits you.</h1><p class="schedule-sub">Study enough to protect future-you, then build one real thing. Keep room for breaks, family, and life outside the screen.</p></div>
        <div class="schedule-header-actions"><button class="btn" type="button" data-sched-enable-notifications>🔔 Enable browser reminders</button><button class="btn ghost" type="button" data-sched-today>Today</button></div></header>
        <p class="schedule-notification-status" data-sched-notification-status role="status" aria-live="polite"></p>
        <section class="c schedule-brother-card" aria-labelledby="schedule-brother-title">
          <div class="schedule-brother-copy"><p class="schedule-kicker">A NOTE FROM YOUR BRO</p><h2 id="schedule-brother-title">One study win. One builder win. One proper reset.</h2><p>You love making things, bhai—so I'm not giving you a fake routine packed with twelve goals. Handle the important study block, move one project forward, then let your brain breathe. <strong>One finished thing beats six half-started things.</strong></p></div>
          <div class="schedule-lanes"><div><span>01</span><strong>Learn</strong><small>Homework / revision</small></div><div><span>02</span><strong>Build</strong><small>One project checkpoint</small></div><div><span>03</span><strong>Recharge</strong><small>Move, hydrate, unplug</small></div></div>
        </section>
        <div class="schedule-personal-start"><div><h2>Pick your kind of win</h2><p>Tap an idea to fill the form. It won't be scheduled until <strong>you</strong> choose the date and time and press Add.</p></div><div class="schedule-presets">${presetButtons()}</div></div>
        <div class="schedule-layout">
          <section class="c schedule-panel">
            <div class="schedule-datebar"><button type="button" class="btn ghost" data-sched-prev aria-label="Previous day">←</button><div><p class="schedule-kicker">${esc(focusLine)}</p><h2>${esc(dateLabel(selectedDate))}</h2><small>${dayItems.length} block${dayItems.length===1?"":"s"} · ${complete} finished · ${dayItems.length-complete} left</small></div><button type="button" class="btn ghost" data-sched-next aria-label="Next day">→</button></div>
            <form id="schedule-form" class="schedule-form">
              <label>What are we getting done?<input name="title" maxlength="120" required placeholder="e.g. Finish one maths exercise set"></label>
              <div class="schedule-fields"><label>Date<input name="date" type="date" required value="${esc(selectedDate)}"></label><label>Time<input name="time" type="time" required value="16:00"></label></div>
              <label>Which lane?<select name="category"><option value="study">📚 Study / revision</option><option value="work">💻 Project / build</option><option value="personal">🏡 Personal / family</option><option value="health">🌿 Health / reset</option><option value="other">📌 Other</option></select></label>
              <label>Notes to future-you <span class="schedule-optional">(optional)</span><textarea name="notes" maxlength="500" rows="2" placeholder="What's the smallest clear next step?"></textarea></label>
              <label class="schedule-reminder-choice"><input name="remind" type="checkbox" checked> <span>🔔 Remind me at the scheduled time</span></label>
              <button class="btn" type="submit">＋ Add my block</button>
              <p class="schedule-message" id="schedule-message" role="status" aria-live="polite"></p>
            </form>
            <div class="schedule-list-head"><h2>Your day plan</h2><span>${dayItems.length} scheduled</span></div>
            <div class="schedule-events">${dayItems.length ? dayItems.map(x=>`<article class="schedule-event ${x.done?"is-done":""}"><button type="button" class="schedule-check" data-sched-toggle="${esc(x.id)}" aria-label="${x.done?"Mark incomplete":"Mark complete"}">${x.done?"✓":"○"}</button><div class="schedule-event-main"><div class="schedule-event-time">${esc(x.time)} <span class="schedule-category cat-${esc(x.category)}">${esc(x.category)}</span>${x.remind&&!x.done?`<span class="schedule-reminder-badge" title="Timed reminder enabled">🔔 reminder on</span>`:""}</div><h3>${esc(x.title)}</h3>${x.notes?`<p>${esc(x.notes)}</p>`:""}</div><button type="button" class="schedule-delete" data-sched-delete="${esc(x.id)}" aria-label="Delete ${esc(x.title)}">×</button></article>`).join("") : `<div class="schedule-empty"><span>🎯</span><h3>No blocks yet, bhai.</h3><p>Pick one study win, one build win, or a proper reset above. Your day doesn't need to be perfect—it needs a starting point.</p></div>`}</div>
          </section>
          <aside class="c schedule-side"><h2>Coming up</h2><p class="schedule-sub">Your next five unfinished blocks—your projects, your pace.</p>${upcoming.length?upcoming.map(x=>`<button type="button" class="schedule-upcoming" data-sched-jump="${esc(x.date)}"><span class="schedule-up-date">${esc(x.date===today?"TODAY":new Date(x.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}))} · ${esc(x.time)}</span><strong>${esc(x.title)}</strong><small>${esc(x.category)}${x.remind?" · 🔔 reminder":""}</small></button>`).join(""):`<div class="schedule-empty compact"><span>🌱</span><p>No unfinished blocks coming up. Take a breath, then pick your next move.</p></div>`}<div class="schedule-tip"><strong>Bhai's rule</strong><p>Don't schedule every minute. Leave space for homework taking longer than expected, debugging, and being a human. Make the next step clear; don't punish yourself for changing the plan.</p></div></aside>
        </div>
      </section>`;
    root.querySelector("[data-sched-today]").addEventListener("click",()=>{selectedDate=todayKey();render()});
    root.querySelector("[data-sched-prev]").addEventListener("click",()=>shift(-1));
    root.querySelector("[data-sched-next]").addEventListener("click",()=>shift(1));
    root.querySelector("[data-sched-enable-notifications]").addEventListener("click",enableNotifications);
    root.querySelector("#schedule-form").addEventListener("submit",addItem);
    root.querySelectorAll("[data-sched-preset]").forEach(b=>b.addEventListener("click",()=>applyPreset(b.dataset.schedPreset)));
    root.querySelectorAll("[data-sched-toggle]").forEach(b=>b.addEventListener("click",()=>toggle(b.dataset.schedToggle)));
    root.querySelectorAll("[data-sched-delete]").forEach(b=>b.addEventListener("click",()=>remove(b.dataset.schedDelete)));
    root.querySelectorAll("[data-sched-jump]").forEach(b=>b.addEventListener("click",()=>{selectedDate=b.dataset.schedJump;render()}));
    updateNotificationControls();
  }
  function applyPreset(key) {
    const p = PRESETS[key]; if (!p) return;
    const form = root.querySelector("#schedule-form"); if (!form) return;
    form.elements.title.value = p.title; form.elements.category.value = p.category; form.elements.notes.value = p.notes;
    form.elements.date.value = selectedDate; form.elements.remind.checked = true;
    const message = root.querySelector("#schedule-message");
    if (message) message.textContent = "Filled in for you. Choose a time, keep the reminder checked if you want it, then add it when it feels right.";
    form.elements.title.focus();
    form.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest"});
  }
  function shift(amount) { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()+amount); selectedDate=dateKey(d); render(); }
  async function enableNotifications() {
    if (!notificationsSupported()) { updateNotificationControls(); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && "serviceWorker" in navigator && location.protocol !== "file:") {
        try { swRegistration = await navigator.serviceWorker.register("./schedule-sw.js", {scope:"./"}); await navigator.serviceWorker.ready; } catch (_) { /* Notification constructor remains a fallback on browsers that support it. */ }
      }
      updateNotificationControls();
      const msg = root.querySelector("#schedule-message");
      if (msg) msg.textContent = permission === "granted" ? "Browser reminders enabled. Keep this dashboard open at the scheduled time; a closed browser cannot receive these reminders from this static site." : permission === "denied" ? "Notifications were blocked. You can enable them in your browser's site settings; in-page reminders still work while open." : "Notifications weren't enabled. In-page reminders still work while the dashboard is open.";
    } catch (_) {
      const msg = root.querySelector("#schedule-message");
      if (msg) msg.textContent = "The browser couldn't enable notifications. In-page reminders will still work while this dashboard is open.";
    }
  }
  function reminderHost() {
    let host = document.getElementById("maxdash-schedule-reminders");
    if (!host) { host=document.createElement("div"); host.id="maxdash-schedule-reminders"; host.setAttribute("role","region"); host.setAttribute("aria-label","Schedule reminders"); host.className="schedule-reminder-host"; document.body.appendChild(host); }
    return host;
  }
  function inPageReminder(item, overdue) {
    const host=reminderHost(), card=document.createElement("section");
    card.className="schedule-reminder-toast"; card.setAttribute("role","alert");
    const title=document.createElement("strong"); title.textContent=overdue?"⏰ Schedule reminder (overdue)":"⏰ It's time, bhai!";
    const detail=document.createElement("p"); detail.textContent=`${item.time} · ${item.title}${overdue?" — this block's start time has passed.":" — your scheduled block starts now."}`;
    const close=document.createElement("button"); close.type="button"; close.className="schedule-reminder-dismiss"; close.textContent="Dismiss"; close.addEventListener("click",()=>card.remove());
    card.append(title,detail,close); host.appendChild(card);
  }
  function claimReminder(item) {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const key=CLAIM_PREFIX+item.id;
      const existing=localStorage.getItem(key);
      if(existing){ const t=Number(existing.split("|")[0]); if(Number.isFinite(t)&&Date.now()-t<60*1000)return false; }
      const claim = `${Date.now()}|${token}`;
      localStorage.setItem(key, claim);
      if(localStorage.getItem(key)!==claim) return false;
    } catch (_) { /* In-memory per-item marker below still prevents repeated checks in this tab. */ }
    return true;
  }
  async function deliverReminder(item, due, now) {
    const overdue = now-due > 60*1000;
    let delivered = false;
    if (notificationsSupported() && Notification.permission === "granted") {
      try {
        if (!swRegistration && "serviceWorker" in navigator && location.protocol !== "file:") {
          swRegistration = await navigator.serviceWorker.register("./schedule-sw.js", {scope:"./"});
        }
        if (swRegistration || ("serviceWorker" in navigator && location.protocol !== "file:")) {
          const reg = ("serviceWorker" in navigator && location.protocol !== "file:") ? await navigator.serviceWorker.ready : swRegistration;
          swRegistration = reg || swRegistration;
          await reg.showNotification(overdue ? "Schedule block is overdue" : "It's time for your schedule block", {body:`${item.time} · ${item.title}`, tag:`maxdash-schedule-${item.id}`, renotify:false, data:{url:location.href}});
          delivered = true;
        } else {
          const n = new Notification(overdue ? "Schedule block is overdue" : "It's time for your schedule block", {body:`${item.time} · ${item.title}`, tag:`maxdash-schedule-${item.id}`, renotify:false});
          n.onclick=()=>{window.focus();n.close()}; delivered=true;
        }
      } catch (_) {
        try { const n=new Notification(overdue ? "Schedule block is overdue" : "It's time for your schedule block", {body:`${item.time} · ${item.title}`, tag:`maxdash-schedule-${item.id}`}); n.onclick=()=>{window.focus();n.close()}; delivered=true; } catch (_) {}
      }
    }
    if (!delivered && !document.hidden) inPageReminder(item, overdue);
    else if (!delivered) inPageReminder(item, overdue);
  }
  function checkReminders() {
    const nowDate=new Date(), today=todayKey(), now=nowDate.getTime(); let changed=false;
    for (const item of items) {
      if (!item.remind || item.done || item.remindedAt || item.date!==today) continue;
      const due=new Date(`${item.date}T${item.time}:00`).getTime();
      if (!Number.isFinite(due) || due>now) continue;
      if (!claimReminder(item)) { item.remindedAt=new Date().toISOString(); changed=true; continue; }
      item.remindedAt=new Date().toISOString(); changed=true;
      void deliverReminder(item,due,now);
    }
    if (changed) { persist(); render(); }
  }
  function startServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./schedule-sw.js", {scope:"./"}).then(reg=>{swRegistration=reg}).catch(()=>{});
    }
  }
  function addItem(e) {
    e.preventDefault(); const f=new FormData(e.currentTarget);
    const title=String(f.get("title")||"").trim(); if(!title) return;
    if(items.length>=500){const m=root.querySelector("#schedule-message");if(m)m.textContent="You've reached the 500-block limit. Remove an old block before adding another.";return;}
    const date=String(f.get("date")||""), time=String(f.get("time")||""), category=String(f.get("category")||""), notes=String(f.get("notes")||"").trim(), remind=f.get("remind")==="on";
    if(!validDate(date)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)||!CATEGORIES.includes(category)||title.length>120||notes.length>500){const m=root.querySelector("#schedule-message");if(m)m.textContent="That block has an invalid date, time, or field. Check it and try again.";return;}
    const makeId=()=>{try{if(typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function")return crypto.randomUUID()}catch(_){}return `${Date.now()}-${Math.random().toString(36).slice(2)}`};
    const next={id:makeId(),title,date,time,category,notes,done:false,remind,remindedAt:""};
    items.push(next); const previousDate=selectedDate; selectedDate=date;
    if(!persist()){items.pop();selectedDate=previousDate;render();const m=root.querySelector("#schedule-message");if(m)m.textContent="Couldn't save. Check browser storage permissions or available space.";return;}
    render(); checkReminders();
  }
  function toggle(id) { const x=items.find(v=>v.id===id);if(!x)return;const old=x.done;x.done=!old;if(!persist()){x.done=old;alert("Couldn't save this change. Browser storage may be unavailable.");}render(); }
  function remove(id) { const index=items.findIndex(v=>v.id===id);if(index<0)return;const [removed]=items.splice(index,1);if(!persist()){items.splice(index,0,removed);alert("Couldn't save this change. Browser storage may be unavailable.");}render(); }
  window.addEventListener("storage",e=>{if(e.key===KEY){items=read();render();checkReminders()}});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkReminders()});
  window.addEventListener("focus",checkReminders);
  window.addEventListener("pageshow",checkReminders);
  render(); startServiceWorker(); checkReminders();
  reminderTimer=window.setInterval(checkReminders,15000);
})();
