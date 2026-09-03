(()=>{var b=new Set(["AREA","BASE","BR","COL","EMBED","HR","IMG","INPUT","LINK","META","PARAM","SOURCE","TRACK","WBR"]);var C="__motionkitPresetHandlers";function D(){return typeof window=="undefined"?new Map:(window[C]||(window[C]=new Map),window[C])}function S(n,d){if(!n||typeof d!="function")return;let h=D();if(h.has(n))return;let v=d()||{};h.set(n,{key:n,run:typeof v.run=="function"?v.run:function(){},teardown:typeof v.teardown=="function"?v.teardown:function(){}})}var l={DRAFT:"draft",PREVIEW:"preview",PUBLISHED:"published"},H=[l.DRAFT,l.PREVIEW,l.PUBLISHED];function B(n){return!n||typeof n!="object"?l.PUBLISHED:H.indexOf(n.status)!==-1?n.status:n.isPublished===!1?l.DRAFT:l.PUBLISHED}function P(n){return B(n)!==l.DRAFT}var N="motionkit-mk-cursor-cr-pa",_="Pause";function O(){let n=new Map;function d(t,e){if(t==null||t==="")return e;let o=String(t);return/[a-z%]$/i.test(o)?o:`${o}px`}function h(t){let e=n.get(t);e&&(e.forEach(o=>{try{o()}catch(s){console.warn("[cursorReveal] teardown error:",s)}}),n.delete(t))}function v(){for(let t of[...n.keys()])h(t)}function R({viewText:t,textColor:e,backgroundColor:o,width:s,height:w,radius:E,zIndex:g,borderStyle:p,fontSize:f}){let i=document.createElement("div");return i.setAttribute("data-wcf-cursor-reveal",""),i.style.cssText=`
      position: absolute;
      top: 0;
      left: 0;
      width: ${s};
      height: ${w};
      background-color: ${o};
      color: ${e};
      pointer-events: none;
      z-index: ${g};
      border-radius: ${E};
      ${p}
      will-change: transform, opacity;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1;
      font-size: ${f};
      font-weight: 500;
      padding: 8px;
      box-sizing: border-box;
      margin: 0;
    `,i.textContent=t,i}function I({id:t,itemEl:e,cursorConfig:o}){let s=R(o),w=e.style.position;window.getComputedStyle(e).position==="static"&&(e.style.position="relative"),e.setAttribute("data-motionkit-anim-id",t),e.appendChild(s),gsap.set(s,{xPercent:-50,yPercent:-50,scale:0,opacity:0,force3D:!0});let E=gsap.quickTo(s,"x",{duration:.6,ease:"expo"}),g=gsap.quickTo(s,"y",{duration:.6,ease:"expo"}),p=gsap.timeline({paused:!0}).to(s,{scale:1,opacity:1,duration:.5,ease:"expo.inOut"}),f=c=>{let L=e.getBoundingClientRect();E(c.clientX-L.left),g(c.clientY-L.top)},i=c=>{f(c),e.addEventListener("mousemove",f),p.play()},m=()=>{e.removeEventListener("mousemove",f),p.reverse()};e.addEventListener("mouseenter",i),e.addEventListener("mouseleave",m);let r=e.querySelector("video"),a=()=>{s.textContent=r.paused?o.viewText:_},y=()=>{if(r.paused){let c=r.play();c&&typeof c.catch=="function"&&c.catch(()=>{})}else r.pause()};return r&&(r.addEventListener("play",a),r.addEventListener("pause",a),r.addEventListener("ended",a),e.addEventListener("click",y),a()),()=>{e.removeEventListener("mouseenter",i),e.removeEventListener("mouseleave",m),e.removeEventListener("mousemove",f),r&&(r.removeEventListener("play",a),r.removeEventListener("pause",a),r.removeEventListener("ended",a),e.removeEventListener("click",y)),p.kill(),s.remove(),e.style.position=w}}function k(t){if(!t||!P(t)||!t.itemClass)return;let e;try{e=document.querySelectorAll(t.itemClass)}catch(u){console.warn(`[cursorReveal] invalid itemClass selector "${t.itemClass}":`,u.message);return}if(!e.length)return;let{id:o,vars:s={}}=t,{viewText:w,textColor:E="#ffffff",backgroundColor:g="#000000",backgroundWidth:p="70px",backgroundHeight:f="70px",borderType:i,borderWidth:m,borderColor:r="#000000",borderRadius:a="50px",zIndex:y,fontSize:c}=s;if(!w)return;let L=m!=null&&m!=="",M=i&&i!=="none"&&L?`border: ${d(m)} ${i} ${r||"#000000"};`:"",$={viewText:w,textColor:E,backgroundColor:g,width:d(p,"70px"),height:d(f,"70px"),radius:d(a,"50px"),zIndex:y===""||y==null?999:y,borderStyle:M,fontSize:d(c,"14px")};if(h(o),t.mkInert){e.forEach(u=>{let x=b.has(u.tagName)?u.parentElement:u;x==null||x.setAttribute("data-motionkit-anim-id",o)});return}let T=[];e.forEach(u=>{let x=b.has(u.tagName),A=x?u.parentElement:u;A&&(x&&u.tagName==="IMG"&&(u.style.display="block"),T.push(I({id:o,itemEl:A,cursorConfig:$})))}),n.set(o,T)}return{run:k,teardown:v}}S(N,O);})();
