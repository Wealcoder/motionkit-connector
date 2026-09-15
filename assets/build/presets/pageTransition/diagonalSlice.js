(()=>{var c="motionkit-pt-preset-",a=(n,t)=>{if(!t)return;let e=c+n;if(document.getElementById(e))return;let i=document.createElement("style");i.id=e,i.textContent=t,(document.head||document.documentElement).appendChild(i)};var s=`.motionkit-pt-overlay[data-transition="diagonalSlice"] .motionkit-pt-panel {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  will-change: transform;
}`;function r(){return a("diagonalSlice",s),{css:s,build(n,t){n.innerHTML='<div class="motionkit-pt-panel"></div>',n.querySelector(".motionkit-pt-panel").style.background=t.color},arrive(n,t){gsap.set(n.querySelector(".motionkit-pt-panel"),{xPercent:0,yPercent:0,rotation:t.angle,opacity:t.enterOpacity})},enter(n,t){return gsap.to(n.querySelector(".motionkit-pt-panel"),{xPercent:-80,yPercent:-80,rotation:t.angle,duration:t.enterDuration,ease:t.enterEase})},exit(n,t){return gsap.set(n.querySelector(".motionkit-pt-panel"),{xPercent:80,yPercent:80,rotation:t.angle,opacity:t.exitOpacity}),gsap.to(n.querySelector(".motionkit-pt-panel"),{xPercent:0,yPercent:0,rotation:t.angle,duration:t.exitDuration,ease:t.exitEase})}}}var o="__motionkitEngineHandoff";function u(n){let t=typeof window!="undefined"?window:globalThis;return t[o]||(t[o]={}),t[o][n]||(t[o][n]={run:null,pending:[]}),t[o][n]}function p(n,t){let e=u(n);e.run?e.run(t):e.pending.push(t)}p("pageTransition",r);})();
