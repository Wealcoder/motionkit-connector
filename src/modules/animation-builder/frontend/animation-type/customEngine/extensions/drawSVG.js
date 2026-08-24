export function registerDrawSVGMethod() {
  if (typeof DrawSVGPlugin === "undefined") return false;
  try {
    gsap.registerPlugin(DrawSVGPlugin);
  } catch (e) {
    /* noop */
  }
  return true;
}
