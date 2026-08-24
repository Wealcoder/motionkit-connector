// Global reset for all animation types. Editor-only — dispatched on `aae-reset-animation`.
// Sweeps the DOM for any element marked with `data-motionkit-anim-id` and clears applied state
// across free animations and GSAP alike.

const FREE_CLASS_PREFIX = "motionkit-free-ab-";
const FREE_INIT_STYLE_CLASS = "motionkit-free-ab-init-style-props";
const CSS_VAR_PREFIX = "--animation";

function clearFreeAnimationNode(node) {
  // Drop free-preset marker classes
  [...node.classList].forEach((cls) => {
    if (cls.startsWith(FREE_CLASS_PREFIX) || cls === FREE_INIT_STYLE_CLASS) {
      node.classList.remove(cls);
    }
  });

  // Drop animation-* CSS custom properties
  for (let i = node.style.length - 1; i >= 0; i--) {
    const prop = node.style[i];
    if (prop.startsWith(CSS_VAR_PREFIX)) node.style.removeProperty(prop);
  }

  // Drop the observer back-reference if it's still hanging around
  delete node.__wcfFreeAnimConfig;
}

function killGsap(nodes) {
  const { gsap, ScrollTrigger } = window;
  const nodeSet = new Set(nodes);

  // A SplitText-driven tween's real targets are the char/word/line spans
  // SplitText generates — those are never individually tagged with
  // data-motionkit-anim-id (only the container matching step.itemClass is, via
  // tagAllTargets). closest() catches both: an exact-tagged element (matches
  // itself) and a split span nested inside one (matches the ancestor). It
  // does NOT walk to ANCESTORS of the checked element being tagged further
  // out, so ScrollSmoother's own wrapper/body-level trigger — an ANCESTOR of
  // our tagged elements, never a descendant — still correctly never matches.
  const isOwned = (el) => !!(el && el.closest && el.closest("[data-motionkit-anim-id]"));

  // Scoped sweep: only kill triggers whose trigger element OR whose driven
  // animation targets one of OUR animated elements (data-motionkit-anim-id). Matching
  // the animation targets — not just the trigger element — catches animations
  // that use a custom trigger selector (a section/container that never carries
  // data-motionkit-anim-id); without it those ScrollTriggers survive every reset and
  // accumulate on each Play/Save. ScrollSmoother's own internal trigger is
  // attached to body/wrapper and its animation targets the content wrapper —
  // never owned — so it's never touched. No kill, no recreate, no lerp
  // interruption, ever, during a normal reset/Play cycle.
  // A timeline has no targets() of its own, so flatten it to its child tweens. Without this a
  // timeline-mode animation pointed at a custom trigger matches NEITHER test — the trigger
  // container is never tagged and the timeline reports no targets — so its ScrollTrigger and
  // markers survive every reset.
  const targetsOf = (anim) => {
    if (!anim) return [];
    if (typeof anim.targets === "function") return anim.targets();
    if (typeof anim.getChildren === "function") {
      return anim
        .getChildren(true, true, false)
        .reduce(
          (acc, child) =>
            typeof child.targets === "function"
              ? acc.concat(child.targets())
              : acc,
          [],
        );
    }
    return [];
  };

  ScrollTrigger?.getAll?.().forEach((st) => {
    const target = st.trigger || st.vars?.trigger;
    const animTargets = targetsOf(st.animation);
    const ownsTrigger = isOwned(target);
    const ownsAnimation = animTargets.some(isOwned);
    if (ownsTrigger || ownsAnimation) {
      st.kill();
    }
  });

  // getChildren(true, true, false) flattens nested timelines down to the
  // actual tweens so .targets() resolves correctly.
  gsap?.globalTimeline?.getChildren?.(true, true, false).forEach((t) => {
    try {
      const targets = t.targets ? t.targets() : [];
      if (targets.some(isOwned)) t.kill();
    } catch (_) {
      /* tween without resolvable targets */
    }
  });

  if (gsap?.set && nodes.length) {
    // clearProps:"all" wipes the element's ENTIRE inline style attribute —
    // author-set styles (position/size/background) included, not just props
    // GSAP wrote. It still has to run so GSAP's per-element transform cache
    // (el._gsap) is flushed; afterwards restore the inline styles snapshotted
    // at first tag time (customEngine cleanup.js::tagElement). Preset-tagged
    // elements have no snapshot and keep the clear-only behavior.
    gsap.set(nodes, { clearProps: "all" });
    nodes.forEach((node) => {
      if (typeof node.__wcfOrigCss === "string") {
        node.style.cssText = node.__wcfOrigCss;
      }
    });
  }
}
function runGlobalReset() {
  const animatedNodes = [...document.querySelectorAll("[data-motionkit-anim-id]")];
  killGsap(animatedNodes);
  animatedNodes.forEach((node) => {
    clearFreeAnimationNode(node);
    node.removeAttribute("data-motionkit-anim-id");
    node.removeAttribute("data-motionkit-step-id");
  });
  // Preset-specific cleanups (e.g. customEngine) listen for this event and
  // run AFTER the global nuke. Using a DOM event instead of a shared callback
  // registry keeps this file editor-only — production bundles don't static-
  // import it, so listeners in other bundles just sit dormant in prod.
  document.dispatchEvent(new CustomEvent("motionkit:reset-done"));
}

// Two channels so presets don't need to forward:
// - window.message: external triggers (cross-frame, explicit postMessage)
// - document event: what frontend.js dispatches for `motionkit-animation-config-reset`
window.addEventListener("message", (e) => {
  if (e.data?.type === "aae-reset-animation") runGlobalReset();
});
document.addEventListener("aae-reset-animation", runGlobalReset);
