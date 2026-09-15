(()=>{var u="motionkit-pt-preset-",s=(n,t)=>{if(!t)return;let e=u+n;if(document.getElementById(e))return;let i=document.createElement("style");i.id=e,i.textContent=t,(document.head||document.documentElement).appendChild(i)};var p=`.motionkit-pt-overlay[data-transition="flip"] .motionkit-pt-panel {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  will-change: transform;
}`;function r(){return s("flip",p),{css:p,build(n,t){n.innerHTML='<div class="motionkit-pt-panel"></div>',n.style.perspective=t.perspective+"px",n.querySelector(".motionkit-pt-panel").style.background=t.color},arrive(n,t){gsap.set(n.querySelector(".motionkit-pt-panel"),{rotationX:0,rotationY:0,opacity:t.enterOpacity})},enter(n,t){return gsap.to(n.querySelector(".motionkit-pt-panel"),{[this._prop(t)]:-90,duration:t.enterDuration,ease:t.enterEase})},exit(n,t){let e={rotationX:0,rotationY:0,opacity:t.exitOpacity};return e[this._prop(t)]=90,gsap.set(n.querySelector(".motionkit-pt-panel"),e),gsap.to(n.querySelector(".motionkit-pt-panel"),{[this._prop(t)]:0,duration:t.exitDuration,ease:t.exitEase})},_prop(n){return n.axis==="x"?"rotationX":"rotationY"}}}var o="__motionkitEngineHandoff";function c(n){let t=typeof window!="undefined"?window:globalThis;return t[o]||(t[o]={}),t[o][n]||(t[o][n]={run:null,pending:[]}),t[o][n]}function a(n,t){let e=c(n);e.run?e.run(t):e.pending.push(t)}a("pageTransition",r);})();
