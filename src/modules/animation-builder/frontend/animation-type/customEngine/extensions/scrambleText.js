import { querySelectorAllCached } from "../scheduler.js";

// ScrambleTextPlugin is loaded by the asset loader via the active-plugins broadcast.
// scrambleText rides as a native GSAP tween var (on a normal from/to bucket), so
// there's no interception of the tween itself — we register the plugin so gsap
// resolves the `scrambleText` var at tween time instead of silently dropping it
// (mirrors drawSVG).
//
// The editor emits either shape GSAP accepts: the string shorthand
// ({ scrambleText: "NEW TEXT" }) or the options object ({ scrambleText: { text,
// chars, speed, revealDelay, tweenLength, delimiter, rightToLeft, newClass,
// oldClass } }). Both are passed straight through — no normalizing here.
//
// What DOES need handling is cleanup. This is the only plugin we register that
// rewrites innerHTML, and every reset path in the engine restores CSS only
// (__wcfOrigCss / clearProps:"all"). The global reset also KILLS tweens rather
// than reverting them, and kill() leaves the DOM exactly as the last render
// left it. So the markup is snapshotted before the first scramble render and
// put back on teardown / reset / ownership displacement.

let registered = false;

// animId -> Set<element>, so teardown can restore just that anim's targets.
const scrambleEls = new Map();

// step.itemClass is a selector string on the normal path, but scroll.js splits a
// default-trigger step per matched element and hands the element over direct.
function resolveEls(itemClass) {
  if (!itemClass) return [];
  if (typeof itemClass === "string") {
    return [...querySelectorAllCached(itemClass)];
  }
  return itemClass.nodeType === 1 ? [itemClass] : [];
}

// Called from the standard from/to/fromTo/set handlers just before the tween is
// built, whenever its vars carry `scrambleText`.
//
// First pass snapshots the author's markup. Every later pass HEALS instead —
// ScrambleTextPlugin captures `original` from the live DOM on its first render,
// so a rebuild over an element a previous scramble already rewrote would adopt
// the replacement text as the original and animate NEW -> NEW (a no-op scramble
// that never reveals). Rebuilds happen on device switch, on the stale-target
// path in handlers/interaction.js, and after every editor reset.
export function prepScrambleTargets(animId, itemClass) {
  if (!registered) return;
  const owner = animId || "__no_anim__";
  resolveEls(itemClass).forEach((el) => {
    if (el.__wcfScrambleHTML === undefined) {
      el.__wcfScrambleHTML = el.innerHTML;
    } else {
      el.innerHTML = el.__wcfScrambleHTML;
    }
    let set = scrambleEls.get(owner);
    if (!set) scrambleEls.set(owner, (set = new Set()));
    set.add(el);
  });
}

// Put the snapshotted markup back. Also drops the newClass/oldClass wrapper
// spans the plugin leaves behind when a tween is reverted at ratio 0, which a
// plain ctx.revert() can't clean up on its own.
export function restoreScrambleElements(els) {
  els?.forEach((el) => {
    if (typeof el?.__wcfScrambleHTML === "string" && el.isConnected) {
      el.innerHTML = el.__wcfScrambleHTML;
    }
  });
}

export function restoreScrambleFor(animId) {
  const set = scrambleEls.get(animId || "__no_anim__");
  if (!set) return;
  restoreScrambleElements(set);
  scrambleEls.delete(animId || "__no_anim__");
}

export function clearScrambleCache() {
  scrambleEls.forEach(restoreScrambleElements);
  scrambleEls.clear();
}

export function registerScrambleTextMethod() {
  if (typeof ScrambleTextPlugin === "undefined") return false;
  try {
    gsap.registerPlugin(ScrambleTextPlugin);
  } catch (e) {
    /* noop — the plugin self-registers on load when gsap is already present */
  }

  // Gates the snapshot work so a page without the plugin pays nothing.
  registered = true;
  return true;
}
