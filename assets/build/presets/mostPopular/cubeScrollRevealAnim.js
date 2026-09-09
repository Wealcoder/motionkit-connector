(()=>{var f={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},At=[f.DRAFT,f.SAVED,f.PUBLISHED],Lt="preview";function Yt(r){return!r||typeof r!="object"?f.PUBLISHED:At.indexOf(r.status)!==-1?r.status:r.status===Lt||r.isPublished===!1?f.SAVED:f.PUBLISHED}function rt(r){return Yt(r)!==f.DRAFT}var R="__motionkitPresetHandlers";function Rt(){return typeof window=="undefined"?new Map:(window[R]||(window[R]=new Map),window[R])}function at(r,m){if(!r||typeof m!="function")return;let y=Rt();if(y.has(r))return;let w=m()||{};y.set(r,{key:r,run:typeof w.run=="function"?w.run:function(){},teardown:typeof w.teardown=="function"?w.teardown:function(){}})}var Ht="motionkit-mk-scroll-cr-pa";function Pt(){let r=new Map;function m(i){let l=r.get(i);l&&(l.timelines.forEach(o=>{var c;try{(c=o.scrollTrigger)==null||c.kill(),o.kill()}catch(k){console.warn("[cubeScroll] timeline teardown error:",k)}}),l.scrollTriggers.forEach(o=>{try{o.kill()}catch(c){console.warn("[cubeScroll] scrollTrigger teardown error:",c)}}),l.cleanups.forEach(o=>{try{o()}catch(c){console.warn("[cubeScroll] cleanup error:",c)}}),r.delete(i))}function y(){for(let i of[...r.keys()])m(i)}function w(i){var et,ot;if(!i||!rt(i)||!i.itemClass||!i.endSectionClass)return;let{id:l,itemClass:o,endSectionClass:c,frontMedia:k,backMedia:it,leftMedia:ct,rightMedia:st,topMedia:lt,bottomMedia:dt,vars:ut={}}=i,{cubeMinWidth:ft,cubeMaxWidth:pt,cubeMaxHeight:wt,position:bt,expandFace:S,scale:mt,cubeAnimStart:H,cubeAnimCStart:gt,revealMode:ht}=ut,T=ht==="cube-to-cube",M=parseFloat(ft)||0,vt=parseFloat(pt)||0,yt=parseFloat(wt)||0,St=parseFloat(bt)||0,_t=parseFloat(mt)||1,n;try{n=document.querySelector(o)}catch(t){console.warn(`[cubeScroll] invalid itemClass "${o}":`,t.message);return}if(!n||(m(l),n.setAttribute("data-motionkit-anim-id",l),i.mkInert))return;n.classList.add("motionkit-skip-selector-full"),n.innerHTML="";let d=document.createElement("div");d.className="aab_wc-scroll-container";let g=document.createElement("div");g.className="aab_wc-scene";let h=document.createElement("div");h.className="aab_wc-animation-container",h.style.width=`${M}px`,h.style.height=`${M}px`;let A=document.createElement("div");A.className="aab_wc-cube";let P={front:k,back:it,left:ct,right:st,top:lt,bottom:dt},N=t=>{if(!t)return null;if(typeof t=="string"){let e=/^data:video\//i.test(t)||/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(t);return{url:t,type:e?"video":"image"}}return typeof t=="object"&&t.url?{url:t.url,type:t.type||"image"}:null},Et=t=>{let e=N(P[t]);return e?e.type==="video"?`
          <div class="aab_wc-video-player">
            <video class="aab_wc-video" data-face="${t}" muted loop playsinline>
              <source src="${e.url}" type="video/mp4" />
            </video>
          </div>
        `:`<img src="${e.url}" alt="${t}" />`:""};[{class:"aab_wc-front",name:"front"},{class:"aab_wc-back",name:"back"},{class:"aab_wc-right",name:"right"},{class:"aab_wc-left",name:"left"},{class:"aab_wc-top",name:"top"},{class:"aab_wc-bottom",name:"bottom"}].forEach(t=>{let e=document.createElement("div");e.className=`aab_wc-face ${t.class}`,e.innerHTML=Et(t.name),A.appendChild(e)});let _=document.createElement("button");_.className="aab_wc-video-control",_.type="button",_.textContent="Play",h.appendChild(A),g.appendChild(h),g.appendChild(_),d.appendChild(g),n.appendChild(d);let F={front:{rotationY:0,rotationX:0},back:{rotationY:180,rotationX:0},right:{rotationY:-90,rotationX:0},left:{rotationY:90,rotationX:0},top:{rotationY:0,rotationX:-90},bottom:{rotationY:0,rotationX:90}},X=F[S]||F.front,E={rotationX:-30,rotationY:45},Ct=Object.entries({front:"",back:"rotateY(180deg) ",right:"rotateY(90deg) ",left:"rotateY(-90deg) ",top:"rotateX(90deg) ",bottom:"rotateX(-90deg) "}).map(([t,e])=>`${o} .aab_wc-${t} { transform: ${e}translateZ(${M/2}px); }`).join(`
      `),O=document.createElement("style");O.textContent=`
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
        transform: rotateX(${E.rotationX}deg) rotateY(${E.rotationY}deg);
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
      ${Ct}
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
    `,n.appendChild(O);let v=n.querySelector(".aab_wc-video-control"),q=n.querySelector(".aab_wc-animation-container"),B=n.querySelector(".aab_wc-cube"),I=n.querySelector(".aab_wc-front"),D=n.querySelector(".aab_wc-back"),U=n.querySelector(".aab_wc-right"),V=n.querySelector(".aab_wc-left"),j=n.querySelector(".aab_wc-top"),W=n.querySelector(".aab_wc-bottom"),xt=n.querySelectorAll(".aab_wc-face"),L=N(P[S]),z=(L==null?void 0:L.type)==="video",b=z?n.querySelector(`.aab_wc-video[data-face="${S}"]`):null,K=[I,D,U,V,j,W],$t={front:I,back:D,right:U,left:V,top:j,bottom:W},kt=K.filter(t=>t!==$t[S]),C=null;if(c){try{C=document.querySelector(c)}catch(t){console.warn(`[cubeScroll] invalid endSectionClass "${c}":`,t.message)}C||console.warn(`[cubeScroll] endSectionClass "${c}" matched no element \u2014 falling back to 1.5 viewports of scroll.`)}let x=null,Tt=t=>{if(x!==null)return x;if(!a||!a.getChildren().length)return 0;let e=a.progress();a.progress(t);let s=d.getBoundingClientRect().bottom,p=s;for(let u of K){if(!u||parseFloat(getComputedStyle(u).opacity)<.05)continue;let nt=u.getBoundingClientRect().bottom;nt>p&&(p=nt)}return a.progress(e),x=p-s,x},Mt=t=>{let e=d.getBoundingClientRect(),u=e.top+window.scrollY-t.start+e.height+Tt(T?0:1);return isFinite(u)?Math.min(window.innerHeight,Math.max(0,u)):window.innerHeight},G=24,Z=C?{endTrigger:C,end:t=>`top ${Math.max(G,Mt(t)-G)}px`}:{end:()=>"+="+window.innerHeight*1.5},J=H==="custom"?gt:H||"center center",a=gsap.timeline({scrollTrigger:{trigger:d,start:J,...Z,scrub:1,pin:!0,pinSpacing:!1,invalidateOnRefresh:!0}}),Q=1;a.to(q,{scale:_t,duration:.6},0),a.to(g,{x:St,duration:.6},0),T?a.to(B,{rotationY:E.rotationY+(Q+1)*360,rotationX:E.rotationX,rotate:0,duration:2.3,ease:"none"},0):(a.to(B,{rotationY:X.rotationY+Q*360,rotationX:X.rotationX,rotate:0,duration:1.8,ease:"none"},0),a.to(q,{width:vt,height:yt,scale:1,duration:.5},1.8),a.to(xt,{scale:.9,duration:.5},1.8),a.to(kt,{opacity:0,duration:.4},1.85));let tt=[],$=[],Y=()=>a.progress()>=.7;if(z&&b&&!T){let t=()=>{b.play().catch(u=>console.warn("[cubeScroll] video play failed:",u)),v.textContent="Pause"},e=()=>{b.pause(),v.textContent="Play"},s=()=>Y()&&t();a.to(v,{display:"block",duration:.1},1.5),a.eventCallback("onUpdate",()=>{Y()&&b.paused?t():!Y()&&!b.paused&&e()}),tt.push(window.ScrollTrigger.create({trigger:d,start:J,...Z,invalidateOnRefresh:!0,onEnter:s,onEnterBack:s,onLeave:e,onLeaveBack:e}));let p=()=>b.paused?t():e();v.addEventListener("click",p),$.push(()=>v.removeEventListener("click",p))}$.push(()=>{n.classList.remove("motionkit-skip-selector-full"),n.innerHTML=""}),window.ScrollTrigger&&(window.ScrollTrigger.refresh(),(ot=(et=document.fonts)==null?void 0:et.ready)==null||ot.then(()=>window.ScrollTrigger.refresh()).catch(()=>{}),d.querySelectorAll("img").forEach(e=>{if(e.complete)return;let s=()=>window.ScrollTrigger.refresh();e.addEventListener("load",s,{once:!0}),e.addEventListener("error",s,{once:!0}),$.push(()=>{e.removeEventListener("load",s),e.removeEventListener("error",s)})})),r.set(l,{timelines:[a],scrollTriggers:tt,cleanups:$})}return{run:w,teardown:y}}at(Ht,Pt);})();
