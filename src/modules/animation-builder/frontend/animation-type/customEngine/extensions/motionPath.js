// MotionPathPlugin is loaded by the asset loader via the active-plugins broadcast.
// motionPath rides as a native GSAP tween var (on a normal from/to bucket), so
// there's no interception — we just register the plugin so gsap resolves the
// `motionPath` var at tween time instead of silently dropping it (mirrors drawSVG).
export function registerMotionPathMethod() {
  if (typeof MotionPathPlugin === "undefined") return false;
  try {
    gsap.registerPlugin(MotionPathPlugin);
  } catch (e) {
    /* noop */
  }

  return true;
}
