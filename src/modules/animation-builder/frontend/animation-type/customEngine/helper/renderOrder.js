import { querySelectorAllCached } from "../scheduler.js";

// Tracks which animation first claimed each element+property, so a later `from` on the same property can be reported — see step.js::warnIfStacked.

// Tween-control keys — not animated properties, so they never count as a conflict.
const CONTROL_KEYS = new Set([
  "duration",
  "delay",
  "ease",
  "stagger",
  "repeat",
  "repeatDelay",
  "yoyo",
  "paused",
  "immediateRender",
  "overwrite",
  "id",
  "data",
  "scrollTrigger",
  "keyframes",
  "onStart",
  "onUpdate",
  "onComplete",
  "onRepeat",
  "onReverseComplete",
]);

const claimsByEl = new WeakMap(); // element -> Map<property, animId>
const elsByAnim = new Map(); // animId -> Set<element>, so teardown can release

// scroll.js hands an element directly on its per-element path; everywhere else it's a selector.
function resolveEls(itemClass) {
  if (!itemClass) return [];
  if (typeof itemClass === "string") return [...querySelectorAllCached(itemClass)];
  return itemClass.nodeType === 1 ? [itemClass] : [];
}

function animatedProps(vars) {
  if (!vars || typeof vars !== "object") return [];
  return Object.keys(vars).filter((k) => !CONTROL_KEYS.has(k));
}

// Claim this step's properties for animId; true when another animation already owns one of them.
export function claimFromRender(animId, itemClass, vars) {
  const props = animatedProps(vars);
  if (!props.length) return false;

  let conflict = false;
  resolveEls(itemClass).forEach((el) => {
    let claims = claimsByEl.get(el);
    if (!claims) claimsByEl.set(el, (claims = new Map()));
    props.forEach((p) => {
      const prev = claims.get(p);
      if (!prev) claims.set(p, animId);
      else if (prev !== animId) conflict = true;
    });
    let set = elsByAnim.get(animId);
    if (!set) elsByAnim.set(animId, (set = new Set()));
    set.add(el);
  });
  return conflict;
}

// Drop a torn-down animation's claims so the next animation on those properties renders normally.
export function releaseRenderClaims(animId) {
  const set = elsByAnim.get(animId);
  if (!set) return;
  set.forEach((el) => {
    const claims = claimsByEl.get(el);
    if (!claims) return;
    claims.forEach((owner, prop) => {
      if (owner === animId) claims.delete(prop);
    });
  });
  elsByAnim.delete(animId);
}

// Release each animation rather than just dropping the index, or stale WeakMap entries keep reporting conflicts against animations that no longer exist.
export function clearRenderClaims() {
  [...elsByAnim.keys()].forEach(releaseRenderClaims);
  elsByAnim.clear();
}
