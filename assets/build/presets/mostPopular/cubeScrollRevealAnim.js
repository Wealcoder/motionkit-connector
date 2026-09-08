(()=>{var kt="motionkit-mk-scroll-cr-pa";function Mt(){let h=new Map;function T(s){let r=h.get(s);r&&(r.timelines.forEach(c=>{var o;try{(o=c.scrollTrigger)==null||o.kill(),c.kill()}catch(p){console.warn("[cubeScroll] timeline teardown error:",p)}}),r.scrollTriggers.forEach(c=>{try{c.kill()}catch(o){console.warn("[cubeScroll] scrollTrigger teardown error:",o)}}),r.cleanups.forEach(c=>{try{c()}catch(o){console.warn("[cubeScroll] cleanup error:",o)}}),h.delete(s))}function tt(){for(let s of[...h.keys()])T(s)}function et(s){var D,J;let r=s==null?void 0:s.detail;if(!r||r.presetKey!==kt||r.isPublished===!1||!r.itemClass||!r.endSectionClass)return;let{id:c,itemClass:o,endSectionClass:p,frontMedia:ot,backMedia:nt,leftMedia:at,rightMedia:rt,topMedia:it,bottomMedia:ct,vars:st={}}=r,{cubeMinWidth:lt,cubeMaxWidth:dt,cubeMaxHeight:ut,position:pt,expandFace:w,scale:bt,cubeAnimStart:L,cubeAnimCStart:mt,revealMode:ft}=st,C=ft==="cube-to-cube",$=parseFloat(lt)||0,gt=parseFloat(dt)||0,ht=parseFloat(ut)||0,wt=parseFloat(pt)||0,vt=parseFloat(bt)||1,n;try{n=document.querySelector(o)}catch(t){console.warn(`[cubeScroll] invalid itemClass "${o}":`,t.message);return}if(!n||(T(c),n.setAttribute("data-motionkit-anim-id",c),r.mkInert))return;n.classList.add("motionkit-skip-selector-full"),n.innerHTML="";let l=document.createElement("div");l.className="aab_wc-scroll-container";let m=document.createElement("div");m.className="aab_wc-scene";let f=document.createElement("div");f.className="aab_wc-animation-container",f.style.width=`${$}px`,f.style.height=`${$}px`;let x=document.createElement("div");x.className="aab_wc-cube";let Y={front:ot,back:nt,left:at,right:rt,top:it,bottom:ct},X=t=>{if(!t)return null;if(typeof t=="string"){let e=/^data:video\//i.test(t)||/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(t);return{url:t,type:e?"video":"image"}}return typeof t=="object"&&t.url?{url:t.url,type:t.type||"image"}:null},yt=t=>{let e=X(Y[t]);return e?e.type==="video"?`
          <div class="aab_wc-video-player">
            <video class="aab_wc-video" data-face="${t}" muted loop playsinline>
              <source src="${e.url}" type="video/mp4" />
            </video>
          </div>
        `:`<img src="${e.url}" alt="${t}" />`:""};[{class:"aab_wc-front",name:"front"},{class:"aab_wc-back",name:"back"},{class:"aab_wc-right",name:"right"},{class:"aab_wc-left",name:"left"},{class:"aab_wc-top",name:"top"},{class:"aab_wc-bottom",name:"bottom"}].forEach(t=>{let e=document.createElement("div");e.className=`aab_wc-face ${t.class}`,e.innerHTML=yt(t.name),x.appendChild(e)});let v=document.createElement("button");v.className="aab_wc-video-control",v.type="button",v.textContent="Play",f.appendChild(x),m.appendChild(f),m.appendChild(v),l.appendChild(m),n.appendChild(l);let A={front:{rotationY:0,rotationX:0},back:{rotationY:180,rotationX:0},right:{rotationY:-90,rotationX:0},left:{rotationY:90,rotationX:0},top:{rotationY:0,rotationX:-90},bottom:{rotationY:0,rotationX:90}},q=A[w]||A.front,y={rotationX:-30,rotationY:45},St=Object.entries({front:"",back:"rotateY(180deg) ",right:"rotateY(90deg) ",left:"rotateY(-90deg) ",top:"rotateX(90deg) ",bottom:"rotateX(-90deg) "}).map(([t,e])=>`${o} .aab_wc-${t} { transform: ${e}translateZ(${$/2}px); }`).join(`
      `),F=document.createElement("style");F.textContent=`
      ${o} { margin: 0; padding: 0; box-sizing: border-box; }
      ${o} .aab_wc-scroll-container {
        position: relative;
        z-index: 100;
      }
      ${o} .aab_wc-scene {
        width: 100%;
        display: flex;
        justify-content: center;
        position: relative;
      }
      ${o} .aab_wc-animation-container {
        position: relative;
        transform-style: preserve-3d;
        perspective: 1000px;
      }
      ${o} .aab_wc-cube {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transform: rotateX(${y.rotationX}deg) rotateY(${y.rotationY}deg);
      }
      ${o} .aab_wc-face {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        backface-visibility: hidden;
        overflow: hidden;
      }
      ${o} .aab_wc-face img { width: 100%; height: 100%; object-fit: cover; }
      ${St}
      ${o} .aab_wc-video-player {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        overflow: hidden;
      }
      ${o} .aab_wc-video { width: 100%; height: 100%; object-fit: cover; }
      ${o} .aab_wc-video-control {
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
      ${o} .aab_wc-animation-container:hover + .aab_wc-video-control,
      ${o} .aab_wc-video-control:hover { opacity: 1; }
    `,n.appendChild(F);let g=n.querySelector(".aab_wc-video-control"),N=n.querySelector(".aab_wc-animation-container"),R=n.querySelector(".aab_wc-cube"),B=n.querySelector(".aab_wc-front"),O=n.querySelector(".aab_wc-back"),H=n.querySelector(".aab_wc-right"),j=n.querySelector(".aab_wc-left"),P=n.querySelector(".aab_wc-top"),I=n.querySelector(".aab_wc-bottom"),_t=n.querySelectorAll(".aab_wc-face"),k=X(Y[w]),z=(k==null?void 0:k.type)==="video",b=z?n.querySelector(`.aab_wc-video[data-face="${w}"]`):null,V=[B,O,H,j,P,I],Et={front:B,back:O,right:H,left:j,top:P,bottom:I},Ct=V.filter(t=>t!==Et[w]),S=null;if(p){try{S=document.querySelector(p)}catch(t){console.warn(`[cubeScroll] invalid endSectionClass "${p}":`,t.message)}S||console.warn(`[cubeScroll] endSectionClass "${p}" matched no element \u2014 falling back to 1.5 viewports of scroll.`)}let _=null,$t=t=>{if(_!==null)return _;if(!a||!a.getChildren().length)return 0;let e=a.progress();a.progress(t);let i=l.getBoundingClientRect().bottom,u=i;for(let d of V){if(!d||parseFloat(getComputedStyle(d).opacity)<.05)continue;let Q=d.getBoundingClientRect().bottom;Q>u&&(u=Q)}return a.progress(e),_=u-i,_},xt=t=>{let e=l.getBoundingClientRect(),d=e.top+window.scrollY-t.start+e.height+$t(C?0:1);return isFinite(d)?Math.min(window.innerHeight,Math.max(0,d)):window.innerHeight},U=24,W=S?{endTrigger:S,end:t=>`top ${Math.max(U,xt(t)-U)}px`}:{end:()=>"+="+window.innerHeight*1.5},K=L==="custom"?mt:L||"center center",a=gsap.timeline({scrollTrigger:{trigger:l,start:K,...W,scrub:1,pin:!0,pinSpacing:!1,invalidateOnRefresh:!0}}),G=1;a.to(N,{scale:vt,duration:.6},0),a.to(m,{x:wt,duration:.6},0),C?a.to(R,{rotationY:y.rotationY+(G+1)*360,rotationX:y.rotationX,rotate:0,duration:2.3,ease:"none"},0):(a.to(R,{rotationY:q.rotationY+G*360,rotationX:q.rotationX,rotate:0,duration:1.8,ease:"none"},0),a.to(N,{width:gt,height:ht,scale:1,duration:.5},1.8),a.to(_t,{scale:.9,duration:.5},1.8),a.to(Ct,{opacity:0,duration:.4},1.85));let Z=[],E=[],M=()=>a.progress()>=.7;if(z&&b&&!C){let t=()=>{b.play().catch(d=>console.warn("[cubeScroll] video play failed:",d)),g.textContent="Pause"},e=()=>{b.pause(),g.textContent="Play"},i=()=>M()&&t();a.to(g,{display:"block",duration:.1},1.5),a.eventCallback("onUpdate",()=>{M()&&b.paused?t():!M()&&!b.paused&&e()}),Z.push(window.ScrollTrigger.create({trigger:l,start:K,...W,invalidateOnRefresh:!0,onEnter:i,onEnterBack:i,onLeave:e,onLeaveBack:e}));let u=()=>b.paused?t():e();g.addEventListener("click",u),E.push(()=>g.removeEventListener("click",u))}E.push(()=>{n.classList.remove("motionkit-skip-selector-full"),n.innerHTML=""}),window.ScrollTrigger&&(window.ScrollTrigger.refresh(),(J=(D=document.fonts)==null?void 0:D.ready)==null||J.then(()=>window.ScrollTrigger.refresh()).catch(()=>{}),l.querySelectorAll("img").forEach(e=>{if(e.complete)return;let i=()=>window.ScrollTrigger.refresh();e.addEventListener("load",i,{once:!0}),e.addEventListener("error",i,{once:!0}),E.push(()=>{e.removeEventListener("load",i),e.removeEventListener("error",i)})})),h.set(c,{timelines:[a],scrollTriggers:Z,cleanups:E})}return document.addEventListener("aae-animation-event",et),document.addEventListener("aae-reset-animation",tt),{destroy:()=>document.dispatchEvent(new CustomEvent("aae-reset-animation"))}}Mt();})();
