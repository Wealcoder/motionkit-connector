(()=>{var g={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},I=[g.DRAFT,g.SAVED,g.PUBLISHED],D="preview";function O(n){return!n||typeof n!="object"?g.PUBLISHED:I.indexOf(n.status)!==-1?n.status:n.status===D||n.isPublished===!1?g.SAVED:g.PUBLISHED}function x(n){return O(n)!==g.DRAFT}var v="__motionkitPresetHandlers";function R(){return typeof window=="undefined"?new Map:(window[v]||(window[v]=new Map),window[v])}function S(n,s){if(!n||typeof s!="function")return;let h=R();if(h.has(n))return;let m=s()||{};h.set(n,{key:n,run:typeof m.run=="function"?m.run:function(){},teardown:typeof m.teardown=="function"?m.teardown:function(){}})}var H="motionkit-mk-popup-media-pa",w="motionkit-popup-media",X=`
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
  }
  .motionkit-popup-content {
    background-color: transparent;
    position: relative;
    max-width: 90%;
    max-height: 90%;
    width: 50vw;
    margin: 20px auto;
  }
  @media (max-width: 768px) {
    .motionkit-popup-content { width: 90vw; }
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
  .motionkit-popup-media {
    max-width: 100%;
    max-height: 80vh;
    display: block;
    width: 100%;
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
`;if(typeof window!="undefined"&&!customElements.get(w)){class n extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}}customElements.define(w,n)}function k(){var n,s;return((s=(n=window.ScrollSmoother)==null?void 0:n.get)==null?void 0:s.call(n))||null}function Z(n){let s=k();if(s){s.paused(!0);return}let h=document.body.style;h.overflow="hidden",h.height="100%",h.position="fixed",h.width="100%",h.top=`-${n}px`}function L(){let n=k();if(n){n.paused(!1);return}let s=document.body.style;s.overflow="",s.height="",s.position="",s.width="",s.top=""}function Y(){let n=new Map;function s(e){let t=[/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,/(?:youtube\.com\/embed\/)([^?]+)/,/(?:youtube\.com\/v\/)([^?]+)/,/(?:youtube\.com\/watch\?.*v=)([^&]+)/];for(let o of t){let r=e.match(o);if(r&&r[1])return r[1]}return null}function h(e){let t={from:{scale:.7,opacity:0},to:{scale:1,opacity:1,duration:.4,ease:"back.out(1.7)"}};switch(e){case"left":t.from.x="-100%",t.to.x="0%";break;case"right":t.from.x="100%",t.to.x="0%";break;case"top":t.from.y="-100%",t.to.y="0%";break;case"bottom":t.from.y="100%",t.to.y="0%";break;case"rotate_top_left":t.from.rotationZ=-180,t.from.rotationX=-180,t.from.transformOrigin="0 0",t.to.rotationZ=0,t.to.rotationX=0;break;case"rotate_top_right":t.from.rotationZ=-180,t.from.rotationX=-180,t.from.transformOrigin="100% 0",t.to.rotationZ=0,t.to.rotationX=0;break;case"rotate_bottom_left":t.from.rotationZ=-180,t.from.rotationX=-180,t.from.transformOrigin="0 100%",t.to.rotationZ=0,t.to.rotationX=0;break;case"rotate_bottom_right":t.from.rotationZ=-180,t.from.rotationX=-180,t.from.transformOrigin="100% 100%",t.to.rotationZ=0,t.to.rotationX=0;break;case"rotate_center":t.from.rotationZ=-180,t.from.rotationX=-180,t.to.rotationZ=0,t.to.rotationX=0;break;default:break}return t}function m(e){return e.preventDefault(),e.stopPropagation(),!1}function P(e){let t=document.createElement("div");t.className="motionkit-popup-video-wrapper";let o=document.createElement("div");o.className="motionkit-popup-video-container";let r=document.createElement("video");r.className="motionkit-popup-video",r.preload="metadata";let a=document.createElement("source");a.src=e,a.type="video/mp4",r.appendChild(a);let i=document.createElement("button");i.className="motionkit-popup-play-btn",i.type="button";let u=()=>{if(r.paused){let c=r.play();c!==void 0&&c.then(()=>i.classList.add("motionkit-playing")).catch(p=>console.warn("[popupMedia] playback failed:",p))}else r.pause(),i.classList.remove("motionkit-playing")};return r.addEventListener("click",u),i.addEventListener("click",c=>{c.stopPropagation(),u()}),r.addEventListener("play",()=>{i.classList.add("motionkit-playing"),i.style.display="none"}),r.addEventListener("pause",()=>{i.classList.remove("motionkit-playing"),i.style.display="flex"}),r.addEventListener("ended",()=>{i.classList.remove("motionkit-playing"),i.style.display="flex",r.currentTime=0}),o.appendChild(r),o.appendChild(i),t.appendChild(o),t}function T(e,t){switch(e){case"image":{let o=document.createElement("img");return o.src=t,o.alt="Popup Image",o.className="motionkit-popup-media",o}case"youtube":{let o=document.createElement("div");o.className="motionkit-youtube-container";let r=s(t);if(!r)return console.warn("[popupMedia] invalid YouTube URL:",t),null;let a=document.createElement("iframe");return a.className="motionkit-youtube-video",a.src=`https://www.youtube.com/embed/${r}?autoplay=1&rel=0`,a.allowFullscreen=!0,a.referrerPolicy="strict-origin-when-cross-origin",a.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",o.appendChild(a),o}case"video":return P(t);default:return console.warn(`[popupMedia] unknown mediaType "${e}"`),null}}function y(e,t=!1){var l;if(!e||!e.parentNode)return;let o=e.shadowRoot,r=parseInt(e.dataset.scrollPosition||"0",10);(l=o==null?void 0:o.querySelector("video"))==null||l.pause();let a=o==null?void 0:o.querySelector("iframe");a&&a.parentNode&&a.parentNode.removeChild(a),L(),k()||window.scrollTo(0,r),document.removeEventListener("touchmove",m),document.removeEventListener("wheel",m);let i=o==null?void 0:o.querySelector(".motionkit-popup-overlay");i&&(i.style.pointerEvents="none");let u=e._wcfTimeline,c=!1,p=()=>{var d;c||(c=!0,(d=e.parentNode)==null||d.removeChild(e))};u&&!t?(u.eventCallback("onReverseComplete",p),u.reverse(),setTimeout(p,1500)):(u&&u.kill(),p())}function _({mediaType:e,mediaUrl:t,animateFrom:o,popupId:r}){if(!e||!t)return;document.querySelectorAll(w).forEach(b=>y(b,!0));let a=window.pageYOffset,i=document.createElement(w);i.classList.add("motionkit-skip-selector-full"),i.dataset.popupId=r,i.dataset.scrollPosition=String(a);let u=i.shadowRoot,c=document.createElement("style");c.textContent=X,u.appendChild(c);let p=document.createElement("div");p.className="motionkit-popup-overlay";let l=document.createElement("div");l.className="motionkit-popup-content";let d=document.createElement("button");d.className="motionkit-popup-close",d.type="button",d.setAttribute("aria-label","Close");let f=T(e,t);if(!f)return;l.appendChild(f),l.appendChild(d),p.appendChild(l),u.appendChild(p),document.body.appendChild(i),Z(a),document.addEventListener("touchmove",m,{passive:!1}),document.addEventListener("wheel",m,{passive:!1});let{from:M,to:N}=h(o);i._wcfTimeline=gsap.timeline().set(p,{visibility:"visible"}).to(p,{opacity:1,duration:.3}).fromTo(l,M,N,"-=0.2"),p.addEventListener("click",b=>{(b.target===p||b.target.classList.contains("motionkit-popup-close"))&&y(i)})}function E(e){var o;let t=n.get(e);t&&(t.teardowns.forEach(r=>{try{r()}catch(a){console.warn("[popupMedia] teardown error:",a)}}),(o=t.scrollTrigger)==null||o.kill(),n.delete(e))}function C(){for(let e of[...n.keys()])E(e);document.querySelectorAll(w).forEach(e=>y(e,!0)),L(),document.removeEventListener("touchmove",m),document.removeEventListener("wheel",m)}function A(e){if(!e||!x(e))return;let{id:t,mediaType:o,mediaUrl:r,trigger:{type:a,selector:i}={},vars:{animateFrom:u="center"}={}}=e;if(!o||!r){console.warn("[popupMedia] missing mediaType or mediaUrl");return}if(E(t),e.mkInert&&a==="page_load")return;let c=[],p=null,l=()=>_({mediaType:o,mediaUrl:r,animateFrom:u,popupId:t});if(a==="page_load"){let d=setTimeout(l,500);c.push(()=>clearTimeout(d))}else{if(!i){console.warn(`[popupMedia] trigger.selector required for triggerType "${a}"`);return}let d;try{d=document.querySelectorAll(i)}catch(f){console.warn(`[popupMedia] invalid trigger selector "${i}":`,f.message);return}if(!d.length){console.warn(`[popupMedia] no elements match "${i}"`);return}d.forEach(f=>{if(f.setAttribute("data-motionkit-anim-id",t),!e.mkInert)switch(a){case"click":f.addEventListener("click",l),c.push(()=>f.removeEventListener("click",l));break;case"hover":f.addEventListener("mouseenter",l),c.push(()=>f.removeEventListener("mouseenter",l));break;case"on_scroll":if(!window.ScrollTrigger){console.warn("[popupMedia] ScrollTrigger not loaded");return}p=window.ScrollTrigger.create({trigger:f,start:"top 80%",onEnter:l,once:!0});break}})}n.set(t,{teardowns:c,scrollTrigger:p})}return{run:A,teardown:C}}S(H,Y);})();
