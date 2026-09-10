(()=>{var a="motionkit-pt-preset-",s=(e,t)=>{if(!t)return;let n=a+e;if(document.getElementById(n))return;let o=document.createElement("style");o.id=n,o.textContent=t,(document.head||document.documentElement).appendChild(o)};var p=`.motionkit-pt-overlay[data-transition="circle"] .motionkit-pt-circle {
  position: absolute;
  width: 12vmax;
  height: 12vmax;
  margin-top: -6vmax;
  margin-left: -6vmax;
  border-radius: 50%;
  will-change: transform;
}`;function r(){return s("circle",p),{css:p,build(e,t){e.innerHTML='<div class="motionkit-pt-circle"></div>';let n=e.querySelector(".motionkit-pt-circle");n.style.background=t.color;let o={center:{top:"50%",left:"50%"},"top-left":{top:"0%",left:"0%"},"top-right":{top:"0%",left:"100%"},"bottom-left":{top:"100%",left:"0%"},"bottom-right":{top:"100%",left:"100%"},top:{top:"0%",left:"50%"},bottom:{top:"100%",left:"50%"},left:{top:"50%",left:"0%"},right:{top:"50%",left:"100%"}},c=o[t.origin]||o.center;n.style.top=c.top,n.style.left=c.left},arrive(e,t){gsap.set(e.querySelector(".motionkit-pt-circle"),{scale:35,opacity:t.enterOpacity})},enter(e,t){return gsap.to(e.querySelector(".motionkit-pt-circle"),{scale:0,duration:t.enterDuration,ease:t.enterEase})},exit(e,t){return gsap.set(e.querySelector(".motionkit-pt-circle"),{scale:0,opacity:t.exitOpacity}),gsap.to(e.querySelector(".motionkit-pt-circle"),{scale:35,duration:t.exitDuration,ease:t.exitEase})}}}var i="__motionkitEngineHandoff";function u(e){let t=typeof window!="undefined"?window:globalThis;return t[i]||(t[i]={}),t[i][e]||(t[i][e]={run:null,pending:[]}),t[i][e]}function l(e,t){let n=u(e);n.run?n.run(t):n.pending.push(t)}l("pageTransition",r);})();
