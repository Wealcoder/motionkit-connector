(()=>{var L="__motionkitPresetHandlers";function V(){return typeof window=="undefined"?new Map:(window[L]||(window[L]=new Map),window[L])}function R(t,e){if(!t||typeof e!="function")return;let r=V();if(r.has(t))return;let c=e()||{};r.set(t,{key:t,run:typeof c.run=="function"?c.run:function(){},teardown:typeof c.teardown=="function"?c.teardown:function(){}})}var b={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},j=[b.DRAFT,b.SAVED,b.PUBLISHED],J="preview";function Q(t){return!t||typeof t!="object"?b.PUBLISHED:j.indexOf(t.status)!==-1?t.status:t.status===J||t.isPublished===!1?b.SAVED:b.PUBLISHED}function N(t){return Q(t)!==b.DRAFT}function ee(){return typeof window=="undefined"?{}:window.__motionkitHostData||window.motionkitData||{}}function H(){return ee().motionkit_token||null}var O=()=>typeof window=="undefined"?!1:window.location.search.includes("action=motionkit-editor")?!0:!!H();var P="__motionkitOwnership";function A(){let t=typeof window!="undefined"?window:globalThis;return t[P]||(t[P]={ownerByEl:new WeakMap,elsByAnim:new Map,animsByAnim:new Map,resetByAnim:new Map}),t[P]}A();function q(t,e){t&&A().animsByAnim.set(t,e||[])}function U(t,e){!t||typeof e!="function"||A().resetByAnim.set(t,e)}function te(t,e,r){let c=t.elsByAnim.get(e);c||(c=new Set,t.elsByAnim.set(e,c)),c.add(r)}function B(t,e){if(!e||!t||!t.length)return!1;let r=A(),c=new Map;return t.forEach(o=>{var s;if(!o)return;let d=r.ownerByEl.get(o);d&&d!==e&&(c.has(d)||c.set(d,[]),c.get(d).push(o)),r.ownerByEl.set(o,e),te(r,e,o),(s=o.setAttribute)==null||s.call(o,"data-motionkit-anim-id",e)}),c.size?(c.forEach((o,d)=>{(r.animsByAnim.get(d)||[]).forEach(g=>{var l;try{(l=g.pause)==null||l.call(g)}catch(i){}});let s=r.resetByAnim.get(d);if(s)try{s(o)}catch(g){console.warn("[motionkit] ownership reset error:",g)}}),!0):!1}function $(t){let e=A(),r=e.elsByAnim.get(t);r&&(r.forEach(c=>{e.ownerByEl.get(c)===t&&e.ownerByEl.delete(c)}),e.elsByAnim.delete(t)),e.animsByAnim.delete(t),e.resetByAnim.delete(t)}var C="__motionkitScreen";function Y(t){let e=t||(typeof window!="undefined"?window:null);return e?(e[C]||(e[C]={held:!1,queue:[],deadline:12e3}),e[C]):{held:!1,queue:[],deadline:12e3}}function F(t){try{t()}catch(e){console.error("[motionkit] a screen-release waiter threw",e)}}function G(t){return Y(t).held===!0}function I(t,e){let r=Y(t);if(!r.held){F(e);return}let c=!1,o=()=>{c||(c=!0,F(e))};r.queue.push(o);let d=t||window;d&&typeof d.setTimeout=="function"&&d.setTimeout(o,r.deadline+400)}var oe="data-motionkit-anim-id",ne=["h1","h2","h3","h4","h5","h6","p","span","div","a","img","video","button","li","ul","ol","section","article","header","footer","nav","main","aside"];function re(t){if(!t||typeof t!="string")return"";let e=t.trim();return e.startsWith(".")||e.startsWith("#")||e.startsWith("[")||e.startsWith(":")||e.includes(" ")||e.includes(">")||e.includes(",")||ne.includes(e.toLowerCase())?e:"."+e}var W=new Set;function ie(t,e,r){let c=t+"|"+e;W.has(c)||(W.add(c),console.warn(`[${t}] ${r}`))}function _(t,e,r){if(!e||typeof e!="string")return[];let c=r||document,o=re(e);try{let d=c.querySelectorAll(o);if(d.length||o===e)return[...d]}catch(d){}try{return[...c.querySelectorAll(e)]}catch(d){return ie(t,e,`invalid selector "${e}": ${d.message}`),[]}}function se(){return{listeners:[],scrollTriggers:[],animations:[],elements:[],tweenRestores:[],structuralRestores:[],splits:[],cleanups:[]}}function k(t,e,r){try{r()}catch(c){console.warn(`[${t}] ${e} teardown error:`,c)}}function X(t,e,r){r.listeners.forEach(({el:o,type:d,fn:s,opts:g})=>k(t,"listener",()=>o.removeEventListener(d,s,g))),r.scrollTriggers.forEach(o=>k(t,"scrollTrigger",()=>o==null?void 0:o.kill()));let c=typeof window!="undefined"&&window.ScrollTrigger?window.ScrollTrigger.getById(e):null;c&&k(t,"scrollTrigger",()=>c.kill()),r.animations.forEach(o=>k(t,"animation",()=>{var d,s;(d=o==null?void 0:o.revert)==null||d.call(o),(s=o==null?void 0:o.kill)==null||s.call(o)})),r.elements.forEach(o=>k(t,"element",()=>{var d;return(d=o==null?void 0:o.remove)==null?void 0:d.call(o)})),r.tweenRestores.forEach(o=>k(t,"style",o)),r.structuralRestores.forEach(o=>k(t,"style",o)),r.splits.forEach(o=>k(t,"split",()=>{var d;return(d=o==null?void 0:o.revert)==null?void 0:d.call(o)}));for(let o=r.cleanups.length-1;o>=0;o--)k(t,"cleanup",r.cleanups[o])}function ae(t,e,r,c,o){var d;return{id:e.id,targets:r,data:c,vars:e.vars||{},markers:((d=e.vars)==null?void 0:d.markers)===!0&&O(),get triggers(){var l;let s=((l=e.trigger)==null?void 0:l.selector)||e.triggerClass,g=s?_(t,s):[];return g.length?g:r},select:(s,g)=>_(t,s,g),on(s,g,l,i){s&&(s.addEventListener(g,l,i),o.listeners.push({el:s,type:g,fn:l,opts:i}))},add(s){return s&&o.animations.push(s),s},addScrollTrigger(s){return s&&o.scrollTriggers.push(s),s},addElement(s){return s&&o.elements.push(s),s},addSplit(s){return s&&o.splits.push(s),s},clearProps(s,g){s&&o.tweenRestores.push(()=>gsap.set(s,{clearProps:g}))},restoreStyle(s,g){if(!s)return;let l={};g.forEach(i=>l[i]=s.style[i]),o.structuralRestores.push(()=>{g.forEach(i=>{var n;return s.style[i]=(n=l[i])!=null?n:""})})},claim(){let s=B(r,e.id);return s&&o.animations.forEach(g=>{var l;try{(l=g.invalidate)==null||l.call(g)}catch(i){}}),s},onCleanup(s){typeof s=="function"&&o.cleanups.push(s)}}}function Z(t,e){let r=e.label||t,c=e.requires||["itemClass"];R(t,function(){let o=new Map;function d(l){let i=o.get(l);i&&(o.delete(l),$(l),X(r,l,i))}function s(){for(let l of[...o.keys()])d(l);typeof e.teardownGlobal=="function"&&k(r,"global",e.teardownGlobal)}function g(l){var m,y;if(!l||typeof l!="object"||!N(l)||c.some(p=>!l[p]))return;let i,n=null;if(typeof e.resolve=="function"){let p=e.resolve(l,{select:(f,w)=>_(r,f,w)});if(Array.isArray(p)?i=p:p&&(i=p.targets,n=(m=p.data)!=null?m:null),!i)return}else if(i=_(r,l.itemClass),!i.length)return;if(d(l.id),i.forEach(p=>p.setAttribute(oe,l.id)),l.mkInert)return;let a=se(),u=ae(r,l,i,n,a);try{e.build(l,u)}catch(p){console.error(`[${r}] build failed:`,p),X(r,l.id,a);return}o.set(l.id,a),q(l.id,a.animations),U(l.id,()=>a.tweenRestores.forEach(p=>k(r,"ownership reset",p)));let h=(y=l.trigger)==null?void 0:y.type;h!=="click"&&h!=="hover"&&B(i,l.id),h==="page_load"&&G(window)&&(a.animations.forEach(p=>k(r,"screen gate pause",()=>{var f;return(f=p==null?void 0:p.pause)==null?void 0:f.call(p)})),I(window,()=>{o.get(l.id)===a&&a.animations.forEach(p=>k(r,"screen gate play",()=>{var f;return(f=p==null?void 0:p.play)==null?void 0:f.call(p,0)}))}))}return{run:g,teardown:s}})}var ce="motionkit-mk-popup-media-pa",S="motionkit-popup-media",le=`
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
`;if(typeof window!="undefined"&&!customElements.get(S)){class t extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}}customElements.define(S,t)}function M(){var t,e;return((e=(t=window.ScrollSmoother)==null?void 0:t.get)==null?void 0:e.call(t))||null}function ue(t){let e=t.getBoundingClientRect(),r=window.innerHeight||document.documentElement.clientHeight,c=window.innerWidth||document.documentElement.clientWidth;return e.bottom>0&&e.top<r&&e.right>0&&e.left<c}function pe(t){let e=M();if(e){e.paused(!0);return}let r=document.body.style;r.overflow="hidden",r.height="100%",r.position="fixed",r.width="100%",r.top=`-${t}px`}function z(){let t=M();if(t){t.paused(!1);return}let e=document.body.style;e.overflow="",e.height="",e.position="",e.width="",e.top=""}(function(){function e(i){let n=[/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,/(?:youtube\.com\/embed\/)([^?]+)/,/(?:youtube\.com\/v\/)([^?]+)/,/(?:youtube\.com\/watch\?.*v=)([^&]+)/];for(let a of n){let u=i.match(a);if(u&&u[1])return u[1]}return null}function r(i){let n={from:{scale:.7,opacity:0},to:{scale:1,opacity:1,duration:.4,ease:"back.out(1.7)"}};switch(i){case"left":n.from.x="-100%",n.to.x="0%";break;case"right":n.from.x="100%",n.to.x="0%";break;case"top":n.from.y="-100%",n.to.y="0%";break;case"bottom":n.from.y="100%",n.to.y="0%";break;case"rotate_top_left":n.from.rotationZ=-180,n.from.rotationX=-180,n.from.transformOrigin="0 0",n.to.rotationZ=0,n.to.rotationX=0;break;case"rotate_top_right":n.from.rotationZ=-180,n.from.rotationX=-180,n.from.transformOrigin="100% 0",n.to.rotationZ=0,n.to.rotationX=0;break;case"rotate_bottom_left":n.from.rotationZ=-180,n.from.rotationX=-180,n.from.transformOrigin="0 100%",n.to.rotationZ=0,n.to.rotationX=0;break;case"rotate_bottom_right":n.from.rotationZ=-180,n.from.rotationX=-180,n.from.transformOrigin="100% 100%",n.to.rotationZ=0,n.to.rotationX=0;break;case"rotate_center":n.from.rotationZ=-180,n.from.rotationX=-180,n.to.rotationZ=0,n.to.rotationX=0;break;default:break}return n}function c(i){return i.preventDefault(),i.stopPropagation(),!1}function o(i){let n=document.createElement("div");n.className="motionkit-popup-video-wrapper";let a=document.createElement("div");a.className="motionkit-popup-video-container";let u=document.createElement("video");u.className="motionkit-popup-video",u.preload="auto",u.playsInline=!0,u.setAttribute("playsinline","");let h=document.createElement("source");h.src=i,h.type="video/mp4",u.appendChild(h);let m=document.createElement("button");m.className="motionkit-popup-play-btn",m.type="button";let y=()=>{if(u.paused){let f=u.play();f!==void 0&&f.then(()=>m.classList.add("motionkit-playing")).catch(w=>console.warn("[popupMedia] playback failed:",w))}else u.pause(),m.classList.remove("motionkit-playing")};u.addEventListener("click",y),m.addEventListener("click",f=>{f.stopPropagation(),y()}),u.addEventListener("play",()=>{m.classList.add("motionkit-playing"),m.style.display="none"}),u.addEventListener("pause",()=>{m.classList.remove("motionkit-playing"),m.style.display="flex"}),u.addEventListener("ended",()=>{m.classList.remove("motionkit-playing"),m.style.display="flex",u.currentTime=0});let p=()=>{u.muted=!0;let f=u.play();f!==void 0&&f.then(()=>{var w;(w=navigator.userActivation)!=null&&w.hasBeenActive&&(u.muted=!1)}).catch(w=>{console.warn("[popupMedia] autoplay blocked:",w),m.style.display="flex"})};return a.appendChild(u),a.appendChild(m),n.appendChild(a),n._mkAutoplay=p,n}function d(i,n){switch(i){case"image":{let a=document.createElement("img");return a.src=n,a.alt="Popup Image",a.className="motionkit-popup-media",a}case"youtube":{let a=document.createElement("div");a.className="motionkit-youtube-container";let u=e(n);if(!u)return console.warn("[popupMedia] invalid YouTube URL:",n),null;let h=document.createElement("iframe");return h.className="motionkit-youtube-video",h.src=`https://www.youtube.com/embed/${u}?autoplay=1&rel=0`,h.allowFullscreen=!0,h.referrerPolicy="strict-origin-when-cross-origin",h.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",a.appendChild(h),a}case"video":return o(n);default:return console.warn(`[popupMedia] unknown mediaType "${i}"`),null}}function s(i,n=!1){var w,v,E;if(!i||!i.parentNode)return;let a=i.shadowRoot,u=parseInt(i.dataset.scrollPosition||"0",10);(w=a==null?void 0:a.querySelector("video"))==null||w.pause();let h=a==null?void 0:a.querySelector("iframe");h&&h.parentNode&&h.parentNode.removeChild(h),(E=(v=a==null?void 0:a.activeElement)==null?void 0:v.blur)==null||E.call(v),document.activeElement===i&&document.activeElement.blur(),z(),M()||window.scrollTo(0,u),document.removeEventListener("touchmove",c),document.removeEventListener("wheel",c);let m=a==null?void 0:a.querySelector(".motionkit-popup-overlay");m&&(m.style.pointerEvents="none");let y=i._wcfTimeline,p=!1,f=()=>{var T;p||(p=!0,(T=i.parentNode)==null||T.removeChild(i))};y&&!n?(y.eventCallback("onReverseComplete",f),y.reverse(),setTimeout(f,1500)):(y&&y.kill(),f())}function g({mediaType:i,mediaUrl:n,animateFrom:a,popupId:u}){var D;if(!i||!n)return;document.querySelectorAll(S).forEach(x=>s(x,!0));let h=window.pageYOffset,m=document.createElement(S);m.classList.add("motionkit-skip-selector-full"),m.dataset.popupId=u,m.dataset.scrollPosition=String(h);let y=m.shadowRoot,p=document.createElement("style");p.textContent=le,y.appendChild(p);let f=document.createElement("div");f.className="motionkit-popup-overlay";let w=document.createElement("div");w.className="motionkit-popup-content",i==="image"&&w.classList.add("motionkit-popup-content--image");let v=document.createElement("button");v.className="motionkit-popup-close",v.type="button",v.setAttribute("aria-label","Close"),v.addEventListener("mousedown",x=>x.preventDefault());let E=d(i,n);if(!E)return;w.appendChild(E),w.appendChild(v),f.appendChild(w),y.appendChild(f),document.body.appendChild(m),(D=E._mkAutoplay)==null||D.call(E),pe(h),document.addEventListener("touchmove",c,{passive:!1}),document.addEventListener("wheel",c,{passive:!1});let{from:T,to:K}=r(a);m._wcfTimeline=gsap.timeline().set(f,{visibility:"visible"}).to(f,{opacity:1,duration:.3}).fromTo(w,T,K,"-=0.2"),f.addEventListener("click",x=>{(x.target===f||x.target.classList.contains("motionkit-popup-close"))&&s(m)})}function l(i){var n;(n=window.ScrollTrigger)!=null&&n.getAll&&window.ScrollTrigger.getAll().forEach(a=>{var h;let u=(h=a.vars)==null?void 0:h.mkPopupId;u!==void 0&&(i===void 0||u===i)&&a.kill()})}Z(ce,{label:"popupMedia",requires:[],resolve(i,{select:n}){var m,y;let a=(m=i.trigger)==null?void 0:m.type;if(a==="page_load")return[];let u=(y=i.trigger)==null?void 0:y.selector;if(!u)return console.warn(`[popupMedia] trigger.selector required for triggerType "${a}"`),null;let h=n(u);return h.length?h:(console.warn(`[popupMedia] no elements match "${u}"`),null)},build(i,n){let{id:a,mediaType:u,mediaUrl:h,trigger:{type:m}={},vars:{animateFrom:y="center"}={}}=i;if(!u||!h){console.warn("[popupMedia] missing mediaType or mediaUrl");return}l(a);let p=()=>g({mediaType:u,mediaUrl:h,animateFrom:y,popupId:a});if(m==="page_load"){let f=setTimeout(p,500);n.onCleanup(()=>clearTimeout(f));return}n.targets.forEach(f=>{switch(m){case"click":n.on(f,"click",p);break;case"hover":n.on(f,"mouseenter",p);break;case"on_scroll":{if(!window.ScrollTrigger){console.warn("[popupMedia] ScrollTrigger not loaded");return}let w=!1,v=window.ScrollTrigger.create({trigger:f,start:"top 80%",onEnter:E=>{!w&&!ue(f)||(E.kill(),p())}});w=!0,v.vars.mkPopupId=a,n.addScrollTrigger(v);break}}})},teardownGlobal(){l(),document.querySelectorAll(S).forEach(i=>s(i,!0)),z(),document.removeEventListener("touchmove",c),document.removeEventListener("wheel",c)}})})();})();
