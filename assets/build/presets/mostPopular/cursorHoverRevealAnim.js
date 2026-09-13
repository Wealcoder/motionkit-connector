(()=>{var b=new Set(["AREA","BASE","BR","COL","EMBED","HR","IMG","INPUT","LINK","META","PARAM","SOURCE","TRACK","WBR"]);var A="__motionkitPresetHandlers";function $(){return typeof window=="undefined"?new Map:(window[A]||(window[A]=new Map),window[A])}function T(n,d){if(!n||typeof d!="function")return;let E=$();if(E.has(n))return;let v=d()||{};E.set(n,{key:n,run:typeof v.run=="function"?v.run:function(){},teardown:typeof v.teardown=="function"?v.teardown:function(){}})}var p={DRAFT:"draft",SAVED:"saved",PUBLISHED:"published"},H=[p.DRAFT,p.SAVED,p.PUBLISHED],_="preview";function B(n){return!n||typeof n!="object"?p.PUBLISHED:H.indexOf(n.status)!==-1?n.status:n.status===_||n.isPublished===!1?p.SAVED:p.PUBLISHED}function P(n){return B(n)!==p.DRAFT}var N="motionkit-mk-cursor-cr-pa",O="Pause";function U(){let n=new Map;function d(t,e){if(t==null||t==="")return e;let o=String(t);return/[a-z%]$/i.test(o)?o:`${o}px`}function E(t){let e=n.get(t);e&&(e.forEach(o=>{try{o()}catch(s){console.warn("[cursorReveal] teardown error:",s)}}),n.delete(t))}function v(){for(let t of[...n.keys()])E(t)}function I({viewText:t,textColor:e,backgroundColor:o,width:s,height:w,radius:h,zIndex:g,borderStyle:l,fontSize:f}){let i=document.createElement("div");return i.setAttribute("data-wcf-cursor-reveal",""),i.style.cssText=`
      position: absolute;
      top: 0;
      left: 0;
      width: ${s};
      height: ${w};
      background-color: ${o};
      color: ${e};
      pointer-events: none;
      z-index: ${g};
      border-radius: ${h};
      ${l}
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
    `,i.textContent=t,i}function R({id:t,itemEl:e,cursorConfig:o}){let s=I(o),w=e.style.position;window.getComputedStyle(e).position==="static"&&(e.style.position="relative"),e.setAttribute("data-motionkit-anim-id",t),e.appendChild(s),gsap.set(s,{xPercent:-50,yPercent:-50,scale:0,opacity:0,force3D:!0});let h=gsap.quickTo(s,"x",{duration:.6,ease:"expo"}),g=gsap.quickTo(s,"y",{duration:.6,ease:"expo"}),l=gsap.timeline({paused:!0}).to(s,{scale:1,opacity:1,duration:.5,ease:"expo.inOut"}),f=c=>{let L=e.getBoundingClientRect();h(c.clientX-L.left),g(c.clientY-L.top)},i=c=>{f(c),e.addEventListener("mousemove",f),l.play()},m=()=>{e.removeEventListener("mousemove",f),l.reverse()};e.addEventListener("mouseenter",i),e.addEventListener("mouseleave",m);let r=e.querySelector("video"),a=()=>{s.textContent=r.paused?o.viewText:O},y=()=>{if(r.paused){let c=r.play();c&&typeof c.catch=="function"&&c.catch(()=>{})}else r.pause()};return r&&(r.addEventListener("play",a),r.addEventListener("pause",a),r.addEventListener("ended",a),e.addEventListener("click",y),a()),()=>{e.removeEventListener("mouseenter",i),e.removeEventListener("mouseleave",m),e.removeEventListener("mousemove",f),r&&(r.removeEventListener("play",a),r.removeEventListener("pause",a),r.removeEventListener("ended",a),e.removeEventListener("click",y)),l.kill(),s.remove(),e.style.position=w}}function k(t){if(!t||!P(t)||!t.itemClass)return;let e;try{e=document.querySelectorAll(t.itemClass)}catch(u){console.warn(`[cursorReveal] invalid itemClass selector "${t.itemClass}":`,u.message);return}if(!e.length)return;let{id:o,vars:s={}}=t,{viewText:w,textColor:h="#ffffff",backgroundColor:g="#000000",backgroundWidth:l="70px",backgroundHeight:f="70px",borderType:i,borderWidth:m,borderColor:r="#000000",borderRadius:a="50px",zIndex:y,fontSize:c}=s;if(!w)return;let L=m!=null&&m!=="",D=i&&i!=="none"&&L?`border: ${d(m)} ${i} ${r||"#000000"};`:"",M={viewText:w,textColor:h,backgroundColor:g,width:d(l,"70px"),height:d(f,"70px"),radius:d(a,"50px"),zIndex:y===""||y==null?999:y,borderStyle:D,fontSize:d(c,"14px")};if(E(o),t.mkInert){e.forEach(u=>{let x=b.has(u.tagName)?u.parentElement:u;x==null||x.setAttribute("data-motionkit-anim-id",o)});return}let C=[];e.forEach(u=>{let x=b.has(u.tagName),S=x?u.parentElement:u;S&&(x&&u.tagName==="IMG"&&(u.style.display="block"),C.push(R({id:o,itemEl:S,cursorConfig:M})))}),n.set(o,C)}return{run:k,teardown:v}}T(N,U);})();
