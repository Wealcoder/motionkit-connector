// Physics2DPlugin is loaded by the asset loader via the active-plugins broadcast.
// physics2D rides as a native GSAP tween var (on a normal from/to bucket), so
// there's no interception — we just register the plugin so gsap resolves the
// `physics2D` var at tween time instead of silently dropping it (mirrors drawSVG).
export function registerPhysics2DMethod() {
  if (typeof Physics2DPlugin === "undefined") return false;
  try {
    gsap.registerPlugin(Physics2DPlugin);
  } catch (e) {
    /* noop */
  }

  return true;
}
