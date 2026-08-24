import { handleCustomAnimation, isCustomAnimation } from "./customEngine/index.js";
import { registerAllExtensions } from "./customEngine/extensions/index.js";

const IS_DEVTOOLS = typeof __MOTIONKIT_DEVTOOLS__ !== "undefined" && Boolean(__MOTIONKIT_DEVTOOLS__);

if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

registerAllExtensions();

// Stash every custom-animation config we receive so DevTools can show
// disabled steps (which never enter gsap.globalTimeline) by reading the
// authoritative editor config. Production builds skip this entirely.
function rememberConfig(anim) {
  if (!IS_DEVTOOLS) return;
  if (typeof window === "undefined") return;
  if (!window.__motionkitAnims) window.__motionkitAnims = new Map();
  window.__motionkitAnims.set(anim.id, anim);
}

document.addEventListener("aae-animation-event", (e) => {
  const anim = e?.detail;
  if (!isCustomAnimation(anim)) return;
  if (IS_DEVTOOLS) rememberConfig(anim);
  handleCustomAnimation(anim);
});

// Clear the stash on a global reset so deleted animations don't linger
// in window.__motionkitAnims after the editor pushes a fresh config without
// them.
if (IS_DEVTOOLS) {
  document.addEventListener("aae-reset-animation", () => {
    if (typeof window !== "undefined" && window.__motionkitAnims) {
      try { window.__motionkitAnims.clear(); } catch (_) { /* ignore */ }
    }
  });
}

