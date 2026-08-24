import { querySelectorAllCached } from "../scheduler.js";

// Deduped union of every element this animation's steps animate (the itemClass
// targets — e.g. the heading). Distinct from the trigger elements (the buttons):
// the interaction handlers reset these before playing, and it's the fallback
// trigger set when no explicit trigger.selector is configured.
export function collectAnimatedElements(anim) {
  const seen = new Set();
  const out = [];
  (anim.timeline?.animations || []).forEach((step) => {
    if (!step?.itemClass) return;
    querySelectorAllCached(step.itemClass).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      out.push(el);
    });
  });
  return out;
}

// trigger.selector is authoritative when set; otherwise the click/hover target
// falls back to the union of step itemClass selectors so a button driving its
// own scrollTo (no separate trigger element) just works.
export function collectInteractionTargets(anim) {
  const sel = anim.trigger?.selector;
  if (sel) return querySelectorAllCached(sel);
  return collectAnimatedElements(anim);
}

export function timelineHasScrollTo(anim) {
  return (anim.timeline?.animations || []).some((step) => {
    if (step?.method === "scrollTo") return true;
    const v = step?.vars || {};
    return !!(v.to?.scrollTo || v.from?.scrollTo || v.set?.scrollTo);
  });
}
