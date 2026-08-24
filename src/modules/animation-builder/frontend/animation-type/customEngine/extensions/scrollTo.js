import { registerMethod, getMethod } from "../registry.js";

// ScrollToPlugin is loaded by the asset loader via the active-plugins broadcast;
// we just need to hand it to gsap so `scrollTo` vars resolve at tween time.
//
// New animations emit scrollTo as a PROPERTY on a from/to bucket
// ({ scrollTo: { y, x, offsetY, offsetX, autoKill }, duration, ... }), which
// standard.js targets at `window`. Legacy ones saved it as `method: "scrollTo"`,
// which had no handler at all — those steps only produced an "Unknown step
// method" warning and were dropped, so route them through the `to` handler.
export function registerScrollToMethod() {
  if (typeof ScrollToPlugin === "undefined") return false;
  try {
    gsap.registerPlugin(ScrollToPlugin);
  } catch (e) {
    /* noop */
  }

  registerMethod("scrollTo", (tl, step, vars, overlap) => {
    const to = getMethod("to");
    if (!to) return;
    // select/merge.js unwraps the legacy envelope to the scrollTo config itself,
    // so re-wrap it as the property shape the `to` handler expects.
    const wrapped = vars && vars.scrollTo ? vars : { ...vars, scrollTo: vars };
    to(tl, step, wrapped, overlap);
  });

  return true;
}
