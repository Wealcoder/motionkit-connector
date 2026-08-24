import { requestRefresh } from "./scheduler.js";
import { setActive, getActive } from "./registry.js";
import { teardown } from "./cleanup.js";
import { isCustomAnimation } from "./helper/guards.js";
import { tagAllTargets, untagAllTargets } from "./helper/tagTargets.js";
import { rememberAnim, forgetAnim } from "./helper/inspector.js";
import { revertSplitsFor } from "./extensions/splitText.js";
import {
  applyParallaxSteps,
  releaseParallaxFor,
} from "./extensions/parallax.js";
import { releaseRenderClaims } from "./helper/renderOrder.js";
import { buildHandle } from "./handlers/index.js";
import { registerAllExtensions } from "./extensions/index.js";

// Public entry point for the custom engine. isCustomAnimation is re-exported
// here so customAnimation.js keeps a single import surface; the trigger-type
// builders live under ./handlers and the shared helpers under ./helper.
export { isCustomAnimation };

export function handleCustomAnimation(anim) {
  if (!isCustomAnimation(anim)) return;

  // Cheap no-op once everything registered; picks up plugins that loaded after boot.
  registerAllExtensions();

  // Live-update safety — editor re-dispatches on every edit.
  if (getActive(anim.id)) teardown(anim.id);

  rememberAnim(anim);
  tagAllTargets(anim);

  // Preview-one mode (frontend.js sets mkInert on every animation except the one being
  // previewed). Targets are tagged above so the editor's inspector still finds them —
  // we just don't build a handle, so nothing plays, scrubs, or listens.
  if (anim.mkInert) return;

  // Parallax is a persistent ScrollSmoother effect rather than a tween, so it is
  // registered here — before any trigger handler opens a gsap.context, and for
  // every trigger type alike. Building it inside a context would let ctx.revert()
  // own it, and building it inside a handler would gate an ambient scroll effect
  // behind a click/hover event.
  const hasParallax = applyParallaxSteps(anim.id, anim.timeline?.animations);

  let handle = buildHandle(anim);
  // A parallax-only animation legitimately builds no timeline (e.g. on an
  // on_scroll trigger with no ScrollTrigger rows). Give it an empty handle so it
  // still lands in the active registry and teardown runs to kill its effects.
  if (!handle && hasParallax) handle = { contexts: [], listeners: [] };
  // Nothing was built means nothing will ever tear this down, so undo what the pre-build steps left behind.
  if (!handle) {
    untagAllTargets(anim);
    revertSplitsFor(anim.id);
    releaseRenderClaims(anim.id);
    releaseParallaxFor(anim.id);
    forgetAnim(anim.id);
    return;
  }

  setActive(anim.id, handle);
  requestRefresh();
}
