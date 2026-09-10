(()=>{var B="__motionkitPresetHandlers";function U(){return typeof window=="undefined"?new Map:(window[B]||(window[B]=new Map),window[B])}function R(t,e){if(!t||typeof e!="function")return;let s=U();if(s.has(t))return;let c=e()||{};s.set(t,{key:t,run:typeof c.run=="function"?c.run:function(){},teardown:typeof c.teardown=="function"?c.teardown:function(){}})}var E={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},z=[E.DRAFT,E.SAVED,E.PUBLISHED],V="preview";function j(t){return!t||typeof t!="object"?E.PUBLISHED:z.indexOf(t.status)!==-1?t.status:t.status===V||t.isPublished===!1?E.SAVED:E.PUBLISHED}function D(t){return j(t)!==E.DRAFT}function F(){return typeof window=="undefined"?{}:window.__motionkitHostData||window.motionkitData||{}}function N(){return F().motionkit_token||null}var O=()=>typeof window=="undefined"?!1:window.location.search.includes("action=motionkit-editor")?!0:!!N();var _="__motionkitOwnership";function A(){let t=typeof window!="undefined"?window:globalThis;return t[_]||(t[_]={ownerByEl:new WeakMap,elsByAnim:new Map,animsByAnim:new Map,resetByAnim:new Map}),t[_]}A();function H(t,e){t&&A().animsByAnim.set(t,e||[])}function q(t,e){!t||typeof e!="function"||A().resetByAnim.set(t,e)}function I(t,e,s){let c=t.elsByAnim.get(e);c||(c=new Set,t.elsByAnim.set(e,c)),c.add(s)}function L(t,e){if(!e||!t||!t.length)return!1;let s=A(),c=new Map;return t.forEach(o=>{var i;if(!o)return;let p=s.ownerByEl.get(o);p&&p!==e&&(c.has(p)||c.set(p,[]),c.get(p).push(o)),s.ownerByEl.set(o,e),I(s,e,o),(i=o.setAttribute)==null||i.call(o,"data-motionkit-anim-id",e)}),c.size?(c.forEach((o,p)=>{(s.animsByAnim.get(p)||[]).forEach(m=>{var l;try{(l=m.pause)==null||l.call(m)}catch(r){}});let i=s.resetByAnim.get(p);if(i)try{i(o)}catch(m){console.warn("[motionkit] ownership reset error:",m)}}),!0):!1}function $(t){let e=A(),s=e.elsByAnim.get(t);s&&(s.forEach(c=>{e.ownerByEl.get(c)===t&&e.ownerByEl.delete(c)}),e.elsByAnim.delete(t)),e.animsByAnim.delete(t),e.resetByAnim.delete(t)}var K="data-motionkit-anim-id",J=["h1","h2","h3","h4","h5","h6","p","span","div","a","img","video","button","li","ul","ol","section","article","header","footer","nav","main","aside"];function Q(t){if(!t||typeof t!="string")return"";let e=t.trim();return e.startsWith(".")||e.startsWith("#")||e.startsWith("[")||e.startsWith(":")||e.includes(" ")||e.includes(">")||e.includes(",")||J.includes(e.toLowerCase())?e:"."+e}var W=new Set;function ee(t,e,s){let c=t+"|"+e;W.has(c)||(W.add(c),console.warn(`[${t}] ${s}`))}function P(t,e,s){if(!e||typeof e!="string")return[];let c=s||document,o=Q(e);try{let p=c.querySelectorAll(o);if(p.length||o===e)return[...p]}catch(p){}try{return[...c.querySelectorAll(e)]}catch(p){return ee(t,e,`invalid selector "${e}": ${p.message}`),[]}}function te(){return{listeners:[],scrollTriggers:[],animations:[],elements:[],tweenRestores:[],structuralRestores:[],splits:[],cleanups:[]}}function k(t,e,s){try{s()}catch(c){console.warn(`[${t}] ${e} teardown error:`,c)}}function X(t,e,s){s.listeners.forEach(({el:o,type:p,fn:i,opts:m})=>k(t,"listener",()=>o.removeEventListener(p,i,m))),s.scrollTriggers.forEach(o=>k(t,"scrollTrigger",()=>o==null?void 0:o.kill()));let c=typeof window!="undefined"&&window.ScrollTrigger?window.ScrollTrigger.getById(e):null;c&&k(t,"scrollTrigger",()=>c.kill()),s.animations.forEach(o=>k(t,"animation",()=>{var p,i;(p=o==null?void 0:o.revert)==null||p.call(o),(i=o==null?void 0:o.kill)==null||i.call(o)})),s.elements.forEach(o=>k(t,"element",()=>{var p;return(p=o==null?void 0:o.remove)==null?void 0:p.call(o)})),s.tweenRestores.forEach(o=>k(t,"style",o)),s.structuralRestores.forEach(o=>k(t,"style",o)),s.splits.forEach(o=>k(t,"split",()=>{var p;return(p=o==null?void 0:o.revert)==null?void 0:p.call(o)}));for(let o=s.cleanups.length-1;o>=0;o--)k(t,"cleanup",s.cleanups[o])}function oe(t,e,s,c,o){var p;return{id:e.id,targets:s,data:c,vars:e.vars||{},markers:((p=e.vars)==null?void 0:p.markers)===!0&&O(),get triggers(){var l;let i=((l=e.trigger)==null?void 0:l.selector)||e.triggerClass,m=i?P(t,i):[];return m.length?m:s},select:(i,m)=>P(t,i,m),on(i,m,l,r){i&&(i.addEventListener(m,l,r),o.listeners.push({el:i,type:m,fn:l,opts:r}))},add(i){return i&&o.animations.push(i),i},addScrollTrigger(i){return i&&o.scrollTriggers.push(i),i},addElement(i){return i&&o.elements.push(i),i},addSplit(i){return i&&o.splits.push(i),i},clearProps(i,m){i&&o.tweenRestores.push(()=>gsap.set(i,{clearProps:m}))},restoreStyle(i,m){if(!i)return;let l={};m.forEach(r=>l[r]=i.style[r]),o.structuralRestores.push(()=>{m.forEach(r=>{var n;return i.style[r]=(n=l[r])!=null?n:""})})},claim(){let i=L(s,e.id);return i&&o.animations.forEach(m=>{var l;try{(l=m.invalidate)==null||l.call(m)}catch(r){}}),i},onCleanup(i){typeof i=="function"&&o.cleanups.push(i)}}}function Y(t,e){let s=e.label||t,c=e.requires||["itemClass"];R(t,function(){let o=new Map;function p(l){let r=o.get(l);r&&(o.delete(l),$(l),X(s,l,r))}function i(){for(let l of[...o.keys()])p(l);typeof e.teardownGlobal=="function"&&k(s,"global",e.teardownGlobal)}function m(l){var d,y;if(!l||typeof l!="object"||!D(l)||c.some(g=>!l[g]))return;let r,n=null;if(typeof e.resolve=="function"){let g=e.resolve(l,{select:(h,w)=>P(s,h,w)});if(Array.isArray(g)?r=g:g&&(r=g.targets,n=(d=g.data)!=null?d:null),!r)return}else if(r=P(s,l.itemClass),!r.length)return;if(p(l.id),r.forEach(g=>g.setAttribute(K,l.id)),l.mkInert)return;let a=te(),u=oe(s,l,r,n,a);try{e.build(l,u)}catch(g){console.error(`[${s}] build failed:`,g),X(s,l.id,a);return}o.set(l.id,a),H(l.id,a.animations),q(l.id,()=>a.tweenRestores.forEach(g=>k(s,"ownership reset",g)));let f=(y=l.trigger)==null?void 0:y.type;f!=="click"&&f!=="hover"&&L(r,l.id)}return{run:m,teardown:i}})}var ne="motionkit-mk-popup-media-pa",T="motionkit-popup-media",re=`
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
`;if(typeof window!="undefined"&&!customElements.get(T)){class t extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}}customElements.define(T,t)}function C(){var t,e;return((e=(t=window.ScrollSmoother)==null?void 0:t.get)==null?void 0:e.call(t))||null}function ie(t){let e=t.getBoundingClientRect(),s=window.innerHeight||document.documentElement.clientHeight,c=window.innerWidth||document.documentElement.clientWidth;return e.bottom>0&&e.top<s&&e.right>0&&e.left<c}function se(t){let e=C();if(e){e.paused(!0);return}let s=document.body.style;s.overflow="hidden",s.height="100%",s.position="fixed",s.width="100%",s.top=`-${t}px`}function Z(){let t=C();if(t){t.paused(!1);return}let e=document.body.style;e.overflow="",e.height="",e.position="",e.width="",e.top=""}(function(){function e(r){let n=[/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,/(?:youtube\.com\/embed\/)([^?]+)/,/(?:youtube\.com\/v\/)([^?]+)/,/(?:youtube\.com\/watch\?.*v=)([^&]+)/];for(let a of n){let u=r.match(a);if(u&&u[1])return u[1]}return null}function s(r){let n={from:{scale:.7,opacity:0},to:{scale:1,opacity:1,duration:.4,ease:"back.out(1.7)"}};switch(r){case"left":n.from.x="-100%",n.to.x="0%";break;case"right":n.from.x="100%",n.to.x="0%";break;case"top":n.from.y="-100%",n.to.y="0%";break;case"bottom":n.from.y="100%",n.to.y="0%";break;case"rotate_top_left":n.from.rotationZ=-180,n.from.rotationX=-180,n.from.transformOrigin="0 0",n.to.rotationZ=0,n.to.rotationX=0;break;case"rotate_top_right":n.from.rotationZ=-180,n.from.rotationX=-180,n.from.transformOrigin="100% 0",n.to.rotationZ=0,n.to.rotationX=0;break;case"rotate_bottom_left":n.from.rotationZ=-180,n.from.rotationX=-180,n.from.transformOrigin="0 100%",n.to.rotationZ=0,n.to.rotationX=0;break;case"rotate_bottom_right":n.from.rotationZ=-180,n.from.rotationX=-180,n.from.transformOrigin="100% 100%",n.to.rotationZ=0,n.to.rotationX=0;break;case"rotate_center":n.from.rotationZ=-180,n.from.rotationX=-180,n.to.rotationZ=0,n.to.rotationX=0;break;default:break}return n}function c(r){return r.preventDefault(),r.stopPropagation(),!1}function o(r){let n=document.createElement("div");n.className="motionkit-popup-video-wrapper";let a=document.createElement("div");a.className="motionkit-popup-video-container";let u=document.createElement("video");u.className="motionkit-popup-video",u.preload="auto",u.playsInline=!0,u.setAttribute("playsinline","");let f=document.createElement("source");f.src=r,f.type="video/mp4",u.appendChild(f);let d=document.createElement("button");d.className="motionkit-popup-play-btn",d.type="button";let y=()=>{if(u.paused){let h=u.play();h!==void 0&&h.then(()=>d.classList.add("motionkit-playing")).catch(w=>console.warn("[popupMedia] playback failed:",w))}else u.pause(),d.classList.remove("motionkit-playing")};u.addEventListener("click",y),d.addEventListener("click",h=>{h.stopPropagation(),y()}),u.addEventListener("play",()=>{d.classList.add("motionkit-playing"),d.style.display="none"}),u.addEventListener("pause",()=>{d.classList.remove("motionkit-playing"),d.style.display="flex"}),u.addEventListener("ended",()=>{d.classList.remove("motionkit-playing"),d.style.display="flex",u.currentTime=0});let g=()=>{u.muted=!0;let h=u.play();h!==void 0&&h.then(()=>{var w;(w=navigator.userActivation)!=null&&w.hasBeenActive&&(u.muted=!1)}).catch(w=>{console.warn("[popupMedia] autoplay blocked:",w),d.style.display="flex"})};return a.appendChild(u),a.appendChild(d),n.appendChild(a),n._mkAutoplay=g,n}function p(r,n){switch(r){case"image":{let a=document.createElement("img");return a.src=n,a.alt="Popup Image",a.className="motionkit-popup-media",a}case"youtube":{let a=document.createElement("div");a.className="motionkit-youtube-container";let u=e(n);if(!u)return console.warn("[popupMedia] invalid YouTube URL:",n),null;let f=document.createElement("iframe");return f.className="motionkit-youtube-video",f.src=`https://www.youtube.com/embed/${u}?autoplay=1&rel=0`,f.allowFullscreen=!0,f.referrerPolicy="strict-origin-when-cross-origin",f.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",a.appendChild(f),a}case"video":return o(n);default:return console.warn(`[popupMedia] unknown mediaType "${r}"`),null}}function i(r,n=!1){var w,v,b;if(!r||!r.parentNode)return;let a=r.shadowRoot,u=parseInt(r.dataset.scrollPosition||"0",10);(w=a==null?void 0:a.querySelector("video"))==null||w.pause();let f=a==null?void 0:a.querySelector("iframe");f&&f.parentNode&&f.parentNode.removeChild(f),(b=(v=a==null?void 0:a.activeElement)==null?void 0:v.blur)==null||b.call(v),document.activeElement===r&&document.activeElement.blur(),Z(),C()||window.scrollTo(0,u),document.removeEventListener("touchmove",c),document.removeEventListener("wheel",c);let d=a==null?void 0:a.querySelector(".motionkit-popup-overlay");d&&(d.style.pointerEvents="none");let y=r._wcfTimeline,g=!1,h=()=>{var S;g||(g=!0,(S=r.parentNode)==null||S.removeChild(r))};y&&!n?(y.eventCallback("onReverseComplete",h),y.reverse(),setTimeout(h,1500)):(y&&y.kill(),h())}function m({mediaType:r,mediaUrl:n,animateFrom:a,popupId:u}){var M;if(!r||!n)return;document.querySelectorAll(T).forEach(x=>i(x,!0));let f=window.pageYOffset,d=document.createElement(T);d.classList.add("motionkit-skip-selector-full"),d.dataset.popupId=u,d.dataset.scrollPosition=String(f);let y=d.shadowRoot,g=document.createElement("style");g.textContent=re,y.appendChild(g);let h=document.createElement("div");h.className="motionkit-popup-overlay";let w=document.createElement("div");w.className="motionkit-popup-content",r==="image"&&w.classList.add("motionkit-popup-content--image");let v=document.createElement("button");v.className="motionkit-popup-close",v.type="button",v.setAttribute("aria-label","Close"),v.addEventListener("mousedown",x=>x.preventDefault());let b=p(r,n);if(!b)return;w.appendChild(b),w.appendChild(v),h.appendChild(w),y.appendChild(h),document.body.appendChild(d),(M=b._mkAutoplay)==null||M.call(b),se(f),document.addEventListener("touchmove",c,{passive:!1}),document.addEventListener("wheel",c,{passive:!1});let{from:S,to:G}=s(a);d._wcfTimeline=gsap.timeline().set(h,{visibility:"visible"}).to(h,{opacity:1,duration:.3}).fromTo(w,S,G,"-=0.2"),h.addEventListener("click",x=>{(x.target===h||x.target.classList.contains("motionkit-popup-close"))&&i(d)})}function l(r){var n;(n=window.ScrollTrigger)!=null&&n.getAll&&window.ScrollTrigger.getAll().forEach(a=>{var f;let u=(f=a.vars)==null?void 0:f.mkPopupId;u!==void 0&&(r===void 0||u===r)&&a.kill()})}Y(ne,{label:"popupMedia",requires:[],resolve(r,{select:n}){var d,y;let a=(d=r.trigger)==null?void 0:d.type;if(a==="page_load")return[];let u=(y=r.trigger)==null?void 0:y.selector;if(!u)return console.warn(`[popupMedia] trigger.selector required for triggerType "${a}"`),null;let f=n(u);return f.length?f:(console.warn(`[popupMedia] no elements match "${u}"`),null)},build(r,n){let{id:a,mediaType:u,mediaUrl:f,trigger:{type:d}={},vars:{animateFrom:y="center"}={}}=r;if(!u||!f){console.warn("[popupMedia] missing mediaType or mediaUrl");return}l(a);let g=()=>m({mediaType:u,mediaUrl:f,animateFrom:y,popupId:a});if(d==="page_load"){let h=setTimeout(g,500);n.onCleanup(()=>clearTimeout(h));return}n.targets.forEach(h=>{switch(d){case"click":n.on(h,"click",g);break;case"hover":n.on(h,"mouseenter",g);break;case"on_scroll":{if(!window.ScrollTrigger){console.warn("[popupMedia] ScrollTrigger not loaded");return}let w=!1,v=window.ScrollTrigger.create({trigger:h,start:"top 80%",onEnter:b=>{!w&&!ie(h)||(b.kill(),g())}});w=!0,v.vars.mkPopupId=a,n.addScrollTrigger(v);break}}})},teardownGlobal(){l(),document.querySelectorAll(T).forEach(r=>i(r,!0)),Z(),document.removeEventListener("touchmove",c),document.removeEventListener("wheel",c)}})})();})();
