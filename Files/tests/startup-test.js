(function(){
"use strict";
if(!/[?&]test=1(?:&|$)/.test(location.search))return;
window.__MAX_STARTUP_ERRORS=[];
window.addEventListener("error",e=>window.__MAX_STARTUP_ERRORS.push(String(e.error||e.message||"startup error")));
window.addEventListener("unhandledrejection",e=>window.__MAX_STARTUP_ERRORS.push(String(e.reason||"unhandled rejection")));
window.addEventListener("load",()=>{
  setTimeout(()=>{
    const ok=window.__MAX_STARTUP_ERRORS.length===0&&window.__MAX_BOOTSTRAP_OK===true;
    document.documentElement.dataset.startupTest=ok?"pass":"fail";
    document.documentElement.dataset.startupErrors=window.__MAX_STARTUP_ERRORS.join(" | ");
  },1000);
});
})();