(()=>{var c="motionkit-pt-preset-",l=(e,t)=>{if(!t)return;let n=c+e;if(document.getElementById(n))return;let o=document.createElement("style");o.id=n,o.textContent=t,(document.head||document.documentElement).appendChild(o)};var p=`.motionkit-pt-overlay[data-transition="shutter"] {
  display: flex;
}
.motionkit-pt-overlay[data-transition="shutter"][data-axis="horizontal"] {
  flex-direction: column;
}
.motionkit-pt-overlay[data-transition="shutter"][data-axis="vertical"] {
  flex-direction: row;
}
.motionkit-pt-overlay[data-transition="shutter"] .motionkit-pt-slat {
  flex: 1;
  will-change: transform;
}`;function i(){return l("shutter",p),{css:p,build(e,t){let n=Math.max(3,Math.min(15,parseInt(t.slats,10)||8));e.setAttribute("data-axis",t.axis);let o="0 0 0 1px "+t.color,a="";for(let s=0;s<n;s++)a+='<div class="motionkit-pt-slat" style="background:'+t.color+";box-shadow:"+o+'"></div>';e.innerHTML=a},arrive(e,t){gsap.set(e.querySelectorAll(".motionkit-pt-slat"),{scaleX:1,scaleY:1,opacity:t.enterOpacity})},enter(e,t){return gsap.to(e.querySelectorAll(".motionkit-pt-slat"),{[this._prop(t)]:0,duration:t.enterDuration,ease:t.enterEase,stagger:{each:t.enterStaggerEach,from:t.enterStaggerFrom}})},exit(e,t){return gsap.set(e.querySelectorAll(".motionkit-pt-slat"),{[this._prop(t)]:0,opacity:t.exitOpacity}),gsap.to(e.querySelectorAll(".motionkit-pt-slat"),{[this._prop(t)]:1,duration:t.exitDuration,ease:t.exitEase,stagger:{each:t.exitStaggerEach,from:t.exitStaggerFrom}})},_prop(e){return e.axis==="vertical"?"scaleX":"scaleY"}}}var r="__motionkitEngineHandoff";function m(e){let t=typeof window!="undefined"?window:globalThis;return t[r]||(t[r]={}),t[r][e]||(t[r][e]={run:null,pending:[]}),t[r][e]}function u(e,t){let n=m(e);n.run?n.run(t):n.pending.push(t)}u("pageTransition",i);})();
