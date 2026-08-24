import { registerMethod } from "../registry.js";
import { applyFlip } from "./flip.js";
import { applySplitText } from "./splitText.js";
import { prepScrambleTargets } from "./scrambleText.js";

// Plugin properties (flip / splitText / scrollTo) now ride inside a normal
// from/to/fromTo bucket instead of being their own step method — mirroring how
// motionPath / drawSVG already work as native GSAP props. flip and splitText
// need pre-tween DOM work so they intercept here; scrollTo just needs `window`
// as the tween target (ScrollToPlugin scrolls the tween's target).
//
// scrambleText tweens build normally, but need their markup snapshotted before
// the first render so teardown can undo the innerHTML rewrite — see
// scrambleText.js. The splitText/flip branches return before this runs, so a
// split step never snapshots its container mid-split.

// ScrollToPlugin scrolls the tween's *target*. For window scrolling the tween
// must target `window`, not the animated element — so when vars carry
// `scrollTo` we override the target.
const scrollToTarget = (vars) => (vars && vars.scrollTo ? window : null);

// Default the scroll target to the step's own element when the user didn't set
// an explicit y/x — preserves the old "scroll to this element" behavior.
function normalizeScrollTo(step, vars) {
  const cfg = vars.scrollTo && typeof vars.scrollTo === "object" ? { ...vars.scrollTo } : {};
  if (cfg.y === undefined && cfg.x === undefined) cfg.y = step.itemClass;
  return { ...vars, scrollTo: cfg };
}

const animIdOf = (tl) => tl?.vars?.data?.animationId || null;

export function registerStandardMethods() {
  registerMethod("from", (tl, step, vars, overlap) => {
    if (vars?.flip) return applyFlip(tl, step, vars, overlap);
    if (vars?.splitText) return applySplitText(tl, step, vars, overlap, "from");

    const target = scrollToTarget(vars) || step.itemClass;
    if (!target) return;
    if (vars.scrambleText) prepScrambleTargets(animIdOf(tl), step.itemClass);
    tl.from(target, vars.scrollTo ? normalizeScrollTo(step, vars) : vars, overlap);
  });

  registerMethod("to", (tl, step, vars, overlap) => {
    if (vars?.flip) return applyFlip(tl, step, vars, overlap);
    if (vars?.splitText) return applySplitText(tl, step, vars, overlap, "to");

    const target = scrollToTarget(vars) || step.itemClass;
    if (!target) return;
    if (vars.scrambleText) prepScrambleTargets(animIdOf(tl), step.itemClass);
    tl.to(target, vars.scrollTo ? normalizeScrollTo(step, vars) : vars, overlap);
  });

  registerMethod("fromTo", (tl, step, vars, overlap) => {
    const from = vars?.from || {};
    const to = vars?.to || {};

    // flip / splitText don't split cleanly across a fromTo pair — take the
    // config from whichever side declares it (prefer `to`) and run the
    // single-side handler with the combined vars.
    if (to.flip || from.flip) {
      return applyFlip(tl, step, { ...from, ...to }, overlap);
    }
    if (to.splitText || from.splitText) {
      return applySplitText(tl, step, { from, to }, overlap, "fromTo");
    }

    const hasScrollTo = to.scrollTo || from.scrollTo;
    const target = hasScrollTo ? window : step.itemClass;
    if (!target) return;
    if (to.scrambleText || from.scrambleText) {
      prepScrambleTargets(animIdOf(tl), step.itemClass);
    }
    const fromVars = from.scrollTo ? normalizeScrollTo(step, from) : from;
    const toVars = to.scrollTo ? normalizeScrollTo(step, to) : to;
    tl.fromTo(target, fromVars, toVars, overlap);
  });

  registerMethod("set", (tl, step, vars, overlap) => {
    // Same window redirect as from/to/fromTo — ScrollToPlugin scrolls the tween's target.
    const target = scrollToTarget(vars) || step.itemClass;
    if (!target) return;
    if (vars?.scrambleText) prepScrambleTargets(animIdOf(tl), step.itemClass);
    tl.set(target, vars.scrollTo ? normalizeScrollTo(step, vars) : vars, overlap);
  });

  registerMethod("call", (tl, step, vars, overlap) => {
    const raw = vars || {};
    const fn = typeof raw === "function" ? raw : raw.fn;
    const args = raw.args || [];
    if (typeof fn === "function") {
      tl.call(fn, args, overlap);
    } else if (typeof fn === "string") {
      tl.call(
        () => {
          try {
            new Function("args", fn)(args);
          } catch (e) {
            console.error("[customEngine] call error:", e);
          }
        },
        undefined,
        overlap,
      );
    }
  });
}
