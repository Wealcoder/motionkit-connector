(()=>{var w={DRAFT:"draft",PREVIEW:"preview",PUBLISHED:"published"},xt=[w.DRAFT,w.PREVIEW,w.PUBLISHED];function Et(r){return!r||typeof r!="object"?w.PUBLISHED:xt.indexOf(r.status)!==-1?r.status:r.isPublished===!1?w.DRAFT:w.PUBLISHED}function J(r){return Et(r)!==w.DRAFT}var P="__motionkitPresetHandlers";function Ct(){return typeof window=="undefined"?new Map:(window[P]||(window[P]=new Map),window[P])}function Q(r,m){if(!r||typeof m!="function")return;let y=Ct();if(y.has(r))return;let b=m()||{};y.set(r,{key:r,run:typeof b.run=="function"?b.run:function(){},teardown:typeof b.teardown=="function"?b.teardown:function(){}})}var $t="motionkit-mk-scroll-cr-pa";function kt(){let r=new Map;function m(c){let u=r.get(c);u&&(u.timelines.forEach(t=>{var s;try{(s=t.scrollTrigger)==null||s.kill(),t.kill()}catch($){console.warn("[cubeScroll] timeline teardown error:",$)}}),u.scrollTriggers.forEach(t=>{try{t.kill()}catch(s){console.warn("[cubeScroll] scrollTrigger teardown error:",s)}}),u.cleanups.forEach(t=>{try{t()}catch(s){console.warn("[cubeScroll] cleanup error:",s)}}),r.delete(c))}function y(){for(let c of[...r.keys()])m(c)}function b(c){var V,G;if(!c||!J(c)||!c.itemClass||!c.endSectionClass)return;let{id:u,itemClass:t,endSectionClass:s,frontMedia:$,backMedia:tt,leftMedia:et,rightMedia:ot,topMedia:nt,bottomMedia:rt,vars:at={}}=c,{cubeMinWidth:it,cubeMaxWidth:ct,cubeMaxHeight:st,position:lt,expandFace:v,scale:dt,cubeAnimStart:M,cubeAnimCStart:ut,revealMode:ft}=at,Y=ft==="cube-to-cube",f=parseFloat(it)||0,pt=parseFloat(ct)||0,wt=parseFloat(st)||0,bt=parseFloat(lt)||0,mt=parseFloat(dt)||1,n;try{n=document.querySelector(t)}catch(e){console.warn(`[cubeScroll] invalid itemClass "${t}":`,e.message);return}if(!n||(m(u),n.setAttribute("data-motionkit-anim-id",u),c.mkInert))return;n.classList.add("motionkit-skip-selector-full"),n.innerHTML="";let p=document.createElement("div");p.className="aab_wc-scroll-container";let h=document.createElement("div");h.className="aab_wc-scene";let g=document.createElement("div");g.className="aab_wc-animation-container",g.style.width=`${f}px`,g.style.height=`${f}px`;let k=document.createElement("div");k.className="aab_wc-cube";let R={front:$,back:tt,left:et,right:ot,top:nt,bottom:rt},L=e=>{if(!e)return null;if(typeof e=="string"){let o=/^data:video\//i.test(e)||/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(e);return{url:e,type:o?"video":"image"}}return typeof e=="object"&&e.url?{url:e.url,type:e.type||"image"}:null},ht=e=>{let o=L(R[e]);return o?o.type==="video"?`
          <div class="aab_wc-video-player">
            <video class="aab_wc-video" data-face="${e}" muted loop playsinline>
              <source src="${o.url}" type="video/mp4" />
            </video>
          </div>
        `:`<img src="${o.url}" alt="${e}" />`:""};[{class:"aab_wc-front",name:"front"},{class:"aab_wc-back",name:"back"},{class:"aab_wc-right",name:"right"},{class:"aab_wc-left",name:"left"},{class:"aab_wc-top",name:"top"},{class:"aab_wc-bottom",name:"bottom"}].forEach(e=>{let o=document.createElement("div");o.className=`aab_wc-face ${e.class}`,o.innerHTML=ht(e.name),k.appendChild(o)});let _=document.createElement("button");_.className="aab_wc-video-control",_.type="button",_.textContent="Play",g.appendChild(k),h.appendChild(g),h.appendChild(_),p.appendChild(h),n.appendChild(p);let H={front:{rotationY:0,rotationX:0},back:{rotationY:180,rotationX:0},right:{rotationY:-90,rotationX:0},left:{rotationY:90,rotationX:0},top:{rotationY:0,rotationX:-90},bottom:{rotationY:0,rotationX:90}},X=H[v]||H.front,S={rotationX:-30,rotationY:45},A=document.createElement("style");A.textContent=`
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
        transform: rotateX(${S.rotationX}deg) rotateY(${S.rotationY}deg);
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
    `,n.appendChild(A);let l=n.querySelector(".aab_wc-video-control"),q=n.querySelector(".aab_wc-animation-container"),N=n.querySelector(".aab_wc-cube"),F=n.querySelector(".aab_wc-front"),B=n.querySelector(".aab_wc-back"),I=n.querySelector(".aab_wc-right"),O=n.querySelector(".aab_wc-left"),D=n.querySelector(".aab_wc-top"),U=n.querySelector(".aab_wc-bottom"),gt=n.querySelectorAll(".aab_wc-face"),T=L(R[v]),W=(T==null?void 0:T.type)==="video",a=W?n.querySelector(`.aab_wc-video[data-face="${v}"]`):null,yt=[F,B,I,O,D,U],vt={front:F,back:B,right:I,left:O,top:D,bottom:U},_t=yt.filter(e=>e!==vt[v]),x=null;if(s){try{x=document.querySelector(s)}catch(e){console.warn(`[cubeScroll] invalid endSectionClass "${s}":`,e.message)}x||console.warn(`[cubeScroll] endSectionClass "${s}" matched no element \u2014 falling back to 1.5 viewports of scroll.`)}let j=()=>{if(!x)return window.innerHeight*1.5;let e=p.getBoundingClientRect(),o=x.getBoundingClientRect(),i=e.top+window.scrollY,St=o.top+window.scrollY;return Math.max(window.innerHeight,St-i)},Z=M==="custom"?ut:M||"center center",d=gsap.timeline({scrollTrigger:{trigger:p,start:Z,end:()=>"+="+j(),scrub:1,pin:!0,pinSpacing:!1,invalidateOnRefresh:!0}}),z=1;d.to(q,{scale:mt,duration:.6},0),d.to(h,{x:bt,duration:.6},0),Y?d.to(N,{rotationY:S.rotationY+(z+1)*360,rotationX:S.rotationX,rotate:0,duration:2.3,ease:"none"},0):(d.to(N,{rotationY:X.rotationY+z*360,rotationX:X.rotationX,rotate:0,duration:1.8,ease:"none"},0),d.to(q,{width:pt,height:wt,scale:1,duration:.5},1.8),d.to(gt,{scale:.9,duration:.5},1.8),d.to(_t,{opacity:0,duration:.4},1.85));let K=[],E=[],C=()=>d.progress()>=.7;if(W&&a&&!Y){d.to(l,{display:"block",duration:.1},1.5),d.eventCallback("onUpdate",()=>{a&&(C()&&a.paused?(a.play().catch(i=>console.warn("[cubeScroll] video play failed:",i)),l.textContent="Pause"):!C()&&!a.paused&&(a.pause(),l.textContent="Play"))});let e=window.ScrollTrigger.create({trigger:p,start:Z,end:()=>"+="+j(),invalidateOnRefresh:!0,onEnter:()=>{C()&&a&&(a.play().catch(i=>console.warn("[cubeScroll] video play failed:",i)),l.textContent="Pause")},onEnterBack:()=>{C()&&a&&(a.play().catch(i=>console.warn("[cubeScroll] video play failed:",i)),l.textContent="Pause")},onLeave:()=>{a&&(a.pause(),l.textContent="Play")},onLeaveBack:()=>{a&&(a.pause(),l.textContent="Play")}});K.push(e);let o=()=>{a.paused?(a.play(),l.textContent="Pause"):(a.pause(),l.textContent="Play")};l.addEventListener("click",o),E.push(()=>l.removeEventListener("click",o))}E.push(()=>{n.classList.remove("motionkit-skip-selector-full"),n.innerHTML=""}),window.ScrollTrigger&&(window.ScrollTrigger.refresh(),(G=(V=document.fonts)==null?void 0:V.ready)==null||G.then(()=>window.ScrollTrigger.refresh()).catch(()=>{}),p.querySelectorAll("img").forEach(o=>{if(o.complete)return;let i=()=>window.ScrollTrigger.refresh();o.addEventListener("load",i,{once:!0}),o.addEventListener("error",i,{once:!0}),E.push(()=>{o.removeEventListener("load",i),o.removeEventListener("error",i)})})),r.set(u,{timelines:[d],scrollTriggers:K,cleanups:E})}return{run:b,teardown:y}}Q($t,kt);})();
