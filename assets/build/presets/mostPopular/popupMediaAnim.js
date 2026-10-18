(()=>{var L="__motionkitPresetHandlers";function ne(){return typeof window=="undefined"?new Map:(window[L]||(window[L]=new Map),window[L])}function O(e,t){if(!e||typeof t!="function")return;let o=ne();if(o.has(e))return;let i=t()||{};o.set(e,{key:e,run:typeof i.run=="function"?i.run:function(){},teardown:typeof i.teardown=="function"?i.teardown:function(){}})}var E={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},re=[E.DRAFT,E.SAVED,E.PUBLISHED],ie="preview";function se(e){return!e||typeof e!="object"?E.PUBLISHED:re.indexOf(e.status)!==-1?e.status:e.status===ie||e.isPublished===!1?E.SAVED:E.PUBLISHED}function H(e){return se(e)!==E.DRAFT}function ae(){return typeof window=="undefined"?{}:window.__motionkitHostData||window.motionkitData||{}}function W(){return ae().motionkit_token||null}var ce=["motionkit=editor","action=motionkit-editor"],F=()=>{if(typeof window=="undefined")return!1;let e=window.location.search;return ce.some(t=>e.includes(t))?!0:!!W()};var P="__motionkitOwnership";function x(){let e=typeof window!="undefined"?window:globalThis;return e[P]||(e[P]={ownerByEl:new WeakMap,elsByAnim:new Map,animsByAnim:new Map,resetByAnim:new Map}),e[P]}x();function $(e,t){e&&x().animsByAnim.set(e,t||[])}function K(e,t){!e||typeof t!="function"||x().resetByAnim.set(e,t)}function le(e,t,o){let i=e.elsByAnim.get(t);i||(i=new Set,e.elsByAnim.set(t,i)),i.add(o)}function B(e,t){if(!t||!e||!e.length)return!1;let o=x(),i=new Map;return e.forEach(n=>{var a;if(!n)return;let u=o.ownerByEl.get(n);u&&u!==t&&(i.has(u)||i.set(u,[]),i.get(u).push(n)),o.ownerByEl.set(n,t),le(o,t,n),(a=n.setAttribute)==null||a.call(n,"data-motionkit-anim-id",t)}),i.size?(i.forEach((n,u)=>{(o.animsByAnim.get(u)||[]).forEach(d=>{var c;try{(c=d.pause)==null||c.call(d)}catch(s){}});let a=o.resetByAnim.get(u);if(a)try{a(n)}catch(d){console.warn("[motionkit] ownership reset error:",d)}}),!0):!1}function Y(e){let t=x(),o=t.elsByAnim.get(e);o&&(o.forEach(i=>{t.ownerByEl.get(i)===e&&t.ownerByEl.delete(i)}),t.elsByAnim.delete(e)),t.animsByAnim.delete(e),t.resetByAnim.delete(e)}var M="__motionkitScreen";function I(e){let t=e||(typeof window!="undefined"?window:null);return t?(t[M]||(t[M]={held:!1,queue:[],deadline:12e3}),t[M]):{held:!1,queue:[],deadline:12e3}}function U(e){try{e()}catch(t){console.error("[motionkit] a screen-release waiter threw",t)}}function G(e){return I(e).held===!0}function X(e,t){let o=I(e);if(!o.held){U(t);return}let i=!1,n=()=>{i||(i=!0,U(t))};o.queue.push(n);let u=e||window;u&&typeof u.setTimeout=="function"&&u.setTimeout(n,o.deadline+400)}var C="__motionkitSplits",Z="__no_owner__",R="data-motionkit-overlay";function D(){let e=typeof window!="undefined"?window:globalThis;return e[C]||(e[C]={bySig:new Map,elKeys:new WeakMap,seq:0}),e[C]}function ue(e){if(typeof e=="string")return e;if(!e||e.nodeType!==1)return String(e);let t=D(),o=t.elKeys.get(e);return o||(t.seq+=1,o=`__el${t.seq}`,t.elKeys.set(e,o)),o}function pe(e,t){return`${ue(e)}::${JSON.stringify(t||{})}`}function de(e,t){if(typeof SplitText=="undefined")return null;try{return typeof SplitText.create=="function"?SplitText.create(e,t):new SplitText(e,t)}catch(o){return console.warn("[motionkit] SplitText failed for",e,o),null}}function fe(e){let t=[];return((e==null?void 0:e.elements)||[]).forEach(o=>{!(o!=null&&o.setAttribute)||o.hasAttribute(R)||(o.setAttribute(R,"false"),t.push(o))}),t}function me(e){var t,o;try{(o=(t=e.split)==null?void 0:t.revert)==null||o.call(t)}catch(i){}(e.marked||[]).forEach(i=>{var n;return(n=i.removeAttribute)==null?void 0:n.call(i,R)})}function z(e,t,o){if(!t)return null;let i=e||Z,n=D(),u=pe(t,o),a=n.bySig.get(u);if(a)return a.owners.add(i),a;let d=null;if(n.bySig.forEach(r=>{!d&&r.target===t&&(d=r)}),d)return d.owners.add(i),d;let c=de(t,o);if(!c)return null;let s={split:c,target:t,sig:u,owners:new Set([i]),marked:fe(c)};return n.bySig.set(u,s),s}function V(e){let t=e||Z,o=D();o.bySig.forEach((i,n)=>{i.owners.has(t)&&(i.owners.delete(t),i.owners.size===0&&(me(i),o.bySig.delete(n)))})}function he(e){return typeof e!="string"||e.includes("chars")?"chars":e.includes("words")?"words":e.includes("lines")?"lines":"chars"}function j(e,t){var i,n;if(!e)return null;let o=he(t);if((i=e[o])!=null&&i.length)return e[o];for(let u of["chars","words","lines"])if((n=e[u])!=null&&n.length)return e[u];return null}var we="data-motionkit-anim-id",ge=["h1","h2","h3","h4","h5","h6","p","span","div","a","img","video","button","li","ul","ol","section","article","header","footer","nav","main","aside"];function ye(e){if(!e||typeof e!="string")return"";let t=e.trim();return t.startsWith(".")||t.startsWith("#")||t.startsWith("[")||t.startsWith(":")||t.includes(" ")||t.includes(">")||t.includes(",")||ge.includes(t.toLowerCase())?t:"."+t}var J=new Set;function ve(e,t,o){let i=e+"|"+t;J.has(i)||(J.add(i),console.warn(`[${e}] ${o}`))}function _(e,t,o){if(!t||typeof t!="string")return[];let i=o||document,n=ye(t);try{let u=i.querySelectorAll(n);if(u.length||n===t)return[...u]}catch(u){}try{return[...i.querySelectorAll(t)]}catch(u){return ve(e,t,`invalid selector "${t}": ${u.message}`),[]}}function ke(){return{listeners:[],scrollTriggers:[],animations:[],elements:[],tweenRestores:[],structuralRestores:[],ownershipResets:[],cleanups:[]}}function k(e,t,o){try{o()}catch(i){console.warn(`[${e}] ${t} teardown error:`,i)}}function Q(e,t,o){o.listeners.forEach(({el:n,type:u,fn:a,opts:d})=>k(e,"listener",()=>n.removeEventListener(u,a,d))),o.scrollTriggers.forEach(n=>k(e,"scrollTrigger",()=>n==null?void 0:n.kill()));let i=typeof window!="undefined"&&window.ScrollTrigger?window.ScrollTrigger.getById(t):null;i&&k(e,"scrollTrigger",()=>i.kill()),o.animations.forEach(n=>k(e,"animation",()=>{var u,a;(u=n==null?void 0:n.revert)==null||u.call(n),(a=n==null?void 0:n.kill)==null||a.call(n)})),o.elements.forEach(n=>k(e,"element",()=>{var u;return(u=n==null?void 0:n.remove)==null?void 0:u.call(n)})),o.tweenRestores.forEach(n=>k(e,"style",n)),o.structuralRestores.forEach(n=>k(e,"style",n)),k(e,"split",()=>V(t));for(let n=o.cleanups.length-1;n>=0;n--)k(e,"cleanup",o.cleanups[n])}function be(e,t,o,i,n){var u;return{id:t.id,targets:o,data:i,vars:t.vars||{},markers:((u=t.vars)==null?void 0:u.markers)===!0&&F(),get triggers(){var c;let a=((c=t.trigger)==null?void 0:c.selector)||t.triggerClass,d=a?_(e,a):[];return d.length?d:o},select:(a,d)=>_(e,a,d),on(a,d,c,s){a&&(a.addEventListener(d,c,s),n.listeners.push({el:a,type:d,fn:c,opts:s}))},add(a){return a&&n.animations.push(a),a},addScrollTrigger(a){return a&&n.scrollTriggers.push(a),a},addElement(a){return a&&n.elements.push(a),a},split(a,d){let c=z(t.id,a,d);return c?j(c.split,d==null?void 0:d.type)||[]:[]},clearProps(a,d){a&&n.tweenRestores.push(()=>gsap.set(a,{clearProps:d}))},restoreStyle(a,d){if(!a)return;let c={};d.forEach(s=>c[s]=a.style[s]),n.structuralRestores.push(()=>{d.forEach(s=>{var r;return a.style[s]=(r=c[s])!=null?r:""})})},claim(){let a=B(o,t.id);return a&&n.animations.forEach(d=>{var c;try{(c=d.invalidate)==null||c.call(d)}catch(s){}}),a},onDisplace(a){typeof a=="function"&&n.ownershipResets.push(a)},onCleanup(a){typeof a=="function"&&n.cleanups.push(a)}}}function ee(e,t){let o=t.label||e,i=t.requires||["itemClass"];O(e,function(){let n=new Map;function u(c){let s=n.get(c);s&&(n.delete(c),Y(c),Q(o,c,s))}function a(){for(let c of[...n.keys()])u(c);typeof t.teardownGlobal=="function"&&k(o,"global",t.teardownGlobal)}function d(c){var m;if(!c||typeof c!="object"||!H(c)||i.some(w=>!c[w]))return;let s,r=null;if(typeof t.resolve=="function"){let w=t.resolve(c,{select:(y,f)=>_(o,y,f)});if(Array.isArray(w)?s=w:w&&(s=w.targets,r=(m=w.data)!=null?m:null),!s)return}else if(s=_(o,c.itemClass),!s.length)return;if(u(c.id),s.forEach(w=>w.setAttribute(we,c.id)),c.mkInert)return;let l=ke(),p=be(o,c,s,r,l);n.set(c.id,l);let h=()=>{var y;if(n.get(c.id)!==l)return;try{t.build(c,p)}catch(f){console.error(`[${o}] build failed:`,f),n.delete(c.id),Q(o,c.id,l);return}$(c.id,l.animations),K(c.id,()=>{l.tweenRestores.forEach(f=>k(o,"ownership reset",f)),l.ownershipResets.forEach(f=>k(o,"ownership reset",f))});let w=(y=c.trigger)==null?void 0:y.type;w!=="click"&&w!=="hover"&&B(s,c.id)};G(window)?X(window,h):h()}return{run:d,teardown:a}})}var Ee="motionkit-mk-popup-media-pa",A="motionkit-popup-media",Se=`
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
`;if(typeof window!="undefined"&&!customElements.get(A)){class e extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}}customElements.define(A,e)}function N(){var e,t;return((t=(e=window.ScrollSmoother)==null?void 0:e.get)==null?void 0:t.call(e))||null}function xe(e){let t=e.getBoundingClientRect(),o=window.innerHeight||document.documentElement.clientHeight,i=window.innerWidth||document.documentElement.clientWidth;return t.bottom>0&&t.top<o&&t.right>0&&t.left<i}function Ae(e){let t=N();if(t){t.paused(!0);return}let o=document.body.style;o.overflow="hidden",o.height="100%",o.position="fixed",o.width="100%",o.top=`-${e}px`}function te(){let e=N();if(e){e.paused(!1);return}let t=document.body.style;t.overflow="",t.height="",t.position="",t.width="",t.top=""}(function(){function t(s){let r=[/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,/(?:youtube\.com\/embed\/)([^?]+)/,/(?:youtube\.com\/v\/)([^?]+)/,/(?:youtube\.com\/watch\?.*v=)([^&]+)/];for(let l of r){let p=s.match(l);if(p&&p[1])return p[1]}return null}function o(s){let r={from:{scale:.7,opacity:0},to:{scale:1,opacity:1,duration:.4,ease:"back.out(1.7)"}};switch(s){case"left":r.from.x="-100%",r.to.x="0%";break;case"right":r.from.x="100%",r.to.x="0%";break;case"top":r.from.y="-100%",r.to.y="0%";break;case"bottom":r.from.y="100%",r.to.y="0%";break;case"rotate_top_left":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="0 0",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_top_right":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="100% 0",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_bottom_left":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="0 100%",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_bottom_right":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="100% 100%",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_center":r.from.rotationZ=-180,r.from.rotationX=-180,r.to.rotationZ=0,r.to.rotationX=0;break;default:break}return r}function i(s){return s.preventDefault(),s.stopPropagation(),!1}function n(s){let r=document.createElement("div");r.className="motionkit-popup-video-wrapper";let l=document.createElement("div");l.className="motionkit-popup-video-container";let p=document.createElement("video");p.className="motionkit-popup-video",p.preload="auto",p.playsInline=!0,p.setAttribute("playsinline","");let h=document.createElement("source");h.src=s,h.type="video/mp4",p.appendChild(h);let m=document.createElement("button");m.className="motionkit-popup-play-btn",m.type="button";let w=()=>{if(p.paused){let f=p.play();f!==void 0&&f.then(()=>m.classList.add("motionkit-playing")).catch(g=>console.warn("[popupMedia] playback failed:",g))}else p.pause(),m.classList.remove("motionkit-playing")};p.addEventListener("click",w),m.addEventListener("click",f=>{f.stopPropagation(),w()}),p.addEventListener("play",()=>{m.classList.add("motionkit-playing"),m.style.display="none"}),p.addEventListener("pause",()=>{m.classList.remove("motionkit-playing"),m.style.display="flex"}),p.addEventListener("ended",()=>{m.classList.remove("motionkit-playing"),m.style.display="flex",p.currentTime=0});let y=()=>{p.muted=!0;let f=p.play();f!==void 0&&f.then(()=>{var g;(g=navigator.userActivation)!=null&&g.hasBeenActive&&(p.muted=!1)}).catch(g=>{console.warn("[popupMedia] autoplay blocked:",g),m.style.display="flex"})};return l.appendChild(p),l.appendChild(m),r.appendChild(l),r._mkAutoplay=y,r}function u(s,r){switch(s){case"image":{let l=document.createElement("img");return l.src=r,l.alt="Popup Image",l.className="motionkit-popup-media",l}case"youtube":{let l=document.createElement("div");l.className="motionkit-youtube-container";let p=t(r);if(!p)return console.warn("[popupMedia] invalid YouTube URL:",r),null;let h=document.createElement("iframe");return h.className="motionkit-youtube-video",h.src=`https://www.youtube.com/embed/${p}?autoplay=1&rel=0`,h.allowFullscreen=!0,h.referrerPolicy="strict-origin-when-cross-origin",h.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",l.appendChild(h),l}case"video":return n(r);default:return console.warn(`[popupMedia] unknown mediaType "${s}"`),null}}function a(s,r=!1){var g,v,b;if(!s||!s.parentNode)return;let l=s.shadowRoot,p=parseInt(s.dataset.scrollPosition||"0",10);(g=l==null?void 0:l.querySelector("video"))==null||g.pause();let h=l==null?void 0:l.querySelector("iframe");h&&h.parentNode&&h.parentNode.removeChild(h),(b=(v=l==null?void 0:l.activeElement)==null?void 0:v.blur)==null||b.call(v),document.activeElement===s&&document.activeElement.blur(),te(),N()||window.scrollTo(0,p),document.removeEventListener("touchmove",i),document.removeEventListener("wheel",i);let m=l==null?void 0:l.querySelector(".motionkit-popup-overlay");m&&(m.style.pointerEvents="none");let w=s._wcfTimeline,y=!1,f=()=>{var T;y||(y=!0,(T=s.parentNode)==null||T.removeChild(s))};w&&!r?(w.eventCallback("onReverseComplete",f),w.reverse(),setTimeout(f,1500)):(w&&w.kill(),f())}function d({mediaType:s,mediaUrl:r,animateFrom:l,popupId:p}){var q;if(!s||!r)return;document.querySelectorAll(A).forEach(S=>a(S,!0));let h=window.pageYOffset,m=document.createElement(A);m.classList.add("motionkit-skip-selector-full"),m.dataset.popupId=p,m.dataset.scrollPosition=String(h);let w=m.shadowRoot,y=document.createElement("style");y.textContent=Se,w.appendChild(y);let f=document.createElement("div");f.className="motionkit-popup-overlay";let g=document.createElement("div");g.className="motionkit-popup-content",s==="image"&&g.classList.add("motionkit-popup-content--image");let v=document.createElement("button");v.className="motionkit-popup-close",v.type="button",v.setAttribute("aria-label","Close"),v.addEventListener("mousedown",S=>S.preventDefault());let b=u(s,r);if(!b)return;g.appendChild(b),g.appendChild(v),f.appendChild(g),w.appendChild(f),document.body.appendChild(m),(q=b._mkAutoplay)==null||q.call(b),Ae(h),document.addEventListener("touchmove",i,{passive:!1}),document.addEventListener("wheel",i,{passive:!1});let{from:T,to:oe}=o(l);m._wcfTimeline=gsap.timeline().set(f,{visibility:"visible"}).to(f,{opacity:1,duration:.3}).fromTo(g,T,oe,"-=0.2"),f.addEventListener("click",S=>{(S.target===f||S.target.classList.contains("motionkit-popup-close"))&&a(m)})}function c(s){var r;(r=window.ScrollTrigger)!=null&&r.getAll&&window.ScrollTrigger.getAll().forEach(l=>{var h;let p=(h=l.vars)==null?void 0:h.mkPopupId;p!==void 0&&(s===void 0||p===s)&&l.kill()})}ee(Ee,{label:"popupMedia",requires:[],resolve(s,{select:r}){var m,w;let l=(m=s.trigger)==null?void 0:m.type;if(l==="page_load")return[];let p=(w=s.trigger)==null?void 0:w.selector;if(!p)return console.warn(`[popupMedia] trigger.selector required for triggerType "${l}"`),null;let h=r(p);return h.length?h:(console.warn(`[popupMedia] no elements match "${p}"`),null)},build(s,r){let{id:l,mediaType:p,mediaUrl:h,trigger:{type:m}={},vars:{animateFrom:w="center"}={}}=s;if(!p||!h){console.warn("[popupMedia] missing mediaType or mediaUrl");return}c(l);let y=()=>d({mediaType:p,mediaUrl:h,animateFrom:w,popupId:l});if(m==="page_load"){let f=setTimeout(y,500);r.onCleanup(()=>clearTimeout(f));return}r.targets.forEach(f=>{switch(m){case"click":r.on(f,"click",y);break;case"hover":r.on(f,"mouseenter",y);break;case"on_scroll":{if(!window.ScrollTrigger){console.warn("[popupMedia] ScrollTrigger not loaded");return}let g=!1,v=window.ScrollTrigger.create({trigger:f,start:"top 80%",onEnter:b=>{!g&&!xe(f)||(b.kill(),y())}});g=!0,v.vars.mkPopupId=l,r.addScrollTrigger(v);break}}})},teardownGlobal(){c(),document.querySelectorAll(A).forEach(s=>a(s,!0)),te(),document.removeEventListener("touchmove",i),document.removeEventListener("wheel",i)}})})();})();
