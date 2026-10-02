/* ============================================================
   TAB: Home   (container: #tab-top)
   Everything from the right side lives here.
   ============================================================ */
document.getElementById("tab-top").innerHTML=`<div class="chips">
<div class="chip"><b id="clk">--:--</b><small id="dt"></small></div>
<div class="chip"><b id="wx">--</b><small id="wxs">New Delhi</small></div></div>
<div class="grid">
<section class="c s12" id="p-go"><h2>Go to web</h2><form class="go" id="go" autocomplete="off"><input id="gq" placeholder="Type a website or search (press / to jump here)" aria-label="Website or search"><select id="gb" aria-label="Open in browser"><option value="self">Open in: this browser</option><option value="chrome">Open in: Chrome</option><option value="edge">Open in: Edge</option><option value="firefox">Open in: Firefox</option><option value="brave">Open in: Brave</option></select><select id="ge" aria-label="Search engine"><option value="google">Search: Google</option><option value="ddg">Search: DuckDuckGo</option><option value="bing">Search: Bing</option><option value="brave">Search: Brave</option></select><button class="btn" type="submit">Go</button></form><div class="gh" id="gh" aria-live="polite"></div></section>
<section class="c s4 focus" id="p-focus"><h2>Today's Focus <small id="streak"></small></h2><ul id="l-focus"></ul><input class="add" data-add="focus" placeholder="Add a task, press Enter" aria-label="Add focus task"></section>
<section class="c s4" id="p-proj"><h2>Ongoing projects</h2><div id="proj"></div></section>
<section class="c s4 pomo"><h2>Focus timer</h2><div class="tm" id="tm">25:00</div><button class="btn" id="ps">Start</button><button class="btn" id="pr">Reset</button><button class="btn" id="pm">5 / 25</button><div class="row ctr">Sessions done today:&nbsp;<b id="pn">0</b></div></section>
<section class="c s5" id="p-apps"><h2>Quick apps</h2><div class="apps" id="apps"></div></section>
<section class="c s4" id="p-notes"><h2>Notes / Ideas</h2><ul id="l-notes"></ul><input class="add" data-add="notes" placeholder="New idea, press Enter" aria-label="Add note"></section>
<section class="c s3"><h2>Motivation</h2><div class="q" id="q"></div></section>
<section class="c s4" id="p-sch"><h2>Schedule (today)</h2><ul class="sch" id="sch"></ul></section>
<section class="c s4" id="p-goals"><h2>Goals</h2><ul id="l-goals"></ul><input class="add" data-add="goals" placeholder="New goal, press Enter" aria-label="Add goal"></section>
<section class="c s4"><h2>Last 7 days</h2><div class="wk" id="wk"></div><div class="row">Best day<b id="best">0</b></div></section>
<section class="c s4"><h2>This device</h2><div class="row">Battery<b id="bt">n/a</b></div><div class="bar"><i id="btb"></i></div>
<div class="row">Day progress<b id="dp">0%</b></div><div class="bar"><i id="dpb"></i></div>
<div class="row">Network<b id="nw"></b></div><div class="row">CPU cores / RAM<b id="hw"></b></div><div class="row">Tasks done today<b id="td"></b></div></section>
</div>`;
