import { registerMethod } from "../registry.js";
import { normalizeStepVars } from "../select/merge.js";
import { querySelectorAllCached } from "../scheduler.js";
import { debugLog } from "../helper/logger.js";

// Parallax runs as a PROPERTY on a from/to/fromTo/set bucket:
//   { ...gsapVars, parallax: { dataSpeed, dataLag } }
// authored by the editor's ParallaxItemsField, with the target coming from the
// step's own itemClass like every other effect.
//
// It is NOT a tween. ScrollSmoother.effects() registers a persistent scroll
// effect that owns the element's transform for the life of the page, so:
//
//   * The effect is registered in a PRE-PASS from index.js, outside any
//     gsap.context and before the trigger handler runs — same reasoning as
//     presplitSteps. A context can't revert what it didn't create, which is
//     exactly what we want here: the effect must survive a scrub/replay and is
//     torn down explicitly by releaseParallaxFor instead.
//   * It is trigger-independent. A parallax step on a click animation is live
//     from build time, not from the first click, because "parallax" means
//     "while the page scrolls", not "when the trigger fires".
//   * stripParallax removes the key before the tween is built, so GSAP never
//     sees a `parallax` var it would try to animate as a CSS property.
//
// The per-device dimension is already resolved: frontend.js flattens
// step.devices[currentDevice] into step.vars before dispatch, so the config
// read here is the active device's bucket. That is deliberate — it inherits
// the deviceConfig media queries the rest of the engine uses rather than
// re-deriving breakpoints locally.

// GSAP-neutral values: speed 1 = moves with the page, lag 0 = no catch-up
// delay. The editor's field defaults to 0.5/0.5 and auto-hydrates, so a
// well-formed config always carries both keys — these only cover malformed
// data, where doing nothing beats inventing motion the author never set.
const NEUTRAL_SPEED = 1;
const NEUTRAL_LAG = 0;

// animId -> { triggers: ScrollTrigger[], elements: Element[] }
const byAnim = new Map();

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// scroll.js hands an ELEMENT as itemClass on its per-element path; everywhere
// else it is a selector string. Mirrors scrambleText.js/renderOrder.js.
function resolveEls(itemClass) {
  if (!itemClass) return [];
  if (typeof itemClass === "string") return [...querySelectorAllCached(itemClass)];
  return itemClass.nodeType === 1 ? [itemClass] : [];
}

// The page's one ScrollSmoother, or null.
//
// Creation belongs to includes/Frontend/ScrollSmoother.php, which owns the
// #smooth-wrapper injection, the normalizeScroll/effects options, and the
// settings-driven boot/kill — and which exists precisely so two owners can't
// fight over the single instance. So we nudge its idempotent reboot rather
// than calling ScrollSmoother.create ourselves; if smoothing is switched off
// for this page/device that nudge correctly leaves us with nothing.
function getSmoother() {
  if (typeof ScrollSmoother === "undefined") return null;
  const existing = ScrollSmoother.get?.() || null;
  if (existing) return existing;
  try {
    window.motionkitRebootSmoother?.();
  } catch (e) {
    /* noop */
  }
  return ScrollSmoother.get?.() || null;
}

// True when `vars` is a plain vars bag we can safely inspect for `parallax`.
// `call` steps carry a function or { fn, args } and must pass through untouched.
function isVarsBag(vars) {
  return !!vars && typeof vars === "object" && !Array.isArray(vars);
}

// The editor's field defaults to `{}` and hydrates on mount, so an untouched
// control can still reach us as an empty object. Treat that as "not configured"
// rather than registering a neutral effect — a no-op effect still stamps
// will-change + data-speed on the element and forces a handle to be kept alive.
function hasValues(cfg) {
  return isVarsBag(cfg) && (cfg.dataSpeed != null || cfg.dataLag != null);
}

function readConfig(bucket) {
  if (!isVarsBag(bucket)) return null;
  const raw = bucket.parallax;
  return hasValues(raw) ? raw : null;
}

// Resolve the { dataSpeed, dataLag } config for a step, matching how
// standard.js resolves flip/splitText: from/to/set read their own bucket,
// fromTo prefers `to` and falls back to `from`, and the legacy standalone
// method: "parallax" shape is already the config itself.
export function parallaxConfigForStep(step) {
  const vars = normalizeStepVars(step);
  if (!isVarsBag(vars)) return null;
  if (step.method === "parallax") {
    return vars.parallax ? readConfig(vars) : (hasValues(vars) ? vars : null);
  }
  if (step.method === "fromTo") return readConfig(vars.to) || readConfig(vars.from);
  return readConfig(vars);
}

// Remove `parallax` from a step's normalized vars before the tween is built.
// Returns the vars unchanged when there was no parallax (no allocation on the
// common path), a copy without it when other properties remain, or null when
// parallax was ALL the step carried — applyStep reads that null as "no tween
// to build here" and skips the step entirely.
export function stripParallax(vars, method) {
  if (method === "parallax") return null;
  if (!isVarsBag(vars)) return vars;

  if (method === "fromTo") {
    const from = stripBucket(vars.from);
    const to = stripBucket(vars.to);
    if (from === vars.from && to === vars.to) return vars;
    const fromEmpty = !from || !Object.keys(from).length;
    const toEmpty = !to || !Object.keys(to).length;
    if (fromEmpty && toEmpty) return null;
    return { ...vars, from: from || {}, to: to || {} };
  }

  const next = stripBucket(vars);
  if (next === vars) return vars;
  return Object.keys(next).length ? next : null;
}

// Identity when the bucket has no `parallax`, so the strip is free for the
// overwhelming majority of steps.
function stripBucket(bucket) {
  if (!isVarsBag(bucket) || !("parallax" in bucket)) return bucket;
  const { parallax: _drop, ...rest } = bucket;
  return rest;
}

