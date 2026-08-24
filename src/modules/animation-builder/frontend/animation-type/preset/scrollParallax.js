const PRESET_KEY = "motionkit-mk-scroll-parallax-pa";

export function scrollParallax() {
  const instances = new Map();

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.effects.forEach((ef) => {
      try {
        ef.kill();
      } catch (err) {
        console.warn("[scrollParallax] effect teardown error:", err);
      }
    });
    inst.elements.forEach((el) => {
      try {
        el.removeAttribute("data-speed");
        el.removeAttribute("data-lag");
        if (window.gsap) {
          window.gsap.set(el, { clearProps: "transform,will-change" });
        }
      } catch {
        /* element may have been removed from DOM */
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function getCurrentDevice() {
    const w = window.innerWidth;
    if (w >= 1200) return "desktop";
    if (w >= 992) return "laptop";
    if (w >= 768) return "tab_land";
    if (w >= 576) return "tab";
    return "mobile";
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY) return;
    if (anim.isPublished === false) return;

    const { id } = anim;

    const parallaxItems =
      Array.isArray(anim.parallaxItems) && anim.parallaxItems.length > 0
        ? anim.parallaxItems
        : [];

    if (parallaxItems.length === 0) {
      console.warn("[scrollParallax] no parallaxItems found, skipping.");
      return;
    }

    // ── Get ScrollSmoother instance ──
    let smoother = ScrollSmoother.get();

    // if scroll smoother not found initializing new scroll smoother with currentPageSettings (global settings) value. (Note:This is also applied for motionkit editor preview)
    if (!smoother) {
      const currentPreviewDevice = getCurrentDevice();
      const scrollSmootherSettings =
        motionkitData.currentPageSettings?.scrollSmother || {};

      const isSmmotherEnabled = scrollSmootherSettings?.enable || false;
      const smootherValue =
        scrollSmootherSettings?.[currentPreviewDevice]?.value || 1;

      if (!isSmmotherEnabled) {
        console.warn(
          "[scrollParallax] ScrollSmoother not found and smoothing is disabled in page settings. Parallax effects may not work as intended.",
        );
        return;
      }
      smoother = ScrollSmoother.create({
        smooth: smootherValue,
      });
    }
    teardown(id);

    const device = getCurrentDevice();
    const effects = [];
    const elements = [];

    parallaxItems.forEach((itemConfig) => {
      const { itemClass, devices = {} } = itemConfig;
      if (!itemClass) return;

      // ── Resolve element ──
      let targetEl;
      try {
        targetEl = document.querySelector(itemClass);
      } catch (err) {
        console.warn(
          `[scrollParallax] invalid itemClass "${itemClass}":`,
          err.message,
        );
        return;
      }
      if (!targetEl) {
        console.warn(
          `[scrollParallax] element not found for "${itemClass}", skipping.`,
        );
        return;
      }
      targetEl.setAttribute("data-motionkit-anim-id", id);
      elements.push(targetEl);

      // Preview-one mode: this item stays tagged for the editor's inspector, but no
      // ScrollSmoother effect is registered — only the previewed animation may play.
      if (anim.mkInert) return;

      // ── Read device values ──
      const bucket = devices[device] ?? devices.desktop ?? {};
      const speed = Number(bucket.dataSpeed ?? 1);
      const lag = Number(bucket.dataLag ?? 0);

      // ── Apply via ScrollSmoother effects API ──
      // This is all we need — ScrollSmoother handles everything internally.
      const effect = smoother.effects(targetEl, { speed, lag });
      effects.push(effect);
    });

    if (effects.length === 0) return;

    instances.set(id, { effects, elements });
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "motionkit-animation-config") return;
    const incoming = event.data.data?.all_animations || [];
    const activeIds = new Set(incoming.map((a) => a.id).filter(Boolean));
    for (const id of [...instances.keys()]) {
      if (!activeIds.has(id)) teardown(id);
    }
  });

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

scrollParallax();
