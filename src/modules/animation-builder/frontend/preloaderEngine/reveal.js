// How the overlay leaves once loading finishes.
//
// GSAP is used when present, but is NOT required: every reveal has a CSS-transition
// fallback so a site whose GSAP CDN failed still uncovers correctly. That is the whole
// point of keeping the cover independent of GSAP — see dom.js.

const ORIGIN_MAP = {
  center: "50% 50%",
  top: "50% 0%",
  bottom: "50% 100%",
  left: "0% 50%",
  right: "100% 50%",
};

const CLIP_ORIGIN = {
  center: "50% 50%",
  top: "50% 0%",
  bottom: "50% 100%",
  left: "0% 50%",
  right: "100% 50%",
};

const getGsap = () => (typeof window !== "undefined" ? window.gsap : null);

// Fallback path — plain CSS transition, used when GSAP is unavailable.
const cssReveal = (root, vars, duration, done) => {
  root.style.transition = `transform ${duration}s ease-in-out, opacity ${duration}s ease-in-out, clip-path ${duration}s ease-in-out`;
  requestAnimationFrame(() => {
    Object.assign(root.style, vars);
  });
  setTimeout(done, duration * 1000 + 60);
};

/**
 * @param {HTMLElement} root  the cover element
 * @param {object} reveal     { type, origin, delay, duration, ease }
 * @param {() => void} done   called exactly once when the page is uncovered
 */
export function playReveal(root, reveal, done) {
  const gsap = getGsap();
  const { type, origin, duration, ease } = reveal;
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    done();
  };

  // Curtain splits the cover into two halves that part; every other style animates the
  // cover itself, so they share one code path.
  if (type === "curtain") {
    return curtainReveal(root, reveal, finish);
  }

  const gsapVars = { duration, ease, onComplete: finish };
  const cssVars = {};

  switch (type) {
    case "slideUp":
      gsapVars.yPercent = -100;
      cssVars.transform = "translateY(-100%)";
      break;
    case "slideDown":
      gsapVars.yPercent = 100;
      cssVars.transform = "translateY(100%)";
      break;
    case "scaleOut":
      root.style.transformOrigin = ORIGIN_MAP[origin] || ORIGIN_MAP.center;
      gsapVars.scale = 1.35;
      gsapVars.opacity = 0;
      cssVars.transform = "scale(1.35)";
      cssVars.opacity = "0";
      break;
    case "clipCircle": {
      const o = CLIP_ORIGIN[origin] || CLIP_ORIGIN.center;
      root.style.clipPath = `circle(150% at ${o})`;
      gsapVars.clipPath = `circle(0% at ${o})`;
      cssVars.clipPath = `circle(0% at ${o})`;
      break;
    }
    case "fade":
    default:
      gsapVars.opacity = 0;
      cssVars.opacity = "0";
      break;
  }

  if (gsap) {
    gsap.to(root, gsapVars);
    // Belt and braces: if onComplete never fires (killed tween, GSAP error), settle anyway.
    setTimeout(finish, duration * 1000 + 200);
    return;
  }
  cssReveal(root, cssVars, duration, finish);
}

function curtainReveal(root, reveal, finish) {
  const gsap = getGsap();
  const { duration, ease } = reveal;
  const bg = root.style.background || "#0a0a0a";

  // Hide the cover's own paint and hand it to two halves so they can part.
  const top = document.createElement("div");
  const bottom = document.createElement("div");
  const half =
    "position:absolute;left:0;width:100%;height:50%;background:" + bg + ";";
  top.style.cssText = half + "top:0;";
  bottom.style.cssText = half + "bottom:0;";
  root.style.background = "transparent";
  root.appendChild(top);
  root.appendChild(bottom);

  if (gsap) {
    gsap.to(top, { yPercent: -100, duration, ease });
    gsap.to(bottom, { yPercent: 100, duration, ease, onComplete: finish });
    setTimeout(finish, duration * 1000 + 200);
    return;
  }

  const t = `transform ${duration}s ease-in-out`;
  top.style.transition = t;
  bottom.style.transition = t;
  requestAnimationFrame(() => {
    top.style.transform = "translateY(-100%)";
    bottom.style.transform = "translateY(100%)";
  });
  setTimeout(finish, duration * 1000 + 60);
}
