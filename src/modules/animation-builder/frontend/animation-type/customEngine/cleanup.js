import {
  getActive,
  deleteActive,
  allActiveIds,
  clearActive,
} from "./registry.js";
import { clearSelectorCache } from "./scheduler.js";
import {
  unregisterAnimation,
  clearAll as clearCustomRegistry,
} from "./customRegistry.js";
import { revertSplitsFor, clearSplitCache } from "./extensions/splitText.js";
import {
  restoreScrambleFor,
  clearScrambleCache,
} from "./extensions/scrambleText.js";
import {
  releaseParallaxFor,
  clearParallaxCache,
} from "./extensions/parallax.js";
import { releaseAnim, clearOwnership } from "./ownership.js";
import { forgetAnim, clearAnims } from "./helper/inspector.js";
import {
  releaseRenderClaims,
  clearRenderClaims,
} from "./helper/renderOrder.js";

// Transition properties that would race a tween. `all` is the common one — page-builder themes
// (Stackable, Blocksy) put `transition: all .12s` on every heading and text block.
const RACING_TRANSITION = /\b(all|transform|translate|scale|rotate|opacity|visibility)\b/;

// A CSS transition on a property GSAP is animating fights it every frame and leaves the tween
// parked at its from-value — measured on a Stackable heading: `from({x:"50px"})` ended at 50
// instead of 0. Suppress it inline; the __wcfOrigCss snapshot above is taken first, so the global
// reset puts the author's own transition back.
function suppressRacingTransition(el) {
  let tp;
  try {
    tp = getComputedStyle(el).transitionProperty;
  } catch (e) {
    return;
  }
  if (!tp || tp === "none" || !RACING_TRANSITION.test(tp)) return;
  el.style.setProperty("transition", "none", "important");
  el.__wcfTransitionSuppressed = true;
}

// Tag so resetAllAnimations.js sweeps us on global reset.
export function tagElement(el, id) {
  if (!el || !el.setAttribute) return;
  // Snapshot the author's inline styles once, before any tween writes to
  // them. The global reset restores this — clearProps:"all" alone wipes the
  // ENTIRE style attribute, including user-authored position/size/background.
  if (el.__wcfOrigCss === undefined) el.__wcfOrigCss = el.style.cssText;
  el.setAttribute("data-motionkit-anim-id", id);
  suppressRacingTransition(el);
}

// Give an animation's elements their CSS transition back once nothing is animating them.
// Only the ones this animation still owns — a later animation may have claimed them since.
function restoreTransition(id) {
  document
    .querySelectorAll(`[data-motionkit-anim-id="${CSS.escape(id)}"]`)
    .forEach((el) => {
      if (!el.__wcfTransitionSuppressed) return;
      el.style.removeProperty("transition");
      delete el.__wcfTransitionSuppressed;
    });
}

function runCleanups(handle) {
  handle?.listeners?.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      /* noop */
    }
  });
  handle?.contexts?.forEach((ctx) => {
    try {
      ctx.revert();
    } catch (e) {
      /* noop */
    }
  });
}

export function teardown(id) {
  const handle = getActive(id);
  if (!handle) return;
  runCleanups(handle);
  // After the gsap context revert so tween inline styles are cleared first,
  // then unwrap SplitText spans back to the original text node.
  revertSplitsFor(id);
  // Last: ctx.revert() restores scrambled text but leaves the plugin's
  // newClass/oldClass wrapper spans behind, and a split container has to be
  // unwrapped before its markup can be put back.
  restoreScrambleFor(id);
  // ScrollSmoother effects are created outside the gsap context (see
  // extensions/parallax.js), so ctx.revert() above never touched them.
  releaseParallaxFor(id);
  restoreTransition(id);
  deleteActive(id);
  unregisterAnimation(id);
  releaseAnim(id);
  releaseRenderClaims(id);
  forgetAnim(id);
  // The DOM this animation matched can change between teardown and the rebuild that
  // usually follows, so don't let the next build resolve selectors against stale nodes.
  clearSelectorCache();
}

// Revert our own contexts rather than trusting the global sweep to have found every
// ScrollTrigger and inline style we created — its ownership test is a heuristic, and a
// timeline-mode animation on a custom trigger slipped through it until recently.
//
// clearScrambleCache matters because the global reset kills tweens instead of reverting
// them, which leaves a scrambled element on garbage characters or on the replacement text.
export function teardownAll() {
  allActiveIds().forEach((id) => {
    runCleanups(getActive(id));
    restoreTransition(id);
  });
  clearSplitCache();
  clearScrambleCache();
  clearParallaxCache();
  clearActive();
  clearCustomRegistry();
  clearSelectorCache();
  clearOwnership();
  clearRenderClaims();
  clearAnims();
}

// resetAllAnimations.js (editor-only bundle) fires `motionkit:reset-done`
// after its global nuke. We subscribe via a DOM event rather than a static
// import so production bundles never pull resetAllAnimations in — in prod
// this listener registers but the event never fires.
document.addEventListener("motionkit:reset-done", teardownAll);
