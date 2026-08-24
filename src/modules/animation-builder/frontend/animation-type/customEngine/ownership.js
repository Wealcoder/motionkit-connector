// Element-exclusive playback ownership for triggered custom animations.
//
// A single animated element (a step's itemClass target — e.g. one heading) can
// be the target of several independent click/hover animations. Only one may be
// applied at a time, so when a trigger fires we reset whatever the previous
// owner left on the element back to the author's original styles, then let the
// caller play the incoming animation. This stops their inline styles from
// stacking and makes the single-value data-motionkit-anim-id attribute correct — it
// always names the animation currently applied to the element.
//
// Runtime-only concern: editor preview never triggers (DevTools owns playback),
// so nothing here runs in editor mode, and only the interaction handlers claim.

import { restoreScrambleElements } from "./extensions/scrambleText.js";

let ownerByEl = new WeakMap(); // animated element -> owning animId
const elsByAnim = new Map(); // animId -> Set<element>, so teardown can release
const animsByAnim = new Map(); // animId -> built gsap animations (to pause on displacement)

// Register an animation's built gsap animations (timelines/tweens, plus live-
// flip wrappers) so a later owner of one of its elements can pause+rewind them.
export function setAnims(animId, anims) {
  if (!animId) return;
  animsByAnim.set(animId, anims || []);
}

function trackEl(animId, el) {
  let set = elsByAnim.get(animId);
  if (!set) {
    set = new Set();
    elsByAnim.set(animId, set);
  }
  set.add(el);
}

// Claim els for animId. Any element currently owned by a DIFFERENT animation is
// reset: the displaced owner's animations are paused+rewound so they stop
// writing styles, the element's original inline styles are restored, and the
// data-motionkit-anim-id attribute is re-stamped to the new owner. Returns true when
// at least one element was displaced, so the caller can invalidate() the
// incoming tweens to re-read the clean origin.
export function claimTargets(els, animId) {
  const displaced = new Set();
  const toReset = [];
  els.forEach((el) => {
    const prev = ownerByEl.get(el);
    if (prev && prev !== animId) {
      displaced.add(prev);
      toReset.push(el);
    }
    ownerByEl.set(el, animId);
    trackEl(animId, el);
  });

  // Pause displaced owners BEFORE restoring styles — plain pause(), not
  // pause(0). Seeking to 0 forces a render at that point, and for a tween
  // with a scrollTo property that render is a real side effect: it actively
  // scrolls the page back to wherever it was when the tween started, not just
  // a style write. The subsequent __wcfOrigCss restore below already wipes
  // whatever CSS state the tween was mid-flight at, so no seek is needed.
  displaced.forEach((pid) =>
    (animsByAnim.get(pid) || []).forEach((a) => a.pause?.()),
  );
  toReset.forEach((el) => {
    if (typeof el.__wcfOrigCss === "string") el.style.cssText = el.__wcfOrigCss;
    el.setAttribute("data-motionkit-anim-id", animId);
  });
  // __wcfOrigCss covers inline styles only. A displaced scramble also left the
  // element's innerHTML rewritten, and the caller invalidate()s the incoming
  // tweens right after this — which makes ScrambleTextPlugin re-capture the
  // element's CURRENT text as its "original" on the next render.
  restoreScrambleElements(toReset);

  return toReset.length > 0;
}

// Relinquish a torn-down animation so a later owner of the same element starts
// clean. Only clears element entries this animId still owns — a newer owner may
// have already claimed them.
export function releaseAnim(animId) {
  const set = elsByAnim.get(animId);
  if (set) {
    set.forEach((el) => {
      if (ownerByEl.get(el) === animId) ownerByEl.delete(el);
    });
    elsByAnim.delete(animId);
  }
  animsByAnim.delete(animId);
}

export function clearOwnership() {
  ownerByEl = new WeakMap();
  elsByAnim.clear();
  animsByAnim.clear();
}

// How many of animId's claimed elements it still owns. null when it never
// claimed any (a non-interaction anim, or one not yet triggered). The inspector
// reports "Intercepted" when tracked > 0 but owned === 0 — every element this
// animation touched has since been taken over by a later one.
export function ownershipStatus(animId) {
  const set = elsByAnim.get(animId);
  if (!set || set.size === 0) return null;
  let owned = 0;
  set.forEach((el) => {
    if (ownerByEl.get(el) === animId) owned += 1;
  });
  return { tracked: set.size, owned };
}
