// Progress tracking. Drives a 0→1 value that preset builders render however they like.
//
// Three completion strategies, all of which resolve exactly once and all of which are
// bounded by the caller's maxDuration watchdog:
//
//   load              — window 'load' (all assets). Most honest, slowest.
//   domcontentloaded  — DOM parsed. Fast, but images can pop in after the reveal.
//   simulated         — never listens to the browser at all; the curve simply runs for
//                       minDuration. This is what most commercial preloaders do, because
//                       real progress stalls on one slow image and reads as broken.

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * @param {object} opts
 * @param {string} opts.completeOn
 * @param {number} opts.minDuration  seconds — the floor
 * @param {number} opts.maxDuration  seconds — the hard ceiling
 * @param {(p:number)=>void} opts.onTick    called with 0..1 every frame
 * @param {()=>void} opts.onComplete        called exactly once when p reaches 1
 * @returns {() => void} cancel
 */
export function trackProgress({
  completeOn,
  minDuration,
  maxDuration,
  onTick,
  onComplete,
}) {
  let rafId = null;
  let cancelled = false;
  let finished = false;
  let ready = completeOn === "simulated";
  const start = performance.now();
  const minMs = Math.max(0, minDuration) * 1000;
  const maxMs = Math.max(1, maxDuration) * 1000;

  const markReady = () => {
    ready = true;
  };

  if (completeOn === "load") {
    if (document.readyState === "complete") ready = true;
    else window.addEventListener("load", markReady, { once: true });
  } else if (completeOn === "domcontentloaded") {
    if (document.readyState !== "loading") ready = true;
    else
      document.addEventListener("DOMContentLoaded", markReady, { once: true });
  }

  const finish = () => {
    if (finished || cancelled) return;
    finished = true;
    try {
      onTick(1);
    } catch (e) {
      /* a broken tick must not block the reveal */
    }
    try {
      onComplete();
    } catch (e) {
      /* same */
    }
  };

  const frame = () => {
    if (cancelled || finished) return;
    const elapsed = performance.now() - start;

    // Hard ceiling wins over everything, including a load event that never fires.
    if (elapsed >= maxMs) return finish();

    // Time-based floor. Until the page is ready we approach 0.9 asymptotically so the
    // bar always moves but never claims to be done.
    const minRatio = minMs > 0 ? Math.min(1, elapsed / minMs) : 1;
    const p = ready
      ? easeOut(minRatio)
      : Math.min(0.9, easeOut(minRatio) * 0.9);

    try {
      onTick(p);
    } catch (e) {
      /* ignore — never let a preset's tick stall the loop */
    }

    if (ready && minRatio >= 1) return finish();
    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("load", markReady);
    document.removeEventListener("DOMContentLoaded", markReady);
  };
}
