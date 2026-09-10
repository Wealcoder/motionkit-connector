(()=>{var U="__motionkitPresetHandlers";function Ot(){return typeof window=="undefined"?new Map:(window[U]||(window[U]=new Map),window[U])}function gt(e,t){if(!e||typeof t!="function")return;let n=Ot();if(n.has(e))return;let s=t()||{};n.set(e,{key:e,run:typeof s.run=="function"?s.run:function(){},teardown:typeof s.teardown=="function"?s.teardown:function(){}})}var y={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},qt=[y.DRAFT,y.SAVED,y.PUBLISHED],Nt="preview";function Dt(e){return!e||typeof e!="object"?y.PUBLISHED:qt.indexOf(e.status)!==-1?e.status:e.status===Nt||e.isPublished===!1?y.SAVED:y.PUBLISHED}function ht(e){return Dt(e)!==y.DRAFT}function Ft(){return typeof window=="undefined"?{}:window.__motionkitHostData||window.motionkitData||{}}function mt(){return Ft().motionkit_token||null}var yt=()=>typeof window=="undefined"?!1:window.location.search.includes("action=motionkit-editor")?!0:!!mt();var V="__motionkitOwnership";function x(){let e=typeof window!="undefined"?window:globalThis;return e[V]||(e[V]={ownerByEl:new WeakMap,elsByAnim:new Map,animsByAnim:new Map,resetByAnim:new Map}),e[V]}x();function bt(e,t){e&&x().animsByAnim.set(e,t||[])}function vt(e,t){!e||typeof t!="function"||x().resetByAnim.set(e,t)}function Xt(e,t,n){let s=e.elsByAnim.get(t);s||(s=new Set,e.elsByAnim.set(t,s)),s.add(n)}function j(e,t){if(!t||!e||!e.length)return!1;let n=x(),s=new Map;return e.forEach(o=>{var r;if(!o)return;let a=n.ownerByEl.get(o);a&&a!==t&&(s.has(a)||s.set(a,[]),s.get(a).push(o)),n.ownerByEl.set(o,t),Xt(n,t,o),(r=o.setAttribute)==null||r.call(o,"data-motionkit-anim-id",t)}),s.size?(s.forEach((o,a)=>{(n.animsByAnim.get(a)||[]).forEach(l=>{var i;try{(i=l.pause)==null||i.call(l)}catch(d){}});let r=n.resetByAnim.get(a);if(r)try{r(o)}catch(l){console.warn("[motionkit] ownership reset error:",l)}}),!0):!1}function Et(e){let t=x(),n=t.elsByAnim.get(e);n&&(n.forEach(s=>{t.ownerByEl.get(s)===e&&t.ownerByEl.delete(s)}),t.elsByAnim.delete(e)),t.animsByAnim.delete(e),t.resetByAnim.delete(e)}var Wt="data-motionkit-anim-id",Ut=["h1","h2","h3","h4","h5","h6","p","span","div","a","img","video","button","li","ul","ol","section","article","header","footer","nav","main","aside"];function Vt(e){if(!e||typeof e!="string")return"";let t=e.trim();return t.startsWith(".")||t.startsWith("#")||t.startsWith("[")||t.startsWith(":")||t.includes(" ")||t.includes(">")||t.includes(",")||Ut.includes(t.toLowerCase())?t:"."+t}var St=new Set;function jt(e,t,n){let s=e+"|"+t;St.has(s)||(St.add(s),console.warn(`[${e}] ${n}`))}function L(e,t,n){if(!t||typeof t!="string")return[];let s=n||document,o=Vt(t);try{let a=s.querySelectorAll(o);if(a.length||o===t)return[...a]}catch(a){}try{return[...s.querySelectorAll(t)]}catch(a){return jt(e,t,`invalid selector "${t}": ${a.message}`),[]}}function zt(){return{listeners:[],scrollTriggers:[],animations:[],elements:[],tweenRestores:[],structuralRestores:[],splits:[],cleanups:[]}}function g(e,t,n){try{n()}catch(s){console.warn(`[${e}] ${t} teardown error:`,s)}}function _t(e,t,n){n.listeners.forEach(({el:o,type:a,fn:r,opts:l})=>g(e,"listener",()=>o.removeEventListener(a,r,l))),n.scrollTriggers.forEach(o=>g(e,"scrollTrigger",()=>o==null?void 0:o.kill()));let s=typeof window!="undefined"&&window.ScrollTrigger?window.ScrollTrigger.getById(t):null;s&&g(e,"scrollTrigger",()=>s.kill()),n.animations.forEach(o=>g(e,"animation",()=>{var a,r;(a=o==null?void 0:o.revert)==null||a.call(o),(r=o==null?void 0:o.kill)==null||r.call(o)})),n.elements.forEach(o=>g(e,"element",()=>{var a;return(a=o==null?void 0:o.remove)==null?void 0:a.call(o)})),n.tweenRestores.forEach(o=>g(e,"style",o)),n.structuralRestores.forEach(o=>g(e,"style",o)),n.splits.forEach(o=>g(e,"split",()=>{var a;return(a=o==null?void 0:o.revert)==null?void 0:a.call(o)}));for(let o=n.cleanups.length-1;o>=0;o--)g(e,"cleanup",n.cleanups[o])}function Gt(e,t,n,s,o){var a;return{id:t.id,targets:n,data:s,vars:t.vars||{},markers:((a=t.vars)==null?void 0:a.markers)===!0&&yt(),get triggers(){var i;let r=((i=t.trigger)==null?void 0:i.selector)||t.triggerClass,l=r?L(e,r):[];return l.length?l:n},select:(r,l)=>L(e,r,l),on(r,l,i,d){r&&(r.addEventListener(l,i,d),o.listeners.push({el:r,type:l,fn:i,opts:d}))},add(r){return r&&o.animations.push(r),r},addScrollTrigger(r){return r&&o.scrollTriggers.push(r),r},addElement(r){return r&&o.elements.push(r),r},addSplit(r){return r&&o.splits.push(r),r},clearProps(r,l){r&&o.tweenRestores.push(()=>gsap.set(r,{clearProps:l}))},restoreStyle(r,l){if(!r)return;let i={};l.forEach(d=>i[d]=r.style[d]),o.structuralRestores.push(()=>{l.forEach(d=>{var b;return r.style[d]=(b=i[d])!=null?b:""})})},claim(){let r=j(n,t.id);return r&&o.animations.forEach(l=>{var i;try{(i=l.invalidate)==null||i.call(l)}catch(d){}}),r},onCleanup(r){typeof r=="function"&&o.cleanups.push(r)}}}function At(e,t){let n=t.label||e,s=t.requires||["itemClass"];gt(e,function(){let o=new Map;function a(i){let d=o.get(i);d&&(o.delete(i),Et(i),_t(n,i,d))}function r(){for(let i of[...o.keys()])a(i);typeof t.teardownGlobal=="function"&&g(n,"global",t.teardownGlobal)}function l(i){var $,E;if(!i||typeof i!="object"||!ht(i)||s.some(w=>!i[w]))return;let d,b=null;if(typeof t.resolve=="function"){let w=t.resolve(i,{select:(M,q)=>L(n,M,q)});if(Array.isArray(w)?d=w:w&&(d=w.targets,b=($=w.data)!=null?$:null),!d)return}else if(d=L(n,i.itemClass),!d.length)return;if(a(i.id),d.forEach(w=>w.setAttribute(Wt,i.id)),i.mkInert)return;let v=zt(),O=Gt(n,i,d,b,v);try{t.build(i,O)}catch(w){console.error(`[${n}] build failed:`,w),_t(n,i.id,v);return}o.set(i.id,v),bt(i.id,v.animations),vt(i.id,()=>v.tweenRestores.forEach(w=>g(n,"ownership reset",w)));let B=(E=i.trigger)==null?void 0:E.type;B!=="click"&&B!=="hover"&&j(d,i.id)}return{run:l,teardown:r}})}var Kt="motionkit-mk-scroll-cr-pa";At(Kt,{label:"cubeScroll",requires:["itemClass","endSectionClass"],resolve(e,{select:t}){let n=t(e.itemClass)[0];return n?[n]:null},build(e,t){var ft,pt;let{itemClass:n,endSectionClass:s,frontMedia:o,backMedia:a,leftMedia:r,rightMedia:l,topMedia:i,bottomMedia:d,vars:b={}}=e,{cubeMinWidth:v,cubeMaxWidth:O,cubeMaxHeight:B,position:$,expandFace:E,scale:w,cubeAnimStart:M,cubeAnimCStart:q,revealMode:Ct}=b,N=Ct==="cube-to-cube",D=parseFloat(v)||0,Tt=parseFloat(O)||0,xt=parseFloat(B)||0,Bt=parseFloat($)||0,$t=parseFloat(w)||1,f=t.targets[0];f.classList.add("motionkit-skip-selector-full"),f.innerHTML="",t.onCleanup(()=>{f.classList.remove("motionkit-skip-selector-full"),f.innerHTML=""});let m=document.createElement("div");m.className="aab_wc-scroll-container";let C=document.createElement("div");C.className="aab_wc-scene";let T=document.createElement("div");T.className="aab_wc-animation-container",T.style.width=`${D}px`,T.style.height=`${D}px`;let F=document.createElement("div");F.className="aab_wc-cube";let z={front:o,back:a,left:r,right:l,top:i,bottom:d},G=c=>{if(!c)return null;if(typeof c=="string"){let u=/^data:video\//i.test(c)||/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(c);return{url:c,type:u?"video":"image"}}return typeof c=="object"&&c.url?{url:c.url,type:c.type||"image"}:null},Mt=c=>{let u=G(z[c]);return u?u.type==="video"?`
          <div class="aab_wc-video-player">
            <video class="aab_wc-video" data-face="${c}" muted loop playsinline>
              <source src="${u.url}" type="video/mp4" />
            </video>
          </div>
        `:`<img src="${u.url}" alt="${c}" />`:""};[{class:"aab_wc-front",name:"front"},{class:"aab_wc-back",name:"back"},{class:"aab_wc-right",name:"right"},{class:"aab_wc-left",name:"left"},{class:"aab_wc-top",name:"top"},{class:"aab_wc-bottom",name:"bottom"}].forEach(c=>{let u=document.createElement("div");u.className=`aab_wc-face ${c.class}`,u.innerHTML=Mt(c.name),F.appendChild(u)});let k=document.createElement("button");k.className="aab_wc-video-control",k.type="button",k.textContent="Play",T.appendChild(F),C.appendChild(T),C.appendChild(k),m.appendChild(C),f.appendChild(m);let K={front:{rotationY:0,rotationX:0},back:{rotationY:180,rotationX:0},right:{rotationY:-90,rotationX:0},left:{rotationY:90,rotationX:0},top:{rotationY:0,rotationX:-90},bottom:{rotationY:0,rotationX:90}},I=K[E]||K.front,R={rotationX:-30,rotationY:45},kt=Object.entries({front:"",back:"rotateY(180deg) ",right:"rotateY(90deg) ",left:"rotateY(-90deg) ",top:"rotateX(90deg) ",bottom:"rotateX(-90deg) "}).map(([c,u])=>`${n} .aab_wc-${c} { transform: ${u}translateZ(${D/2}px); }`).join(`
      `),Z=document.createElement("style");Z.textContent=`
      ${n} { margin: 0; padding: 0; box-sizing: border-box; }
      ${n} .aab_wc-scroll-container {
        position: relative;
        z-index: 100;
      }
      ${n} .aab_wc-scene {
        width: 100%;
        display: flex;
        justify-content: center;
        position: relative;
      }
      ${n} .aab_wc-animation-container {
        position: relative;
        transform-style: preserve-3d;
        perspective: 1000px;
      }
      ${n} .aab_wc-cube {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transform: rotateX(${R.rotationX}deg) rotateY(${R.rotationY}deg);
      }
      ${n} .aab_wc-face {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        backface-visibility: hidden;
        overflow: hidden;
      }
      ${n} .aab_wc-face img { width: 100%; height: 100%; object-fit: cover; }
      ${kt}
      ${n} .aab_wc-video-player {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        overflow: hidden;
      }
      ${n} .aab_wc-video { width: 100%; height: 100%; object-fit: cover; }
      ${n} .aab_wc-video-control {
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
      ${n} .aab_wc-animation-container:hover + .aab_wc-video-control,
      ${n} .aab_wc-video-control:hover { opacity: 1; }
    `,f.appendChild(Z);let P=f.querySelector(".aab_wc-video-control"),J=f.querySelector(".aab_wc-animation-container"),Q=f.querySelector(".aab_wc-cube"),tt=f.querySelector(".aab_wc-front"),et=f.querySelector(".aab_wc-back"),ot=f.querySelector(".aab_wc-right"),nt=f.querySelector(".aab_wc-left"),rt=f.querySelector(".aab_wc-top"),it=f.querySelector(".aab_wc-bottom"),Rt=f.querySelectorAll(".aab_wc-face"),X=G(z[E]),st=(X==null?void 0:X.type)==="video",S=st?f.querySelector(`.aab_wc-video[data-face="${E}"]`):null,at=[tt,et,ot,nt,rt,it],Pt={front:tt,back:et,right:ot,left:nt,top:rt,bottom:it},Yt=at.filter(c=>c!==Pt[E]),Y=null;if(s){try{Y=document.querySelector(s)}catch(c){console.warn(`[cubeScroll] invalid endSectionClass "${s}":`,c.message)}Y||console.warn(`[cubeScroll] endSectionClass "${s}" matched no element \u2014 falling back to 1.5 viewports of scroll.`)}let H=null,Ht=c=>{if(H!==null)return H;if(!p||!p.getChildren().length)return 0;let u=p.progress();p.progress(c);let h=m.getBoundingClientRect().bottom,_=h;for(let A of at){if(!A||parseFloat(getComputedStyle(A).opacity)<.05)continue;let wt=A.getBoundingClientRect().bottom;wt>_&&(_=wt)}return p.progress(u),H=_-h,H},Lt=c=>{let u=m.getBoundingClientRect(),A=u.top+window.scrollY-c.start+u.height+Ht(N?0:1);return isFinite(A)?Math.min(window.innerHeight,Math.max(0,A)):window.innerHeight},ct=24,lt=Y?{endTrigger:Y,end:c=>`top ${Math.max(ct,Lt(c)-ct)}px`}:{end:()=>"+="+window.innerHeight*1.5},ut=M==="custom"?q:M||"center center",p=t.add(gsap.timeline({scrollTrigger:{trigger:m,start:ut,...lt,scrub:1,pin:!0,pinSpacing:!1,invalidateOnRefresh:!0}}));t.addScrollTrigger(p.scrollTrigger);let dt=1;p.to(J,{scale:$t,duration:.6},0),p.to(C,{x:Bt,duration:.6},0),N?p.to(Q,{rotationY:R.rotationY+(dt+1)*360,rotationX:R.rotationX,rotate:0,duration:2.3,ease:"none"},0):(p.to(Q,{rotationY:I.rotationY+dt*360,rotationX:I.rotationX,rotate:0,duration:1.8,ease:"none"},0),p.to(J,{width:Tt,height:xt,scale:1,duration:.5},1.8),p.to(Rt,{scale:.9,duration:.5},1.8),p.to(Yt,{opacity:0,duration:.4},1.85));let W=()=>p.progress()>=.7;if(st&&S&&!N){let c=()=>{S.play().catch(_=>console.warn("[cubeScroll] video play failed:",_)),P.textContent="Pause"},u=()=>{S.pause(),P.textContent="Play"},h=()=>W()&&c();p.to(P,{display:"block",duration:.1},1.5),p.eventCallback("onUpdate",()=>{W()&&S.paused?c():!W()&&!S.paused&&u()}),t.addScrollTrigger(window.ScrollTrigger.create({trigger:m,start:ut,...lt,invalidateOnRefresh:!0,onEnter:h,onEnterBack:h,onLeave:u,onLeaveBack:u})),t.on(P,"click",()=>S.paused?c():u())}window.ScrollTrigger&&(window.ScrollTrigger.refresh(),(pt=(ft=document.fonts)==null?void 0:ft.ready)==null||pt.then(()=>window.ScrollTrigger.refresh()).catch(()=>{}),m.querySelectorAll("img").forEach(u=>{if(u.complete)return;let h=()=>window.ScrollTrigger.refresh();t.on(u,"load",h,{once:!0}),t.on(u,"error",h,{once:!0})}))}});})();
