(()=>{var L="__motionkitPresetHandlers";function oe(){return typeof window=="undefined"?new Map:(window[L]||(window[L]=new Map),window[L])}function q(e,t){if(!e||typeof t!="function")return;let o=oe();if(o.has(e))return;let s=t()||{};o.set(e,{key:e,run:typeof s.run=="function"?s.run:function(){},teardown:typeof s.teardown=="function"?s.teardown:function(){}})}var E={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},ne=[E.DRAFT,E.SAVED,E.PUBLISHED],re="preview";function ie(e){return!e||typeof e!="object"?E.PUBLISHED:ne.indexOf(e.status)!==-1?e.status:e.status===re||e.isPublished===!1?E.SAVED:E.PUBLISHED}function O(e){return ie(e)!==E.DRAFT}function se(){return typeof window=="undefined"?{}:window.__motionkitHostData||window.motionkitData||{}}function H(){return se().motionkit_token||null}var $=()=>typeof window=="undefined"?!1:window.location.search.includes("action=motionkit-editor")?!0:!!H();var P="__motionkitOwnership";function x(){let e=typeof window!="undefined"?window:globalThis;return e[P]||(e[P]={ownerByEl:new WeakMap,elsByAnim:new Map,animsByAnim:new Map,resetByAnim:new Map}),e[P]}x();function F(e,t){e&&x().animsByAnim.set(e,t||[])}function K(e,t){!e||typeof t!="function"||x().resetByAnim.set(e,t)}function ae(e,t,o){let s=e.elsByAnim.get(t);s||(s=new Set,e.elsByAnim.set(t,s)),s.add(o)}function B(e,t){if(!t||!e||!e.length)return!1;let o=x(),s=new Map;return e.forEach(n=>{var a;if(!n)return;let u=o.ownerByEl.get(n);u&&u!==t&&(s.has(u)||s.set(u,[]),s.get(u).push(n)),o.ownerByEl.set(n,t),ae(o,t,n),(a=n.setAttribute)==null||a.call(n,"data-motionkit-anim-id",t)}),s.size?(s.forEach((n,u)=>{(o.animsByAnim.get(u)||[]).forEach(d=>{var c;try{(c=d.pause)==null||c.call(d)}catch(i){}});let a=o.resetByAnim.get(u);if(a)try{a(n)}catch(d){console.warn("[motionkit] ownership reset error:",d)}}),!0):!1}function U(e){let t=x(),o=t.elsByAnim.get(e);o&&(o.forEach(s=>{t.ownerByEl.get(s)===e&&t.ownerByEl.delete(s)}),t.elsByAnim.delete(e)),t.animsByAnim.delete(e),t.resetByAnim.delete(e)}var M="__motionkitScreen";function Y(e){let t=e||(typeof window!="undefined"?window:null);return t?(t[M]||(t[M]={held:!1,queue:[],deadline:12e3}),t[M]):{held:!1,queue:[],deadline:12e3}}function W(e){try{e()}catch(t){console.error("[motionkit] a screen-release waiter threw",t)}}function G(e){return Y(e).held===!0}function I(e,t){let o=Y(e);if(!o.held){W(t);return}let s=!1,n=()=>{s||(s=!0,W(t))};o.queue.push(n);let u=e||window;u&&typeof u.setTimeout=="function"&&u.setTimeout(n,o.deadline+400)}var C="__motionkitSplits",X="__no_owner__";function D(){let e=typeof window!="undefined"?window:globalThis;return e[C]||(e[C]={bySig:new Map,elKeys:new WeakMap,seq:0}),e[C]}function ce(e){if(typeof e=="string")return e;if(!e||e.nodeType!==1)return String(e);let t=D(),o=t.elKeys.get(e);return o||(t.seq+=1,o=`__el${t.seq}`,t.elKeys.set(e,o)),o}function le(e,t){return`${ce(e)}::${JSON.stringify(t||{})}`}function ue(e,t){if(typeof SplitText=="undefined")return null;try{return typeof SplitText.create=="function"?SplitText.create(e,t):new SplitText(e,t)}catch(o){return console.warn("[motionkit] SplitText failed for",e,o),null}}function pe(e){var t,o;try{(o=(t=e.split)==null?void 0:t.revert)==null||o.call(t)}catch(s){}}function Z(e,t,o){if(!t)return null;let s=e||X,n=D(),u=le(t,o),a=n.bySig.get(u);if(a)return a.owners.add(s),a;let d=null;if(n.bySig.forEach(r=>{!d&&r.target===t&&(d=r)}),d)return d.owners.add(s),d;let c=ue(t,o);if(!c)return null;let i={split:c,target:t,sig:u,owners:new Set([s])};return n.bySig.set(u,i),i}function z(e){let t=e||X,o=D();o.bySig.forEach((s,n)=>{s.owners.has(t)&&(s.owners.delete(t),s.owners.size===0&&(pe(s),o.bySig.delete(n)))})}function de(e){return typeof e!="string"||e.includes("chars")?"chars":e.includes("words")?"words":e.includes("lines")?"lines":"chars"}function V(e,t){var s,n;if(!e)return null;let o=de(t);if((s=e[o])!=null&&s.length)return e[o];for(let u of["chars","words","lines"])if((n=e[u])!=null&&n.length)return e[u];return null}var fe="data-motionkit-anim-id",me=["h1","h2","h3","h4","h5","h6","p","span","div","a","img","video","button","li","ul","ol","section","article","header","footer","nav","main","aside"];function he(e){if(!e||typeof e!="string")return"";let t=e.trim();return t.startsWith(".")||t.startsWith("#")||t.startsWith("[")||t.startsWith(":")||t.includes(" ")||t.includes(">")||t.includes(",")||me.includes(t.toLowerCase())?t:"."+t}var j=new Set;function we(e,t,o){let s=e+"|"+t;j.has(s)||(j.add(s),console.warn(`[${e}] ${o}`))}function _(e,t,o){if(!t||typeof t!="string")return[];let s=o||document,n=he(t);try{let u=s.querySelectorAll(n);if(u.length||n===t)return[...u]}catch(u){}try{return[...s.querySelectorAll(t)]}catch(u){return we(e,t,`invalid selector "${t}": ${u.message}`),[]}}function ge(){return{listeners:[],scrollTriggers:[],animations:[],elements:[],tweenRestores:[],structuralRestores:[],cleanups:[]}}function k(e,t,o){try{o()}catch(s){console.warn(`[${e}] ${t} teardown error:`,s)}}function J(e,t,o){o.listeners.forEach(({el:n,type:u,fn:a,opts:d})=>k(e,"listener",()=>n.removeEventListener(u,a,d))),o.scrollTriggers.forEach(n=>k(e,"scrollTrigger",()=>n==null?void 0:n.kill()));let s=typeof window!="undefined"&&window.ScrollTrigger?window.ScrollTrigger.getById(t):null;s&&k(e,"scrollTrigger",()=>s.kill()),o.animations.forEach(n=>k(e,"animation",()=>{var u,a;(u=n==null?void 0:n.revert)==null||u.call(n),(a=n==null?void 0:n.kill)==null||a.call(n)})),o.elements.forEach(n=>k(e,"element",()=>{var u;return(u=n==null?void 0:n.remove)==null?void 0:u.call(n)})),o.tweenRestores.forEach(n=>k(e,"style",n)),o.structuralRestores.forEach(n=>k(e,"style",n)),k(e,"split",()=>z(t));for(let n=o.cleanups.length-1;n>=0;n--)k(e,"cleanup",o.cleanups[n])}function ye(e,t,o,s,n){var u;return{id:t.id,targets:o,data:s,vars:t.vars||{},markers:((u=t.vars)==null?void 0:u.markers)===!0&&$(),get triggers(){var c;let a=((c=t.trigger)==null?void 0:c.selector)||t.triggerClass,d=a?_(e,a):[];return d.length?d:o},select:(a,d)=>_(e,a,d),on(a,d,c,i){a&&(a.addEventListener(d,c,i),n.listeners.push({el:a,type:d,fn:c,opts:i}))},add(a){return a&&n.animations.push(a),a},addScrollTrigger(a){return a&&n.scrollTriggers.push(a),a},addElement(a){return a&&n.elements.push(a),a},split(a,d){let c=Z(t.id,a,d);return c?V(c.split,d==null?void 0:d.type)||[]:[]},clearProps(a,d){a&&n.tweenRestores.push(()=>gsap.set(a,{clearProps:d}))},restoreStyle(a,d){if(!a)return;let c={};d.forEach(i=>c[i]=a.style[i]),n.structuralRestores.push(()=>{d.forEach(i=>{var r;return a.style[i]=(r=c[i])!=null?r:""})})},claim(){let a=B(o,t.id);return a&&n.animations.forEach(d=>{var c;try{(c=d.invalidate)==null||c.call(d)}catch(i){}}),a},onCleanup(a){typeof a=="function"&&n.cleanups.push(a)}}}function Q(e,t){let o=t.label||e,s=t.requires||["itemClass"];q(e,function(){let n=new Map;function u(c){let i=n.get(c);i&&(n.delete(c),U(c),J(o,c,i))}function a(){for(let c of[...n.keys()])u(c);typeof t.teardownGlobal=="function"&&k(o,"global",t.teardownGlobal)}function d(c){var h,y;if(!c||typeof c!="object"||!O(c)||s.some(f=>!c[f]))return;let i,r=null;if(typeof t.resolve=="function"){let f=t.resolve(c,{select:(m,g)=>_(o,m,g)});if(Array.isArray(f)?i=f:f&&(i=f.targets,r=(h=f.data)!=null?h:null),!i)return}else if(i=_(o,c.itemClass),!i.length)return;if(u(c.id),i.forEach(f=>f.setAttribute(fe,c.id)),c.mkInert)return;let l=ge(),p=ye(o,c,i,r,l);try{t.build(c,p)}catch(f){console.error(`[${o}] build failed:`,f),J(o,c.id,l);return}n.set(c.id,l),F(c.id,l.animations),K(c.id,()=>l.tweenRestores.forEach(f=>k(o,"ownership reset",f)));let w=(y=c.trigger)==null?void 0:y.type;w!=="click"&&w!=="hover"&&B(i,c.id),w==="page_load"&&G(window)&&(l.animations.forEach(f=>k(o,"screen gate pause",()=>{var m;return(m=f==null?void 0:f.pause)==null?void 0:m.call(f)})),I(window,()=>{n.get(c.id)===l&&l.animations.forEach(f=>k(o,"screen gate play",()=>{var m;return(m=f==null?void 0:f.play)==null?void 0:m.call(f,0)}))}))}return{run:d,teardown:a}})}var ve="motionkit-mk-popup-media-pa",A="motionkit-popup-media",ke=`
  :host {
    display: contents;
  }
  .motionkit-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    overflow-y: auto;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    /* The overlay lingers in the DOM through the fade-out; without this the browser can pick it as a scroll anchor and shift the page after the body lock is released. */
    overflow-anchor: none;
  }
  .motionkit-popup-content {
    background-color: transparent;
    position: relative;
    max-width: 90%;
    max-height: 90%;
    width: 50vw;
    margin: 20px auto;
  }
  /* The image itself is the sizing driver, so the box shrink-wraps it instead of forcing 50vw and distorting the shape; max-* stay unset here so they cannot clamp the box below the image it wraps. */
  .motionkit-popup-content.motionkit-popup-content--image {
    width: auto;
    max-width: none;
    max-height: none;
    line-height: 0;
  }
  @media (max-width: 768px) {
    .motionkit-popup-content { width: 90vw; }
    .motionkit-popup-content.motionkit-popup-content--image { width: auto; }
  }
  .motionkit-popup-close {
    position: absolute;
    top: -25px;
    right: 0px;
    width: 20px;
    height: 20px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    z-index: 1001;
  }
  .motionkit-popup-close:hover,
  .motionkit-popup-close:focus,
  .motionkit-popup-close:active {
    background-color: transparent;
    outline: none;
    box-shadow: none;
  }
  .motionkit-popup-close::before,
  .motionkit-popup-close::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: #ffffff;
    transition: background-color 0.3s ease;
  }
  .motionkit-popup-close::before { transform: rotate(45deg); }
  .motionkit-popup-close::after  { transform: rotate(-45deg); }
  .motionkit-popup-close:hover::before,
  .motionkit-popup-close:hover::after { background-color: #ff0000; }
  /* height drives the upscale so a small image actually grows to fill the viewport; width:auto derives the matching width from the intrinsic ratio, and the max-* caps rein in wide/landscape images before they overflow. max-width wins over height here, so a landscape image shrinks to fit rather than being cropped. */
  .motionkit-popup-media {
    display: block;
    width: auto;
    height: 70vh;
    max-width: 70vw;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 10px;
  }
  /* Must come after the base rule above, not in the earlier media block, or equal specificity would let 85vw win. */
  @media (max-width: 768px) {
    .motionkit-popup-media {
      max-width: 92vw;
      height: 80vh;
      max-height: 80vh;
    }
  }
  .motionkit-popup-video-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 56.25%;
  }
  .motionkit-popup-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    object-fit: cover;
    cursor: pointer;
  }
  .motionkit-youtube-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
  .motionkit-popup-play-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s ease;
    z-index: 10;
    border: none;
    padding: 0;
  }
  .motionkit-popup-play-btn:hover {
    background-color: rgba(0, 0, 0, 0.9);
    transform: translate(-50%, -50%) scale(1.1);
  }
  .motionkit-popup-play-btn::after {
    content: '';
    border-style: solid;
    border-width: 15px 0 15px 26px;
    border-color: transparent transparent transparent #ffffff;
    margin-left: 5px;
  }
  .motionkit-popup-play-btn.motionkit-playing::after {
    content: '';
    width: 30px;
    height: 30px;
    background: linear-gradient(to right, #fff 30%, transparent 30%, transparent 70%, #fff 70%);
    border: none;
    margin-left: 0;
  }
  .motionkit-popup-video-wrapper {
    position: relative;
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
  }
  .motionkit-youtube-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 56.25%;
  }
`;if(typeof window!="undefined"&&!customElements.get(A)){class e extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}}customElements.define(A,e)}function N(){var e,t;return((t=(e=window.ScrollSmoother)==null?void 0:e.get)==null?void 0:t.call(e))||null}function be(e){let t=e.getBoundingClientRect(),o=window.innerHeight||document.documentElement.clientHeight,s=window.innerWidth||document.documentElement.clientWidth;return t.bottom>0&&t.top<o&&t.right>0&&t.left<s}function Ee(e){let t=N();if(t){t.paused(!0);return}let o=document.body.style;o.overflow="hidden",o.height="100%",o.position="fixed",o.width="100%",o.top=`-${e}px`}function ee(){let e=N();if(e){e.paused(!1);return}let t=document.body.style;t.overflow="",t.height="",t.position="",t.width="",t.top=""}(function(){function t(i){let r=[/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,/(?:youtube\.com\/embed\/)([^?]+)/,/(?:youtube\.com\/v\/)([^?]+)/,/(?:youtube\.com\/watch\?.*v=)([^&]+)/];for(let l of r){let p=i.match(l);if(p&&p[1])return p[1]}return null}function o(i){let r={from:{scale:.7,opacity:0},to:{scale:1,opacity:1,duration:.4,ease:"back.out(1.7)"}};switch(i){case"left":r.from.x="-100%",r.to.x="0%";break;case"right":r.from.x="100%",r.to.x="0%";break;case"top":r.from.y="-100%",r.to.y="0%";break;case"bottom":r.from.y="100%",r.to.y="0%";break;case"rotate_top_left":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="0 0",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_top_right":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="100% 0",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_bottom_left":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="0 100%",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_bottom_right":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="100% 100%",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_center":r.from.rotationZ=-180,r.from.rotationX=-180,r.to.rotationZ=0,r.to.rotationX=0;break;default:break}return r}function s(i){return i.preventDefault(),i.stopPropagation(),!1}function n(i){let r=document.createElement("div");r.className="motionkit-popup-video-wrapper";let l=document.createElement("div");l.className="motionkit-popup-video-container";let p=document.createElement("video");p.className="motionkit-popup-video",p.preload="auto",p.playsInline=!0,p.setAttribute("playsinline","");let w=document.createElement("source");w.src=i,w.type="video/mp4",p.appendChild(w);let h=document.createElement("button");h.className="motionkit-popup-play-btn",h.type="button";let y=()=>{if(p.paused){let m=p.play();m!==void 0&&m.then(()=>h.classList.add("motionkit-playing")).catch(g=>console.warn("[popupMedia] playback failed:",g))}else p.pause(),h.classList.remove("motionkit-playing")};p.addEventListener("click",y),h.addEventListener("click",m=>{m.stopPropagation(),y()}),p.addEventListener("play",()=>{h.classList.add("motionkit-playing"),h.style.display="none"}),p.addEventListener("pause",()=>{h.classList.remove("motionkit-playing"),h.style.display="flex"}),p.addEventListener("ended",()=>{h.classList.remove("motionkit-playing"),h.style.display="flex",p.currentTime=0});let f=()=>{p.muted=!0;let m=p.play();m!==void 0&&m.then(()=>{var g;(g=navigator.userActivation)!=null&&g.hasBeenActive&&(p.muted=!1)}).catch(g=>{console.warn("[popupMedia] autoplay blocked:",g),h.style.display="flex"})};return l.appendChild(p),l.appendChild(h),r.appendChild(l),r._mkAutoplay=f,r}function u(i,r){switch(i){case"image":{let l=document.createElement("img");return l.src=r,l.alt="Popup Image",l.className="motionkit-popup-media",l}case"youtube":{let l=document.createElement("div");l.className="motionkit-youtube-container";let p=t(r);if(!p)return console.warn("[popupMedia] invalid YouTube URL:",r),null;let w=document.createElement("iframe");return w.className="motionkit-youtube-video",w.src=`https://www.youtube.com/embed/${p}?autoplay=1&rel=0`,w.allowFullscreen=!0,w.referrerPolicy="strict-origin-when-cross-origin",w.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",l.appendChild(w),l}case"video":return n(r);default:return console.warn(`[popupMedia] unknown mediaType "${i}"`),null}}function a(i,r=!1){var g,v,b;if(!i||!i.parentNode)return;let l=i.shadowRoot,p=parseInt(i.dataset.scrollPosition||"0",10);(g=l==null?void 0:l.querySelector("video"))==null||g.pause();let w=l==null?void 0:l.querySelector("iframe");w&&w.parentNode&&w.parentNode.removeChild(w),(b=(v=l==null?void 0:l.activeElement)==null?void 0:v.blur)==null||b.call(v),document.activeElement===i&&document.activeElement.blur(),ee(),N()||window.scrollTo(0,p),document.removeEventListener("touchmove",s),document.removeEventListener("wheel",s);let h=l==null?void 0:l.querySelector(".motionkit-popup-overlay");h&&(h.style.pointerEvents="none");let y=i._wcfTimeline,f=!1,m=()=>{var T;f||(f=!0,(T=i.parentNode)==null||T.removeChild(i))};y&&!r?(y.eventCallback("onReverseComplete",m),y.reverse(),setTimeout(m,1500)):(y&&y.kill(),m())}function d({mediaType:i,mediaUrl:r,animateFrom:l,popupId:p}){var R;if(!i||!r)return;document.querySelectorAll(A).forEach(S=>a(S,!0));let w=window.pageYOffset,h=document.createElement(A);h.classList.add("motionkit-skip-selector-full"),h.dataset.popupId=p,h.dataset.scrollPosition=String(w);let y=h.shadowRoot,f=document.createElement("style");f.textContent=ke,y.appendChild(f);let m=document.createElement("div");m.className="motionkit-popup-overlay";let g=document.createElement("div");g.className="motionkit-popup-content",i==="image"&&g.classList.add("motionkit-popup-content--image");let v=document.createElement("button");v.className="motionkit-popup-close",v.type="button",v.setAttribute("aria-label","Close"),v.addEventListener("mousedown",S=>S.preventDefault());let b=u(i,r);if(!b)return;g.appendChild(b),g.appendChild(v),m.appendChild(g),y.appendChild(m),document.body.appendChild(h),(R=b._mkAutoplay)==null||R.call(b),Ee(w),document.addEventListener("touchmove",s,{passive:!1}),document.addEventListener("wheel",s,{passive:!1});let{from:T,to:te}=o(l);h._wcfTimeline=gsap.timeline().set(m,{visibility:"visible"}).to(m,{opacity:1,duration:.3}).fromTo(g,T,te,"-=0.2"),m.addEventListener("click",S=>{(S.target===m||S.target.classList.contains("motionkit-popup-close"))&&a(h)})}function c(i){var r;(r=window.ScrollTrigger)!=null&&r.getAll&&window.ScrollTrigger.getAll().forEach(l=>{var w;let p=(w=l.vars)==null?void 0:w.mkPopupId;p!==void 0&&(i===void 0||p===i)&&l.kill()})}Q(ve,{label:"popupMedia",requires:[],resolve(i,{select:r}){var h,y;let l=(h=i.trigger)==null?void 0:h.type;if(l==="page_load")return[];let p=(y=i.trigger)==null?void 0:y.selector;if(!p)return console.warn(`[popupMedia] trigger.selector required for triggerType "${l}"`),null;let w=r(p);return w.length?w:(console.warn(`[popupMedia] no elements match "${p}"`),null)},build(i,r){let{id:l,mediaType:p,mediaUrl:w,trigger:{type:h}={},vars:{animateFrom:y="center"}={}}=i;if(!p||!w){console.warn("[popupMedia] missing mediaType or mediaUrl");return}c(l);let f=()=>d({mediaType:p,mediaUrl:w,animateFrom:y,popupId:l});if(h==="page_load"){let m=setTimeout(f,500);r.onCleanup(()=>clearTimeout(m));return}r.targets.forEach(m=>{switch(h){case"click":r.on(m,"click",f);break;case"hover":r.on(m,"mouseenter",f);break;case"on_scroll":{if(!window.ScrollTrigger){console.warn("[popupMedia] ScrollTrigger not loaded");return}let g=!1,v=window.ScrollTrigger.create({trigger:m,start:"top 80%",onEnter:b=>{!g&&!be(m)||(b.kill(),f())}});g=!0,v.vars.mkPopupId=l,r.addScrollTrigger(v);break}}})},teardownGlobal(){c(),document.querySelectorAll(A).forEach(i=>a(i,!0)),ee(),document.removeEventListener("touchmove",s),document.removeEventListener("wheel",s)}})})();})();
