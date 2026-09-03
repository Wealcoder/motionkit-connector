(()=>{var w={DRAFT:"draft",PREVIEW:"preview",PUBLISHED:"published"},O=[w.DRAFT,w.PREVIEW,w.PUBLISHED];function H(i){return!i||typeof i!="object"?w.PUBLISHED:O.indexOf(i.status)!==-1?i.status:i.isPublished===!1?w.DRAFT:w.PUBLISHED}function L(i){return H(i)!==w.DRAFT}var x="__motionkitPresetHandlers";function D(){return typeof window=="undefined"?new Map:(window[x]||(window[x]=new Map),window[x])}function _(i,c){if(!i||typeof c!="function")return;let f=D();if(f.has(i))return;let d=c()||{};f.set(i,{key:i,run:typeof d.run=="function"?d.run:function(){},teardown:typeof d.teardown=="function"?d.teardown:function(){}})}var B="motionkit-mk-popup-media-pa",b="motionkit-popup-media",X=`
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
`;if(typeof window!="undefined"&&!customElements.get(b)){class i extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}}customElements.define(b,i)}function P(){var i,c;return((c=(i=window.ScrollSmoother)==null?void 0:i.get)==null?void 0:c.call(i))||null}function Z(i){let c=i.getBoundingClientRect(),f=window.innerHeight||document.documentElement.clientHeight,d=window.innerWidth||document.documentElement.clientWidth;return c.bottom>0&&c.top<f&&c.right>0&&c.left<d}function q(i){let c=P();if(c){c.paused(!0);return}let f=document.body.style;f.overflow="hidden",f.height="100%",f.position="fixed",f.width="100%",f.top=`-${i}px`}function A(){let i=P();if(i){i.paused(!1);return}let c=document.body.style;c.overflow="",c.height="",c.position="",c.width="",c.top=""}function Y(){let i=new Map;function c(t){let e=[/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,/(?:youtube\.com\/embed\/)([^?]+)/,/(?:youtube\.com\/v\/)([^?]+)/,/(?:youtube\.com\/watch\?.*v=)([^&]+)/];for(let n of e){let o=t.match(n);if(o&&o[1])return o[1]}return null}function f(t){let e={from:{scale:.7,opacity:0},to:{scale:1,opacity:1,duration:.4,ease:"back.out(1.7)"}};switch(t){case"left":e.from.x="-100%",e.to.x="0%";break;case"right":e.from.x="100%",e.to.x="0%";break;case"top":e.from.y="-100%",e.to.y="0%";break;case"bottom":e.from.y="100%",e.to.y="0%";break;case"rotate_top_left":e.from.rotationZ=-180,e.from.rotationX=-180,e.from.transformOrigin="0 0",e.to.rotationZ=0,e.to.rotationX=0;break;case"rotate_top_right":e.from.rotationZ=-180,e.from.rotationX=-180,e.from.transformOrigin="100% 0",e.to.rotationZ=0,e.to.rotationX=0;break;case"rotate_bottom_left":e.from.rotationZ=-180,e.from.rotationX=-180,e.from.transformOrigin="0 100%",e.to.rotationZ=0,e.to.rotationX=0;break;case"rotate_bottom_right":e.from.rotationZ=-180,e.from.rotationX=-180,e.from.transformOrigin="100% 100%",e.to.rotationZ=0,e.to.rotationX=0;break;case"rotate_center":e.from.rotationZ=-180,e.from.rotationX=-180,e.to.rotationZ=0,e.to.rotationX=0;break;default:break}return e}function d(t){return t.preventDefault(),t.stopPropagation(),!1}function C(t){let e=document.createElement("div");e.className="motionkit-popup-video-wrapper";let n=document.createElement("div");n.className="motionkit-popup-video-container";let o=document.createElement("video");o.className="motionkit-popup-video",o.preload="auto",o.playsInline=!0,o.setAttribute("playsinline","");let a=document.createElement("source");a.src=t,a.type="video/mp4",o.appendChild(a);let r=document.createElement("button");r.className="motionkit-popup-play-btn",r.type="button";let m=()=>{if(o.paused){let p=o.play();p!==void 0&&p.then(()=>r.classList.add("motionkit-playing")).catch(s=>console.warn("[popupMedia] playback failed:",s))}else o.pause(),r.classList.remove("motionkit-playing")};o.addEventListener("click",m),r.addEventListener("click",p=>{p.stopPropagation(),m()}),o.addEventListener("play",()=>{r.classList.add("motionkit-playing"),r.style.display="none"}),o.addEventListener("pause",()=>{r.classList.remove("motionkit-playing"),r.style.display="flex"}),o.addEventListener("ended",()=>{r.classList.remove("motionkit-playing"),r.style.display="flex",o.currentTime=0});let h=()=>{o.muted=!0;let p=o.play();p!==void 0&&p.then(()=>{var s;(s=navigator.userActivation)!=null&&s.hasBeenActive&&(o.muted=!1)}).catch(s=>{console.warn("[popupMedia] autoplay blocked:",s),r.style.display="flex"})};return n.appendChild(o),n.appendChild(r),e.appendChild(n),e._mkAutoplay=h,e}function M(t,e){switch(t){case"image":{let n=document.createElement("img");return n.src=e,n.alt="Popup Image",n.className="motionkit-popup-media",n}case"youtube":{let n=document.createElement("div");n.className="motionkit-youtube-container";let o=c(e);if(!o)return console.warn("[popupMedia] invalid YouTube URL:",e),null;let a=document.createElement("iframe");return a.className="motionkit-youtube-video",a.src=`https://www.youtube.com/embed/${o}?autoplay=1&rel=0`,a.allowFullscreen=!0,a.referrerPolicy="strict-origin-when-cross-origin",a.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",n.appendChild(a),n}case"video":return C(e);default:return console.warn(`[popupMedia] unknown mediaType "${t}"`),null}}function E(t,e=!1){var s,u,l;if(!t||!t.parentNode)return;let n=t.shadowRoot,o=parseInt(t.dataset.scrollPosition||"0",10);(s=n==null?void 0:n.querySelector("video"))==null||s.pause();let a=n==null?void 0:n.querySelector("iframe");a&&a.parentNode&&a.parentNode.removeChild(a),(l=(u=n==null?void 0:n.activeElement)==null?void 0:u.blur)==null||l.call(u),document.activeElement===t&&document.activeElement.blur(),A(),P()||window.scrollTo(0,o),document.removeEventListener("touchmove",d),document.removeEventListener("wheel",d);let r=n==null?void 0:n.querySelector(".motionkit-popup-overlay");r&&(r.style.pointerEvents="none");let m=t._wcfTimeline,h=!1,p=()=>{var g;h||(h=!0,(g=t.parentNode)==null||g.removeChild(t))};m&&!e?(m.eventCallback("onReverseComplete",p),m.reverse(),setTimeout(p,1500)):(m&&m.kill(),p())}function I({mediaType:t,mediaUrl:e,animateFrom:n,popupId:o}){var k;if(!t||!e)return;document.querySelectorAll(b).forEach(v=>E(v,!0));let a=window.pageYOffset,r=document.createElement(b);r.classList.add("motionkit-skip-selector-full"),r.dataset.popupId=o,r.dataset.scrollPosition=String(a);let m=r.shadowRoot,h=document.createElement("style");h.textContent=X,m.appendChild(h);let p=document.createElement("div");p.className="motionkit-popup-overlay";let s=document.createElement("div");s.className="motionkit-popup-content",t==="image"&&s.classList.add("motionkit-popup-content--image");let u=document.createElement("button");u.className="motionkit-popup-close",u.type="button",u.setAttribute("aria-label","Close"),u.addEventListener("mousedown",v=>v.preventDefault());let l=M(t,e);if(!l)return;s.appendChild(l),s.appendChild(u),p.appendChild(s),m.appendChild(p),document.body.appendChild(r),(k=l._mkAutoplay)==null||k.call(l),q(a),document.addEventListener("touchmove",d,{passive:!1}),document.addEventListener("wheel",d,{passive:!1});let{from:g,to:y}=f(n);r._wcfTimeline=gsap.timeline().set(p,{visibility:"visible"}).to(p,{opacity:1,duration:.3}).fromTo(s,g,y,"-=0.2"),p.addEventListener("click",v=>{(v.target===p||v.target.classList.contains("motionkit-popup-close"))&&E(r)})}function S(t){var e;(e=window.ScrollTrigger)!=null&&e.getAll&&window.ScrollTrigger.getAll().forEach(n=>{var a;let o=(a=n.vars)==null?void 0:a.mkPopupId;o!==void 0&&(t===void 0||o===t)&&n.kill()})}function T(t){var n;S(t);let e=i.get(t);e&&(e.teardowns.forEach(o=>{try{o()}catch(a){console.warn("[popupMedia] teardown error:",a)}}),(n=e.scrollTriggers)==null||n.forEach(o=>o==null?void 0:o.kill()),i.delete(t))}function N(){for(let t of[...i.keys()])T(t);S(),document.querySelectorAll(b).forEach(t=>E(t,!0)),A(),document.removeEventListener("touchmove",d),document.removeEventListener("wheel",d)}function R(t){if(!t||!L(t))return;let{id:e,mediaType:n,mediaUrl:o,trigger:{type:a,selector:r}={},vars:{animateFrom:m="center"}={}}=t;if(!n||!o){console.warn("[popupMedia] missing mediaType or mediaUrl");return}if(T(e),t.mkInert&&a==="page_load")return;let h=[],p=[],s=()=>I({mediaType:n,mediaUrl:o,animateFrom:m,popupId:e});if(a==="page_load"){let u=setTimeout(s,500);h.push(()=>clearTimeout(u))}else{if(!r){console.warn(`[popupMedia] trigger.selector required for triggerType "${a}"`);return}let u;try{u=document.querySelectorAll(r)}catch(l){console.warn(`[popupMedia] invalid trigger selector "${r}":`,l.message);return}if(!u.length){console.warn(`[popupMedia] no elements match "${r}"`);return}u.forEach(l=>{if(l.setAttribute("data-motionkit-anim-id",e),!t.mkInert)switch(a){case"click":l.addEventListener("click",s),h.push(()=>l.removeEventListener("click",s));break;case"hover":l.addEventListener("mouseenter",s),h.push(()=>l.removeEventListener("mouseenter",s));break;case"on_scroll":{if(!window.ScrollTrigger){console.warn("[popupMedia] ScrollTrigger not loaded");return}let g=!1,y=window.ScrollTrigger.create({trigger:l,start:"top 80%",onEnter:k=>{!g&&!Z(l)||(k.kill(),s())}});g=!0,y.vars.mkPopupId=e,p.push(y);break}}})}i.set(e,{teardowns:h,scrollTriggers:p})}return{run:R,teardown:N}}_(B,Y);})();
