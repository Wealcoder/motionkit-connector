(()=>{var L="__motionkitPresetHandlers";function oe(){return typeof window=="undefined"?new Map:(window[L]||(window[L]=new Map),window[L])}function q(e,t){if(!e||typeof t!="function")return;let n=oe();if(n.has(e))return;let a=t()||{};n.set(e,{key:e,run:typeof a.run=="function"?a.run:function(){},teardown:typeof a.teardown=="function"?a.teardown:function(){}})}var E={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},ne=[E.DRAFT,E.SAVED,E.PUBLISHED],re="preview";function ie(e){return!e||typeof e!="object"?E.PUBLISHED:ne.indexOf(e.status)!==-1?e.status:e.status===re||e.isPublished===!1?E.SAVED:E.PUBLISHED}function O(e){return ie(e)!==E.DRAFT}function se(){return typeof window=="undefined"?{}:window.__motionkitHostData||window.motionkitData||{}}function H(){return se().motionkit_token||null}var $=()=>typeof window=="undefined"?!1:window.location.search.includes("action=motionkit-editor")?!0:!!H();var P="__motionkitOwnership";function x(){let e=typeof window!="undefined"?window:globalThis;return e[P]||(e[P]={ownerByEl:new WeakMap,elsByAnim:new Map,animsByAnim:new Map,resetByAnim:new Map}),e[P]}x();function F(e,t){e&&x().animsByAnim.set(e,t||[])}function K(e,t){!e||typeof t!="function"||x().resetByAnim.set(e,t)}function ae(e,t,n){let a=e.elsByAnim.get(t);a||(a=new Set,e.elsByAnim.set(t,a)),a.add(n)}function B(e,t){if(!t||!e||!e.length)return!1;let n=x(),a=new Map;return e.forEach(o=>{var s;if(!o)return;let u=n.ownerByEl.get(o);u&&u!==t&&(a.has(u)||a.set(u,[]),a.get(u).push(o)),n.ownerByEl.set(o,t),ae(n,t,o),(s=o.setAttribute)==null||s.call(o,"data-motionkit-anim-id",t)}),a.size?(a.forEach((o,u)=>{(n.animsByAnim.get(u)||[]).forEach(d=>{var c;try{(c=d.pause)==null||c.call(d)}catch(i){}});let s=n.resetByAnim.get(u);if(s)try{s(o)}catch(d){console.warn("[motionkit] ownership reset error:",d)}}),!0):!1}function U(e){let t=x(),n=t.elsByAnim.get(e);n&&(n.forEach(a=>{t.ownerByEl.get(a)===e&&t.ownerByEl.delete(a)}),t.elsByAnim.delete(e)),t.animsByAnim.delete(e),t.resetByAnim.delete(e)}var M="__motionkitScreen";function Y(e){let t=e||(typeof window!="undefined"?window:null);return t?(t[M]||(t[M]={held:!1,queue:[],deadline:12e3}),t[M]):{held:!1,queue:[],deadline:12e3}}function W(e){try{e()}catch(t){console.error("[motionkit] a screen-release waiter threw",t)}}function G(e){return Y(e).held===!0}function I(e,t){let n=Y(e);if(!n.held){W(t);return}let a=!1,o=()=>{a||(a=!0,W(t))};n.queue.push(o);let u=e||window;u&&typeof u.setTimeout=="function"&&u.setTimeout(o,n.deadline+400)}var C="__motionkitSplits",X="__no_owner__";function D(){let e=typeof window!="undefined"?window:globalThis;return e[C]||(e[C]={bySig:new Map,elKeys:new WeakMap,seq:0}),e[C]}function ce(e){if(typeof e=="string")return e;if(!e||e.nodeType!==1)return String(e);let t=D(),n=t.elKeys.get(e);return n||(t.seq+=1,n=`__el${t.seq}`,t.elKeys.set(e,n)),n}function le(e,t){return`${ce(e)}::${JSON.stringify(t||{})}`}function ue(e,t){if(typeof SplitText=="undefined")return null;try{return typeof SplitText.create=="function"?SplitText.create(e,t):new SplitText(e,t)}catch(n){return console.warn("[motionkit] SplitText failed for",e,n),null}}function pe(e){var t,n;try{(n=(t=e.split)==null?void 0:t.revert)==null||n.call(t)}catch(a){}}function Z(e,t,n){if(!t)return null;let a=e||X,o=D(),u=le(t,n),s=o.bySig.get(u);if(s)return s.owners.add(a),s;let d=null;if(o.bySig.forEach(r=>{!d&&r.target===t&&(d=r)}),d)return d.owners.add(a),d;let c=ue(t,n);if(!c)return null;let i={split:c,target:t,sig:u,owners:new Set([a])};return o.bySig.set(u,i),i}function z(e){let t=e||X,n=D();n.bySig.forEach((a,o)=>{a.owners.has(t)&&(a.owners.delete(t),a.owners.size===0&&(pe(a),n.bySig.delete(o)))})}function de(e){return typeof e!="string"||e.includes("chars")?"chars":e.includes("words")?"words":e.includes("lines")?"lines":"chars"}function V(e,t){var a,o;if(!e)return null;let n=de(t);if((a=e[n])!=null&&a.length)return e[n];for(let u of["chars","words","lines"])if((o=e[u])!=null&&o.length)return e[u];return null}var fe="data-motionkit-anim-id",me=["h1","h2","h3","h4","h5","h6","p","span","div","a","img","video","button","li","ul","ol","section","article","header","footer","nav","main","aside"];function he(e){if(!e||typeof e!="string")return"";let t=e.trim();return t.startsWith(".")||t.startsWith("#")||t.startsWith("[")||t.startsWith(":")||t.includes(" ")||t.includes(">")||t.includes(",")||me.includes(t.toLowerCase())?t:"."+t}var j=new Set;function we(e,t,n){let a=e+"|"+t;j.has(a)||(j.add(a),console.warn(`[${e}] ${n}`))}function _(e,t,n){if(!t||typeof t!="string")return[];let a=n||document,o=he(t);try{let u=a.querySelectorAll(o);if(u.length||o===t)return[...u]}catch(u){}try{return[...a.querySelectorAll(t)]}catch(u){return we(e,t,`invalid selector "${t}": ${u.message}`),[]}}function ge(){return{listeners:[],scrollTriggers:[],animations:[],elements:[],tweenRestores:[],structuralRestores:[],cleanups:[]}}function b(e,t,n){try{n()}catch(a){console.warn(`[${e}] ${t} teardown error:`,a)}}function J(e,t,n){n.listeners.forEach(({el:o,type:u,fn:s,opts:d})=>b(e,"listener",()=>o.removeEventListener(u,s,d))),n.scrollTriggers.forEach(o=>b(e,"scrollTrigger",()=>o==null?void 0:o.kill()));let a=typeof window!="undefined"&&window.ScrollTrigger?window.ScrollTrigger.getById(t):null;a&&b(e,"scrollTrigger",()=>a.kill()),n.animations.forEach(o=>b(e,"animation",()=>{var u,s;(u=o==null?void 0:o.revert)==null||u.call(o),(s=o==null?void 0:o.kill)==null||s.call(o)})),n.elements.forEach(o=>b(e,"element",()=>{var u;return(u=o==null?void 0:o.remove)==null?void 0:u.call(o)})),n.tweenRestores.forEach(o=>b(e,"style",o)),n.structuralRestores.forEach(o=>b(e,"style",o)),b(e,"split",()=>z(t));for(let o=n.cleanups.length-1;o>=0;o--)b(e,"cleanup",n.cleanups[o])}function ye(e,t,n,a,o){var u;return{id:t.id,targets:n,data:a,vars:t.vars||{},markers:((u=t.vars)==null?void 0:u.markers)===!0&&$(),get triggers(){var c;let s=((c=t.trigger)==null?void 0:c.selector)||t.triggerClass,d=s?_(e,s):[];return d.length?d:n},select:(s,d)=>_(e,s,d),on(s,d,c,i){s&&(s.addEventListener(d,c,i),o.listeners.push({el:s,type:d,fn:c,opts:i}))},add(s){return s&&o.animations.push(s),s},addScrollTrigger(s){return s&&o.scrollTriggers.push(s),s},addElement(s){return s&&o.elements.push(s),s},split(s,d){let c=Z(t.id,s,d);return c?V(c.split,d==null?void 0:d.type)||[]:[]},clearProps(s,d){s&&o.tweenRestores.push(()=>gsap.set(s,{clearProps:d}))},onDisplace(s){typeof s=="function"&&o.tweenRestores.push(s)},restoreStyle(s,d){if(!s)return;let c={};d.forEach(i=>c[i]=s.style[i]),o.structuralRestores.push(()=>{d.forEach(i=>{var r;return s.style[i]=(r=c[i])!=null?r:""})})},claim(){let s=B(n,t.id);return s&&o.animations.forEach(d=>{var c;try{(c=d.invalidate)==null||c.call(d)}catch(i){}}),s},onCleanup(s){typeof s=="function"&&o.cleanups.push(s)}}}function Q(e,t){let n=t.label||e,a=t.requires||["itemClass"];q(e,function(){let o=new Map;function u(c){let i=o.get(c);i&&(o.delete(c),U(c),J(n,c,i))}function s(){for(let c of[...o.keys()])u(c);typeof t.teardownGlobal=="function"&&b(n,"global",t.teardownGlobal)}function d(c){var f;if(!c||typeof c!="object"||!O(c)||a.some(w=>!c[w]))return;let i,r=null;if(typeof t.resolve=="function"){let w=t.resolve(c,{select:(y,m)=>_(n,y,m)});if(Array.isArray(w)?i=w:w&&(i=w.targets,r=(f=w.data)!=null?f:null),!i)return}else if(i=_(n,c.itemClass),!i.length)return;if(u(c.id),i.forEach(w=>w.setAttribute(fe,c.id)),c.mkInert)return;let l=ge(),p=ye(n,c,i,r,l);o.set(c.id,l);let h=()=>{var y;if(o.get(c.id)!==l)return;try{t.build(c,p)}catch(m){console.error(`[${n}] build failed:`,m),o.delete(c.id),J(n,c.id,l);return}F(c.id,l.animations),K(c.id,()=>l.tweenRestores.forEach(m=>b(n,"ownership reset",m)));let w=(y=c.trigger)==null?void 0:y.type;w!=="click"&&w!=="hover"&&B(i,c.id)};G(window)?I(window,h):h()}return{run:d,teardown:s}})}var ve="motionkit-mk-popup-media-pa",T="motionkit-popup-media",be=`
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
`;if(typeof window!="undefined"&&!customElements.get(T)){class e extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}}customElements.define(T,e)}function R(){var e,t;return((t=(e=window.ScrollSmoother)==null?void 0:e.get)==null?void 0:t.call(e))||null}function ke(e){let t=e.getBoundingClientRect(),n=window.innerHeight||document.documentElement.clientHeight,a=window.innerWidth||document.documentElement.clientWidth;return t.bottom>0&&t.top<n&&t.right>0&&t.left<a}function Ee(e){let t=R();if(t){t.paused(!0);return}let n=document.body.style;n.overflow="hidden",n.height="100%",n.position="fixed",n.width="100%",n.top=`-${e}px`}function ee(){let e=R();if(e){e.paused(!1);return}let t=document.body.style;t.overflow="",t.height="",t.position="",t.width="",t.top=""}(function(){function t(i){let r=[/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,/(?:youtube\.com\/embed\/)([^?]+)/,/(?:youtube\.com\/v\/)([^?]+)/,/(?:youtube\.com\/watch\?.*v=)([^&]+)/];for(let l of r){let p=i.match(l);if(p&&p[1])return p[1]}return null}function n(i){let r={from:{scale:.7,opacity:0},to:{scale:1,opacity:1,duration:.4,ease:"back.out(1.7)"}};switch(i){case"left":r.from.x="-100%",r.to.x="0%";break;case"right":r.from.x="100%",r.to.x="0%";break;case"top":r.from.y="-100%",r.to.y="0%";break;case"bottom":r.from.y="100%",r.to.y="0%";break;case"rotate_top_left":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="0 0",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_top_right":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="100% 0",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_bottom_left":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="0 100%",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_bottom_right":r.from.rotationZ=-180,r.from.rotationX=-180,r.from.transformOrigin="100% 100%",r.to.rotationZ=0,r.to.rotationX=0;break;case"rotate_center":r.from.rotationZ=-180,r.from.rotationX=-180,r.to.rotationZ=0,r.to.rotationX=0;break;default:break}return r}function a(i){return i.preventDefault(),i.stopPropagation(),!1}function o(i){let r=document.createElement("div");r.className="motionkit-popup-video-wrapper";let l=document.createElement("div");l.className="motionkit-popup-video-container";let p=document.createElement("video");p.className="motionkit-popup-video",p.preload="auto",p.playsInline=!0,p.setAttribute("playsinline","");let h=document.createElement("source");h.src=i,h.type="video/mp4",p.appendChild(h);let f=document.createElement("button");f.className="motionkit-popup-play-btn",f.type="button";let w=()=>{if(p.paused){let m=p.play();m!==void 0&&m.then(()=>f.classList.add("motionkit-playing")).catch(g=>console.warn("[popupMedia] playback failed:",g))}else p.pause(),f.classList.remove("motionkit-playing")};p.addEventListener("click",w),f.addEventListener("click",m=>{m.stopPropagation(),w()}),p.addEventListener("play",()=>{f.classList.add("motionkit-playing"),f.style.display="none"}),p.addEventListener("pause",()=>{f.classList.remove("motionkit-playing"),f.style.display="flex"}),p.addEventListener("ended",()=>{f.classList.remove("motionkit-playing"),f.style.display="flex",p.currentTime=0});let y=()=>{p.muted=!0;let m=p.play();m!==void 0&&m.then(()=>{var g;(g=navigator.userActivation)!=null&&g.hasBeenActive&&(p.muted=!1)}).catch(g=>{console.warn("[popupMedia] autoplay blocked:",g),f.style.display="flex"})};return l.appendChild(p),l.appendChild(f),r.appendChild(l),r._mkAutoplay=y,r}function u(i,r){switch(i){case"image":{let l=document.createElement("img");return l.src=r,l.alt="Popup Image",l.className="motionkit-popup-media",l}case"youtube":{let l=document.createElement("div");l.className="motionkit-youtube-container";let p=t(r);if(!p)return console.warn("[popupMedia] invalid YouTube URL:",r),null;let h=document.createElement("iframe");return h.className="motionkit-youtube-video",h.src=`https://www.youtube.com/embed/${p}?autoplay=1&rel=0`,h.allowFullscreen=!0,h.referrerPolicy="strict-origin-when-cross-origin",h.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",l.appendChild(h),l}case"video":return o(r);default:return console.warn(`[popupMedia] unknown mediaType "${i}"`),null}}function s(i,r=!1){var g,v,k;if(!i||!i.parentNode)return;let l=i.shadowRoot,p=parseInt(i.dataset.scrollPosition||"0",10);(g=l==null?void 0:l.querySelector("video"))==null||g.pause();let h=l==null?void 0:l.querySelector("iframe");h&&h.parentNode&&h.parentNode.removeChild(h),(k=(v=l==null?void 0:l.activeElement)==null?void 0:v.blur)==null||k.call(v),document.activeElement===i&&document.activeElement.blur(),ee(),R()||window.scrollTo(0,p),document.removeEventListener("touchmove",a),document.removeEventListener("wheel",a);let f=l==null?void 0:l.querySelector(".motionkit-popup-overlay");f&&(f.style.pointerEvents="none");let w=i._wcfTimeline,y=!1,m=()=>{var A;y||(y=!0,(A=i.parentNode)==null||A.removeChild(i))};w&&!r?(w.eventCallback("onReverseComplete",m),w.reverse(),setTimeout(m,1500)):(w&&w.kill(),m())}function d({mediaType:i,mediaUrl:r,animateFrom:l,popupId:p}){var N;if(!i||!r)return;document.querySelectorAll(T).forEach(S=>s(S,!0));let h=window.pageYOffset,f=document.createElement(T);f.classList.add("motionkit-skip-selector-full"),f.dataset.popupId=p,f.dataset.scrollPosition=String(h);let w=f.shadowRoot,y=document.createElement("style");y.textContent=be,w.appendChild(y);let m=document.createElement("div");m.className="motionkit-popup-overlay";let g=document.createElement("div");g.className="motionkit-popup-content",i==="image"&&g.classList.add("motionkit-popup-content--image");let v=document.createElement("button");v.className="motionkit-popup-close",v.type="button",v.setAttribute("aria-label","Close"),v.addEventListener("mousedown",S=>S.preventDefault());let k=u(i,r);if(!k)return;g.appendChild(k),g.appendChild(v),m.appendChild(g),w.appendChild(m),document.body.appendChild(f),(N=k._mkAutoplay)==null||N.call(k),Ee(h),document.addEventListener("touchmove",a,{passive:!1}),document.addEventListener("wheel",a,{passive:!1});let{from:A,to:te}=n(l);f._wcfTimeline=gsap.timeline().set(m,{visibility:"visible"}).to(m,{opacity:1,duration:.3}).fromTo(g,A,te,"-=0.2"),m.addEventListener("click",S=>{(S.target===m||S.target.classList.contains("motionkit-popup-close"))&&s(f)})}function c(i){var r;(r=window.ScrollTrigger)!=null&&r.getAll&&window.ScrollTrigger.getAll().forEach(l=>{var h;let p=(h=l.vars)==null?void 0:h.mkPopupId;p!==void 0&&(i===void 0||p===i)&&l.kill()})}Q(ve,{label:"popupMedia",requires:[],resolve(i,{select:r}){var f,w;let l=(f=i.trigger)==null?void 0:f.type;if(l==="page_load")return[];let p=(w=i.trigger)==null?void 0:w.selector;if(!p)return console.warn(`[popupMedia] trigger.selector required for triggerType "${l}"`),null;let h=r(p);return h.length?h:(console.warn(`[popupMedia] no elements match "${p}"`),null)},build(i,r){let{id:l,mediaType:p,mediaUrl:h,trigger:{type:f}={},vars:{animateFrom:w="center"}={}}=i;if(!p||!h){console.warn("[popupMedia] missing mediaType or mediaUrl");return}c(l);let y=()=>d({mediaType:p,mediaUrl:h,animateFrom:w,popupId:l});if(f==="page_load"){let m=setTimeout(y,500);r.onCleanup(()=>clearTimeout(m));return}r.targets.forEach(m=>{switch(f){case"click":r.on(m,"click",y);break;case"hover":r.on(m,"mouseenter",y);break;case"on_scroll":{if(!window.ScrollTrigger){console.warn("[popupMedia] ScrollTrigger not loaded");return}let g=!1,v=window.ScrollTrigger.create({trigger:m,start:"top 80%",onEnter:k=>{!g&&!ke(m)||(k.kill(),y())}});g=!0,v.vars.mkPopupId=l,r.addScrollTrigger(v);break}}})},teardownGlobal(){c(),document.querySelectorAll(T).forEach(i=>s(i,!0)),ee(),document.removeEventListener("touchmove",a),document.removeEventListener("wheel",a)}})})();})();
