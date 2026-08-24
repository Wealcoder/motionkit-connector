// MorphSVGPlugin is loaded by the asset loader via the active-plugins broadcast.
// morphSVG rides as a native GSAP tween var (on a normal from/to bucket), so
// there's no interception — we just register the plugin so gsap resolves the
// `morphSVG` var at tween time instead of silently dropping it (mirrors drawSVG).
export function registerMorphSVGMethod() {
  if (typeof MorphSVGPlugin === "undefined") return false;
  try {
    gsap.registerPlugin(MorphSVGPlugin);
  } catch (e) {
    /* noop */
  }

  return true;
}
