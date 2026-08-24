// True when the current page is being served for the MotionKit editor
// preview. Use to gate editor-only visuals such as ScrollTrigger markers
// so they never leak to the public frontend.
//
// Checks two signals because the iframe's URL can be proxied/encoded in
// ways that hide the `action=motionkit-editor` query param:
//   1. URL param (fast path when served directly)
//   2. motionkitData.motionkit_token — PHP only localizes this token in editor mode
export const isPreviewMode = () => {
  if (typeof window === "undefined") return false;
  if (window.location.search.includes("action=motionkit-editor")) return true;
  return !!window.motionkitData?.motionkit_token;
};