// Register the ScrollSmoother effects for every parallax step of one animation.
// Returns true when at least one effect was created, so the caller knows this
// animation produced something that needs tearing down even if its trigger
// handler built no timeline (e.g. a parallax-only animation on an on_scroll
// trigger with no ScrollTrigger rows configured).
export function applyParallaxSteps(animId, steps) {
  // Defensive: index.js tears down an active animation before rebuilding, but a
  // build that never produced a handle leaves no active entry to tear down.
  releaseParallaxFor(animId);

  const configs = [];
  (steps || []).forEach((step) => {
    if (!step?.itemClass || step.disabled === true) return;
    const cfg = parallaxConfigForStep(step);
    if (cfg) configs.push({ step, cfg });
  });
  if (!configs.length) return false;

  const smoother = getSmoother();
  if (!smoother) {
    debugLog("[customEngine] parallax skipped — no ScrollSmoother on this page", {
      animationId: animId,
      hint: "ScrollSmoother.effects requires a live smoother; enable Scroll Smoother for this page/device in MotionKit settings",
    });
    return false;
  }

  const triggers = [];
  const elements = [];
  const seen = new Set();

  configs.forEach(({ step, cfg }) => {
    const speed = toNumber(cfg.dataSpeed, NEUTRAL_SPEED);
    const lag = toNumber(cfg.dataLag, NEUTRAL_LAG);
    // One element can be named by several steps; registering it twice would
    // stack two competing effects on the same transform.
    const els = resolveEls(step.itemClass).filter((el) => !seen.has(el));
    els.forEach((el) => seen.add(el));
    if (!els.length) return;
    try {
      // One call for the whole step, not one per element: effects() runs a full
      // ScrollTrigger.refresh() on every invocation unless told not to. We opt
      // out entirely — index.js already ends the build with the rAF-coalesced
      // requestRefresh(), which is exactly this job done once for the page.
      const created = smoother.effects(els, { speed, lag, refresh: false });
      // effects() returns an ARRAY of ScrollTrigger instances. Normalized
      // defensively so teardown can kill each one either way.
      const list = Array.isArray(created) ? created : created ? [created] : [];
      if (!list.length) return;
      triggers.push(...list);
      elements.push(...els);
    } catch (e) {
      debugLog("[customEngine] parallax effect failed", {
        animationId: animId,
        stepId: step.id,
        itemClass: step.itemClass,
        error: e,
      });
    }
  });

  if (!triggers.length) return false;
  byAnim.set(animId, { triggers, elements });
  return true;
}

// ScrollSmoother writes transform (and will-change) every frame, so killing the
// effect's ScrollTrigger stops it but leaves the last frame's transform on the
// element. clearProps removes just those two, rather than restoring
// __wcfOrigCss wholesale — that snapshot is the whole style attribute and
// would undo whatever else is animating the element right now.
function restoreElements(elements) {
  (elements || []).forEach((el) => {
    try {
      el.removeAttribute?.("data-speed");
      el.removeAttribute?.("data-lag");
      if (typeof gsap !== "undefined") {
        gsap.set(el, { clearProps: "transform,will-change" });
      }
    } catch (e) {
      /* element may have been detached */
    }
  });
}

function tweensOf(el) {
  if (typeof gsap === "undefined" || typeof gsap.getTweensOf !== "function") return [];
  try {
    return gsap.getTweensOf(el) || [];
  } catch (e) {
    return [];
  }
}

export function releaseParallaxFor(animId) {
  const entry = byAnim.get(animId);
  if (!entry) return;
  const { triggers, elements } = entry;

  // Killing the effect's ScrollTrigger is NOT enough when lag > 0. ScrollSmoother
  // implements lag as a held-open `gsap.to(el, { y: "+=0", duration: lag })`, and
  // its onKill runs revert() -> initDynamicValues(), which RE-CREATES that tween.
  // The result is an orphan tween with no trigger left to drive it: it re-renders
  // the element's cached y a few hundred ms after teardown and parks it there
  // permanently, undoing the clearProps below.
  //
  // Snapshotting the element's tweens first and killing only what appeared after
  // the kill targets exactly that orphan, and leaves tweens belonging to other
  // animations on the same element alone.
  const known = new Set();
  elements.forEach((el) => tweensOf(el).forEach((t) => known.add(t)));

  triggers.forEach((t) => {
    try {
      t.kill?.();
    } catch (e) {
      /* already killed by the global reset sweep */
    }
  });

  elements.forEach((el) =>
    tweensOf(el).forEach((t) => {
      if (known.has(t)) return;
      try {
        t.kill();
      } catch (e) {
        /* noop */
      }
    }),
  );

  restoreElements(elements);
  byAnim.delete(animId);
}

export function clearParallaxCache() {
  [...byAnim.keys()].forEach(releaseParallaxFor);
  byAnim.clear();
}

export function registerParallaxMethod() {
  // ScrollSmoother is an always-on baseline handle (see Frontend.php) but loads
  // in the footer, so it can land after this module runs — returning false puts
  // this registrar back in the outstanding list for the next attempt.
  if (typeof ScrollSmoother === "undefined") return false;
  try {
    gsap.registerPlugin(ScrollSmoother);
  } catch (e) {
    /* noop */
  }

  // Registered only so a legacy method: "parallax" step doesn't trip
  // applyStep's "Unknown step method" warning. It intentionally builds nothing
  // — stripParallax returns null for this method, so applyStep bails before
  // ever reaching this handler, and the effect itself came from the pre-pass.
  registerMethod("parallax", () => {});

  return true;
}
