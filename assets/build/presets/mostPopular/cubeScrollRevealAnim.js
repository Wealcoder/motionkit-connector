(()=>{var W="__motionkitPresetHandlers";function Xe(){return typeof window=="undefined"?new Map:(window[W]||(window[W]=new Map),window[W])}function ge(t,e){if(!t||typeof e!="function")return;let n=Xe();if(n.has(t))return;let s=e()||{};n.set(t,{key:t,run:typeof s.run=="function"?s.run:function(){},teardown:typeof s.teardown=="function"?s.teardown:function(){}})}var E={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},Ue=[E.DRAFT,E.SAVED,E.PUBLISHED],We="preview";function Ve(t){return!t||typeof t!="object"?E.PUBLISHED:Ue.indexOf(t.status)!==-1?t.status:t.status===We||t.isPublished===!1?E.SAVED:E.PUBLISHED}function me(t){return Ve(t)!==E.DRAFT}function je(){return typeof window=="undefined"?{}:window.__motionkitHostData||window.motionkitData||{}}function ye(){return je().motionkit_token||null}var be=()=>typeof window=="undefined"?!1:window.location.search.includes("action=motionkit-editor")?!0:!!ye();var V="__motionkitOwnership";function M(){let t=typeof window!="undefined"?window:globalThis;return t[V]||(t[V]={ownerByEl:new WeakMap,elsByAnim:new Map,animsByAnim:new Map,resetByAnim:new Map}),t[V]}M();function Ee(t,e){t&&M().animsByAnim.set(t,e||[])}function ve(t,e){!t||typeof e!="function"||M().resetByAnim.set(t,e)}function Ge(t,e,n){let s=t.elsByAnim.get(e);s||(s=new Set,t.elsByAnim.set(e,s)),s.add(n)}function j(t,e){if(!e||!t||!t.length)return!1;let n=M(),s=new Map;return t.forEach(o=>{var r;if(!o)return;let c=n.ownerByEl.get(o);c&&c!==e&&(s.has(c)||s.set(c,[]),s.get(c).push(o)),n.ownerByEl.set(o,e),Ge(n,e,o),(r=o.setAttribute)==null||r.call(o,"data-motionkit-anim-id",e)}),s.size?(s.forEach((o,c)=>{(n.animsByAnim.get(c)||[]).forEach(l=>{var i;try{(i=l.pause)==null||i.call(l)}catch(f){}});let r=n.resetByAnim.get(c);if(r)try{r(o)}catch(l){console.warn("[motionkit] ownership reset error:",l)}}),!0):!1}function Se(t){let e=M(),n=e.elsByAnim.get(t);n&&(n.forEach(s=>{e.ownerByEl.get(s)===t&&e.ownerByEl.delete(s)}),e.elsByAnim.delete(t)),e.animsByAnim.delete(t),e.resetByAnim.delete(t)}var G="__motionkitScreen";function Ae(t){let e=t||(typeof window!="undefined"?window:null);return e?(e[G]||(e[G]={held:!1,queue:[],deadline:12e3}),e[G]):{held:!1,queue:[],deadline:12e3}}function _e(t){try{t()}catch(e){console.error("[motionkit] a screen-release waiter threw",e)}}function Te(t){return Ae(t).held===!0}function xe(t,e){let n=Ae(t);if(!n.held){_e(e);return}let s=!1,o=()=>{s||(s=!0,_e(e))};n.queue.push(o);let c=t||window;c&&typeof c.setTimeout=="function"&&c.setTimeout(o,n.deadline+400)}var ze="data-motionkit-anim-id",Ke=["h1","h2","h3","h4","h5","h6","p","span","div","a","img","video","button","li","ul","ol","section","article","header","footer","nav","main","aside"];function Ie(t){if(!t||typeof t!="string")return"";let e=t.trim();return e.startsWith(".")||e.startsWith("#")||e.startsWith("[")||e.startsWith(":")||e.includes(" ")||e.includes(">")||e.includes(",")||Ke.includes(e.toLowerCase())?e:"."+e}var Ce=new Set;function Ze(t,e,n){let s=t+"|"+e;Ce.has(s)||(Ce.add(s),console.warn(`[${t}] ${n}`))}function P(t,e,n){if(!e||typeof e!="string")return[];let s=n||document,o=Ie(e);try{let c=s.querySelectorAll(o);if(c.length||o===e)return[...c]}catch(c){}try{return[...s.querySelectorAll(e)]}catch(c){return Ze(t,e,`invalid selector "${e}": ${c.message}`),[]}}function Je(){return{listeners:[],scrollTriggers:[],animations:[],elements:[],tweenRestores:[],structuralRestores:[],splits:[],cleanups:[]}}function h(t,e,n){try{n()}catch(s){console.warn(`[${t}] ${e} teardown error:`,s)}}function Be(t,e,n){n.listeners.forEach(({el:o,type:c,fn:r,opts:l})=>h(t,"listener",()=>o.removeEventListener(c,r,l))),n.scrollTriggers.forEach(o=>h(t,"scrollTrigger",()=>o==null?void 0:o.kill()));let s=typeof window!="undefined"&&window.ScrollTrigger?window.ScrollTrigger.getById(e):null;s&&h(t,"scrollTrigger",()=>s.kill()),n.animations.forEach(o=>h(t,"animation",()=>{var c,r;(c=o==null?void 0:o.revert)==null||c.call(o),(r=o==null?void 0:o.kill)==null||r.call(o)})),n.elements.forEach(o=>h(t,"element",()=>{var c;return(c=o==null?void 0:o.remove)==null?void 0:c.call(o)})),n.tweenRestores.forEach(o=>h(t,"style",o)),n.structuralRestores.forEach(o=>h(t,"style",o)),n.splits.forEach(o=>h(t,"split",()=>{var c;return(c=o==null?void 0:o.revert)==null?void 0:c.call(o)}));for(let o=n.cleanups.length-1;o>=0;o--)h(t,"cleanup",n.cleanups[o])}function Qe(t,e,n,s,o){var c;return{id:e.id,targets:n,data:s,vars:e.vars||{},markers:((c=e.vars)==null?void 0:c.markers)===!0&&be(),get triggers(){var i;let r=((i=e.trigger)==null?void 0:i.selector)||e.triggerClass,l=r?P(t,r):[];return l.length?l:n},select:(r,l)=>P(t,r,l),on(r,l,i,f){r&&(r.addEventListener(l,i,f),o.listeners.push({el:r,type:l,fn:i,opts:f}))},add(r){return r&&o.animations.push(r),r},addScrollTrigger(r){return r&&o.scrollTriggers.push(r),r},addElement(r){return r&&o.elements.push(r),r},addSplit(r){return r&&o.splits.push(r),r},clearProps(r,l){r&&o.tweenRestores.push(()=>gsap.set(r,{clearProps:l}))},restoreStyle(r,l){if(!r)return;let i={};l.forEach(f=>i[f]=r.style[f]),o.structuralRestores.push(()=>{l.forEach(f=>{var v;return r.style[f]=(v=i[f])!=null?v:""})})},claim(){let r=j(n,e.id);return r&&o.animations.forEach(l=>{var i;try{(i=l.invalidate)==null||i.call(l)}catch(f){}}),r},onCleanup(r){typeof r=="function"&&o.cleanups.push(r)}}}function Me(t,e){let n=e.label||t,s=e.requires||["itemClass"];ge(t,function(){let o=new Map;function c(i){let f=o.get(i);f&&(o.delete(i),Se(i),Be(n,i,f))}function r(){for(let i of[...o.keys()])c(i);typeof e.teardownGlobal=="function"&&h(n,"global",e.teardownGlobal)}function l(i){var k,S;if(!i||typeof i!="object"||!me(i)||s.some(u=>!i[u]))return;let f,v=null;if(typeof e.resolve=="function"){let u=e.resolve(i,{select:(m,q)=>P(n,m,q)});if(Array.isArray(u)?f=u:u&&(f=u.targets,v=(k=u.data)!=null?k:null),!f)return}else if(f=P(n,i.itemClass),!f.length)return;if(c(i.id),f.forEach(u=>u.setAttribute(ze,i.id)),i.mkInert)return;let g=Je(),Y=Qe(n,i,f,v,g);try{e.build(i,Y)}catch(u){console.error(`[${n}] build failed:`,u),Be(n,i.id,g);return}o.set(i.id,g),Ee(i.id,g.animations),ve(i.id,()=>g.tweenRestores.forEach(u=>h(n,"ownership reset",u)));let x=(S=i.trigger)==null?void 0:S.type;x!=="click"&&x!=="hover"&&j(f,i.id),x==="page_load"&&Te(window)&&(g.animations.forEach(u=>h(n,"screen gate pause",()=>{var m;return(m=u==null?void 0:u.pause)==null?void 0:m.call(u)})),xe(window,()=>{o.get(i.id)===g&&g.animations.forEach(u=>h(n,"screen gate play",()=>{var m;return(m=u==null?void 0:u.play)==null?void 0:m.call(u,0)}))}))}return{run:l,teardown:r}})}var et="motionkit-mk-scroll-cr-pa";Me(et,{label:"cubeScroll",requires:["itemClass","endSectionClass"],resolve(t,{select:e}){let n=e(t.itemClass)[0];return n?[n]:null},build(t,e){var pe,we;let{itemClass:n,endSectionClass:s,frontMedia:o,backMedia:c,leftMedia:r,rightMedia:l,topMedia:i,bottomMedia:f,vars:v={}}=t,{cubeMinWidth:g,cubeMaxWidth:Y,cubeMaxHeight:x,position:k,expandFace:S,scale:u,cubeAnimStart:m,cubeAnimCStart:q,revealMode:ke}=v,N=ke==="cube-to-cube",F=parseFloat(g)||0,$e=parseFloat(Y)||0,Re=parseFloat(x)||0,Le=parseFloat(k)||0,De=parseFloat(u)||1,p=e.targets[0];p.classList.add("motionkit-skip-selector-full"),p.innerHTML="",e.onCleanup(()=>{p.classList.remove("motionkit-skip-selector-full"),p.innerHTML=""});let b=document.createElement("div");b.className="aab_wc-scroll-container";let C=document.createElement("div");C.className="aab_wc-scene";let B=document.createElement("div");B.className="aab_wc-animation-container",B.style.width=`${F}px`,B.style.height=`${F}px`;let O=document.createElement("div");O.className="aab_wc-cube";let z={front:o,back:c,left:r,right:l,top:i,bottom:f},K=a=>{if(!a)return null;if(typeof a=="string"){let d=/^data:video\//i.test(a)||/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(a);return{url:a,type:d?"video":"image"}}return typeof a=="object"&&a.url?{url:a.url,type:a.type||"image"}:null},He=a=>{let d=K(z[a]);return d?d.type==="video"?`
          <div class="aab_wc-video-player">
            <video class="aab_wc-video" data-face="${a}" muted loop playsinline>
              <source src="${d.url}" type="video/mp4" />
            </video>
          </div>
        `:`<img src="${d.url}" alt="${a}" />`:""};[{class:"aab_wc-front",name:"front"},{class:"aab_wc-back",name:"back"},{class:"aab_wc-right",name:"right"},{class:"aab_wc-left",name:"left"},{class:"aab_wc-top",name:"top"},{class:"aab_wc-bottom",name:"bottom"}].forEach(a=>{let d=document.createElement("div");d.className=`aab_wc-face ${a.class}`,d.innerHTML=He(a.name),O.appendChild(d)});let $=document.createElement("button");$.className="aab_wc-video-control",$.type="button",$.textContent="Play",B.appendChild(O),C.appendChild(B),C.appendChild($),b.appendChild(C),p.appendChild(b);let I={front:{rotationY:0,rotationX:0},back:{rotationY:180,rotationX:0},right:{rotationY:-90,rotationX:0},left:{rotationY:90,rotationX:0},top:{rotationY:0,rotationX:-90},bottom:{rotationY:0,rotationX:90}},Z=I[S]||I.front,R={rotationX:-30,rotationY:45},Pe=Object.entries({front:"",back:"rotateY(180deg) ",right:"rotateY(90deg) ",left:"rotateY(-90deg) ",top:"rotateX(90deg) ",bottom:"rotateX(-90deg) "}).map(([a,d])=>`${n} .aab_wc-${a} { transform: ${d}translateZ(${F/2}px); }`).join(`
      `),J=document.createElement("style");J.textContent=`
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
      ${Pe}
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
    `,p.appendChild(J);let L=p.querySelector(".aab_wc-video-control"),Q=p.querySelector(".aab_wc-animation-container"),ee=p.querySelector(".aab_wc-cube"),te=p.querySelector(".aab_wc-front"),oe=p.querySelector(".aab_wc-back"),ne=p.querySelector(".aab_wc-right"),re=p.querySelector(".aab_wc-left"),ie=p.querySelector(".aab_wc-top"),se=p.querySelector(".aab_wc-bottom"),Ye=p.querySelectorAll(".aab_wc-face"),X=K(z[S]),ce=(X==null?void 0:X.type)==="video",_=ce?p.querySelector(`.aab_wc-video[data-face="${S}"]`):null,ae=[te,oe,ne,re,ie,se],qe={front:te,back:oe,right:ne,left:re,top:ie,bottom:se},Ne=ae.filter(a=>a!==qe[S]),D=null;if(s){try{D=document.querySelector(s)}catch(a){console.warn(`[cubeScroll] invalid endSectionClass "${s}":`,a.message)}D||console.warn(`[cubeScroll] endSectionClass "${s}" matched no element \u2014 falling back to 1.5 viewports of scroll.`)}let H=null,Fe=a=>{if(H!==null)return H;if(!w||!w.getChildren().length)return 0;let d=w.progress();w.progress(a);let y=b.getBoundingClientRect().bottom,A=y;for(let T of ae){if(!T||parseFloat(getComputedStyle(T).opacity)<.05)continue;let he=T.getBoundingClientRect().bottom;he>A&&(A=he)}return w.progress(d),H=A-y,H},Oe=a=>{let d=b.getBoundingClientRect(),T=d.top+window.scrollY-a.start+d.height+Fe(N?0:1);return isFinite(T)?Math.min(window.innerHeight,Math.max(0,T)):window.innerHeight},le=24,ue=D?{endTrigger:D,end:a=>`top ${Math.max(le,Oe(a)-le)}px`}:{end:()=>"+="+window.innerHeight*1.5},de=m==="custom"?q:m||"center center",w=e.add(gsap.timeline({scrollTrigger:{trigger:b,start:de,...ue,scrub:1,pin:!0,pinSpacing:!1,invalidateOnRefresh:!0}}));e.addScrollTrigger(w.scrollTrigger);let fe=1;w.to(Q,{scale:De,duration:.6},0),w.to(C,{x:Le,duration:.6},0),N?w.to(ee,{rotationY:R.rotationY+(fe+1)*360,rotationX:R.rotationX,rotate:0,duration:2.3,ease:"none"},0):(w.to(ee,{rotationY:Z.rotationY+fe*360,rotationX:Z.rotationX,rotate:0,duration:1.8,ease:"none"},0),w.to(Q,{width:$e,height:Re,scale:1,duration:.5},1.8),w.to(Ye,{scale:.9,duration:.5},1.8),w.to(Ne,{opacity:0,duration:.4},1.85));let U=()=>w.progress()>=.7;if(ce&&_&&!N){let a=()=>{_.play().catch(A=>console.warn("[cubeScroll] video play failed:",A)),L.textContent="Pause"},d=()=>{_.pause(),L.textContent="Play"},y=()=>U()&&a();w.to(L,{display:"block",duration:.1},1.5),w.eventCallback("onUpdate",()=>{U()&&_.paused?a():!U()&&!_.paused&&d()}),e.addScrollTrigger(window.ScrollTrigger.create({trigger:b,start:de,...ue,invalidateOnRefresh:!0,onEnter:y,onEnterBack:y,onLeave:d,onLeaveBack:d})),e.on(L,"click",()=>_.paused?a():d())}window.ScrollTrigger&&(window.ScrollTrigger.refresh(),(we=(pe=document.fonts)==null?void 0:pe.ready)==null||we.then(()=>window.ScrollTrigger.refresh()).catch(()=>{}),b.querySelectorAll("img").forEach(d=>{if(d.complete)return;let y=()=>window.ScrollTrigger.refresh();e.on(d,"load",y,{once:!0}),e.on(d,"error",y,{once:!0})}))}});})();
