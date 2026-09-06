(()=>{var p={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},Et=[p.DRAFT,p.SAVED,p.PUBLISHED],xt="preview";function Ct(r){return!r||typeof r!="object"?p.PUBLISHED:Et.indexOf(r.status)!==-1?r.status:r.status===xt||r.isPublished===!1?p.SAVED:p.PUBLISHED}function J(r){return Ct(r)!==p.DRAFT}var M="__motionkitPresetHandlers";function $t(){return typeof window=="undefined"?new Map:(window[M]||(window[M]=new Map),window[M])}function Q(r,m){if(!r||typeof m!="function")return;let y=$t();if(y.has(r))return;let b=m()||{};y.set(r,{key:r,run:typeof b.run=="function"?b.run:function(){},teardown:typeof b.teardown=="function"?b.teardown:function(){}})}var kt="motionkit-mk-scroll-cr-pa";function Tt(){let r=new Map;function m(c){let u=r.get(c);u&&(u.timelines.forEach(t=>{var s;try{(s=t.scrollTrigger)==null||s.kill(),t.kill()}catch($){console.warn("[cubeScroll] timeline teardown error:",$)}}),u.scrollTriggers.forEach(t=>{try{t.kill()}catch(s){console.warn("[cubeScroll] scrollTrigger teardown error:",s)}}),u.cleanups.forEach(t=>{try{t()}catch(s){console.warn("[cubeScroll] cleanup error:",s)}}),r.delete(c))}function y(){for(let c of[...r.keys()])m(c)}function b(c){var K,G;if(!c||!J(c)||!c.itemClass||!c.endSectionClass)return;let{id:u,itemClass:t,endSectionClass:s,frontMedia:$,backMedia:tt,leftMedia:et,rightMedia:ot,topMedia:nt,bottomMedia:rt,vars:at={}}=c,{cubeMinWidth:it,cubeMaxWidth:ct,cubeMaxHeight:st,position:lt,expandFace:v,scale:dt,cubeAnimStart:P,cubeAnimCStart:ut,revealMode:ft}=at,Y=ft==="cube-to-cube",f=parseFloat(it)||0,pt=parseFloat(ct)||0,wt=parseFloat(st)||0,bt=parseFloat(lt)||0,mt=parseFloat(dt)||1,n;try{n=document.querySelector(t)}catch(e){console.warn(`[cubeScroll] invalid itemClass "${t}":`,e.message);return}if(!n||(m(u),n.setAttribute("data-motionkit-anim-id",u),c.mkInert))return;n.classList.add("motionkit-skip-selector-full"),n.innerHTML="";let w=document.createElement("div");w.className="aab_wc-scroll-container";let h=document.createElement("div");h.className="aab_wc-scene";let g=document.createElement("div");g.className="aab_wc-animation-container",g.style.width=`${f}px`,g.style.height=`${f}px`;let k=document.createElement("div");k.className="aab_wc-cube";let L={front:$,back:tt,left:et,right:ot,top:nt,bottom:rt},A=e=>{if(!e)return null;if(typeof e=="string"){let o=/^data:video\//i.test(e)||/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(e);return{url:e,type:o?"video":"image"}}return typeof e=="object"&&e.url?{url:e.url,type:e.type||"image"}:null},ht=e=>{let o=A(L[e]);return o?o.type==="video"?`
          <div class="aab_wc-video-player">
            <video class="aab_wc-video" data-face="${e}" muted loop playsinline>
              <source src="${o.url}" type="video/mp4" />
            </video>
          </div>
        `:`<img src="${o.url}" alt="${e}" />`:""};[{class:"aab_wc-front",name:"front"},{class:"aab_wc-back",name:"back"},{class:"aab_wc-right",name:"right"},{class:"aab_wc-left",name:"left"},{class:"aab_wc-top",name:"top"},{class:"aab_wc-bottom",name:"bottom"}].forEach(e=>{let o=document.createElement("div");o.className=`aab_wc-face ${e.class}`,o.innerHTML=ht(e.name),k.appendChild(o)});let S=document.createElement("button");S.className="aab_wc-video-control",S.type="button",S.textContent="Play",g.appendChild(k),h.appendChild(g),h.appendChild(S),w.appendChild(h),n.appendChild(w);let R={front:{rotationY:0,rotationX:0},back:{rotationY:180,rotationX:0},right:{rotationY:-90,rotationX:0},left:{rotationY:90,rotationX:0},top:{rotationY:0,rotationX:-90},bottom:{rotationY:0,rotationX:90}},H=R[v]||R.front,_={rotationX:-30,rotationY:45},X=document.createElement("style");X.textContent=`
      ${t} { margin: 0; padding: 0; box-sizing: border-box; }
      ${t} .aab_wc-scroll-container {
        position: relative;
        z-index: 100;
      }
      ${t} .aab_wc-scene {
        width: 100%;
        display: flex;
        justify-content: center;
        position: relative;
      }
      ${t} .aab_wc-animation-container {
        position: relative;
        transform-style: preserve-3d;
        perspective: 1000px;
      }
      ${t} .aab_wc-cube {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transform: rotateX(${_.rotationX}deg) rotateY(${_.rotationY}deg);
      }
      ${t} .aab_wc-face {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        backface-visibility: hidden;
        overflow: hidden;
      }
      ${t} .aab_wc-face img { width: 100%; height: 100%; object-fit: cover; }
      ${t} .aab_wc-front  { transform: translateZ(${f/2}px); }
      ${t} .aab_wc-back   { transform: rotateY(180deg) translateZ(${f/2}px); }
      ${t} .aab_wc-right  { transform: rotateY(90deg)  translateZ(${f/2}px); }
      ${t} .aab_wc-left   { transform: rotateY(-90deg) translateZ(${f/2}px); }
      ${t} .aab_wc-top    { transform: rotateX(90deg)  translateZ(${f/2}px); }
      ${t} .aab_wc-bottom { transform: rotateX(-90deg) translateZ(${f/2}px); }
      ${t} .aab_wc-video-player {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        overflow: hidden;
      }
      ${t} .aab_wc-video { width: 100%; height: 100%; object-fit: cover; }
      ${t} .aab_wc-video-control {
        position: absolute;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        border: none;
        border-radius: 100px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s ease;
        z-index: 10;
        height: 100px;
        width: 100px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0;
        display: none;
      }
      ${t} .aab_wc-animation-container:hover + .aab_wc-video-control,
      ${t} .aab_wc-video-control:hover { opacity: 1; }
    `,n.appendChild(X);let l=n.querySelector(".aab_wc-video-control"),q=n.querySelector(".aab_wc-animation-container"),N=n.querySelector(".aab_wc-cube"),D=n.querySelector(".aab_wc-front"),F=n.querySelector(".aab_wc-back"),B=n.querySelector(".aab_wc-right"),O=n.querySelector(".aab_wc-left"),I=n.querySelector(".aab_wc-top"),U=n.querySelector(".aab_wc-bottom"),gt=n.querySelectorAll(".aab_wc-face"),T=A(L[v]),V=(T==null?void 0:T.type)==="video",a=V?n.querySelector(`.aab_wc-video[data-face="${v}"]`):null,yt=[D,F,B,O,I,U],vt={front:D,back:F,right:B,left:O,top:I,bottom:U},St=yt.filter(e=>e!==vt[v]),E=null;if(s){try{E=document.querySelector(s)}catch(e){console.warn(`[cubeScroll] invalid endSectionClass "${s}":`,e.message)}E||console.warn(`[cubeScroll] endSectionClass "${s}" matched no element \u2014 falling back to 1.5 viewports of scroll.`)}let j=()=>{if(!E)return window.innerHeight*1.5;let e=w.getBoundingClientRect(),o=E.getBoundingClientRect(),i=e.top+window.scrollY,_t=o.top+window.scrollY;return Math.max(window.innerHeight,_t-i)},W=P==="custom"?ut:P||"center center",d=gsap.timeline({scrollTrigger:{trigger:w,start:W,end:()=>"+="+j(),scrub:1,pin:!0,pinSpacing:!1,invalidateOnRefresh:!0}}),Z=1;d.to(q,{scale:mt,duration:.6},0),d.to(h,{x:bt,duration:.6},0),Y?d.to(N,{rotationY:_.rotationY+(Z+1)*360,rotationX:_.rotationX,rotate:0,duration:2.3,ease:"none"},0):(d.to(N,{rotationY:H.rotationY+Z*360,rotationX:H.rotationX,rotate:0,duration:1.8,ease:"none"},0),d.to(q,{width:pt,height:wt,scale:1,duration:.5},1.8),d.to(gt,{scale:.9,duration:.5},1.8),d.to(St,{opacity:0,duration:.4},1.85));let z=[],x=[],C=()=>d.progress()>=.7;if(V&&a&&!Y){d.to(l,{display:"block",duration:.1},1.5),d.eventCallback("onUpdate",()=>{a&&(C()&&a.paused?(a.play().catch(i=>console.warn("[cubeScroll] video play failed:",i)),l.textContent="Pause"):!C()&&!a.paused&&(a.pause(),l.textContent="Play"))});let e=window.ScrollTrigger.create({trigger:w,start:W,end:()=>"+="+j(),invalidateOnRefresh:!0,onEnter:()=>{C()&&a&&(a.play().catch(i=>console.warn("[cubeScroll] video play failed:",i)),l.textContent="Pause")},onEnterBack:()=>{C()&&a&&(a.play().catch(i=>console.warn("[cubeScroll] video play failed:",i)),l.textContent="Pause")},onLeave:()=>{a&&(a.pause(),l.textContent="Play")},onLeaveBack:()=>{a&&(a.pause(),l.textContent="Play")}});z.push(e);let o=()=>{a.paused?(a.play(),l.textContent="Pause"):(a.pause(),l.textContent="Play")};l.addEventListener("click",o),x.push(()=>l.removeEventListener("click",o))}x.push(()=>{n.classList.remove("motionkit-skip-selector-full"),n.innerHTML=""}),window.ScrollTrigger&&(window.ScrollTrigger.refresh(),(G=(K=document.fonts)==null?void 0:K.ready)==null||G.then(()=>window.ScrollTrigger.refresh()).catch(()=>{}),w.querySelectorAll("img").forEach(o=>{if(o.complete)return;let i=()=>window.ScrollTrigger.refresh();o.addEventListener("load",i,{once:!0}),o.addEventListener("error",i,{once:!0}),x.push(()=>{o.removeEventListener("load",i),o.removeEventListener("error",i)})})),r.set(u,{timelines:[d],scrollTriggers:z,cleanups:x})}return{run:b,teardown:y}}Q(kt,Tt);})();
