import { querySelectorAllCached } from "../scheduler.js";
import { tagElement } from "../cleanup.js";

// Append this step (animation effect) id to the element's comma-separated step-id list, deduped — one element can be targeted by several steps.
function tagStep(el, stepId) {
  if (!el || !el.setAttribute || !stepId) return;
  const existing = el.getAttribute("data-motionkit-step-id");
  const ids = existing ? existing.split(",") : [];
  if (ids.includes(stepId)) return;
  ids.push(stepId);
  el.setAttribute("data-motionkit-step-id", ids.join(","));
}

// Tag every animated element so the global reset sweep clears inline styles
// on device-switch without us tracking DOM refs individually.
export function tagAllTargets(anim) {
  (anim.timeline?.animations || []).forEach((step) => {
    if (!step?.itemClass) return;
    querySelectorAllCached(step.itemClass).forEach((el) => {
      tagElement(el, anim.id);
      tagStep(el, step.id);
    });
  });
}

// Undo tagAllTargets when the build produced no handle, since teardown will never run to clear those tags. __wcfOrigCss stays — it's the author's baseline, not an ownership claim.
export function untagAllTargets(anim) {
  (anim.timeline?.animations || []).forEach((step) => {
    if (!step?.itemClass) return;
    querySelectorAllCached(step.itemClass).forEach((el) => {
      if (!el?.getAttribute) return;
      if (el.getAttribute("data-motionkit-anim-id") === anim.id) {
        el.removeAttribute("data-motionkit-anim-id");
        // Nothing is going to animate this element, so give its CSS transition back.
        if (el.__wcfTransitionSuppressed) {
          el.style.removeProperty("transition");
          delete el.__wcfTransitionSuppressed;
        }
      }
      const ids = (el.getAttribute("data-motionkit-step-id") || "")
        .split(",")
        .filter((id) => id && id !== step.id);
      if (ids.length) el.setAttribute("data-motionkit-step-id", ids.join(","));
      else el.removeAttribute("data-motionkit-step-id");
    });
  });
}
