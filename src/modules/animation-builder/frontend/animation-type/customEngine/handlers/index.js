import { buildScrollAnim } from "./scroll.js";
import { buildPageloadAnim } from "./pageload.js";
import { buildInteractionAnim } from "./interaction.js";

// Route an animation to the builder for its trigger type. Each builder returns
// a handle ({ contexts, listeners }) that cleanup.teardown reverts, or null.
export function buildHandle(anim) {
  switch (anim.trigger?.type) {
    case "on_scroll":
      return buildScrollAnim(anim);
    case "click":
      return buildInteractionAnim(anim, "click");
    case "hover":
      return buildInteractionAnim(anim, "hover");
    case "page_load":
    default:
      return buildPageloadAnim(anim);
  }
}
