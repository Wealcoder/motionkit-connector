const PRESET_KEY = "motionkit-mk-sticky-hs-pa";

export function headerStickyAnim() {
  // id -> { timelines, cleanups, item, clone }
  // The original `item` is never moved, wrapped, or pinned. Only the
  // `clone` is inserted (as a sibling of the original, or in <body> when a
  // transformed ancestor would break `position: fixed`). This keeps WP FSE
  // layout selectors like `.is-layout-constrained > .alignwide` intact and
  // avoids ScrollTrigger's pin-spacer entirely.
  const instances = new Map();

  function convertToPixels(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return value;
    if (/^-?\d+(\.\d+)?$/.test(value)) return parseFloat(value);
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    el.style.height = value;
    document.body.appendChild(el);
    const px = el.offsetHeight;
    document.body.removeChild(el);
    return px;
  }

  // `position: fixed` is viewport-relative ONLY when no ancestor has
  // transform / filter / perspective set. ScrollSmoother (and some themes)
  // transform a content wrapper — in that case the clone must live in
  // <body> instead, otherwise it'd be positioned relative to the
  // transformed ancestor and drift on scroll.
  function hasTransformedAncestor(el) {
    let p = el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const cs = window.getComputedStyle(p);
      if (
        cs.transform !== "none" ||
        cs.filter !== "none" ||
        cs.perspective !== "none" ||
        (cs.willChange && /transform|filter|perspective/.test(cs.willChange))
      ) {
        return true;
      }
      p = p.parentElement;
    }
    return false;
  }

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.cleanups.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[headerSticky] cleanup error:", err);
      }
    });
    inst.timelines.forEach((tl) => {
      try {
        tl.scrollTrigger?.kill();
        tl.revert();
        tl.kill();
      } catch (err) {
        console.warn("[headerSticky] timeline teardown error:", err);
      }
    });
    if (inst.clone?.parentNode) {
      inst.clone.parentNode.removeChild(inst.clone);
    }
    if (inst.item) {
      gsap.set(inst.item, { clearProps: "opacity" });
    }
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY) return;
    if (anim.isPublished === false) return;
    if (!anim.itemClass) return;

    const {
      id,
      itemClass,
      endClass: endClassRaw,
      styleClass,
      vars = {},
    } = anim;
    const {
      startPosition = 0,
      zIndex = 9999,
      upScroll = false,
      ease,
      duration,
    } = vars;

    let item;
    try {
      item = document.querySelector(itemClass);
    } catch (err) {
      console.warn(
        `[headerSticky] invalid itemClass "${itemClass}":`,
        err.message,
      );
      return;
    }
    if (!item) return;

    teardown(id);

    // Preview-one mode: tag the real item so the editor's inspector keeps its marker,
    // then bail before the sticky clone is created — only the previewed animation builds.
    if (anim.mkInert) {
      item.setAttribute("data-motionkit-anim-id", id);
      return;
    }

    const calculatedPosition = convertToPixels(startPosition);
    const endClass =
      endClassRaw && endClassRaw !== ""
        ? endClassRaw
        : ".motionkit-pin-end-selector-26";

    const itemClone = item.cloneNode(true);
    if (styleClass && typeof styleClass === "string") {
      itemClone.classList.add(styleClass.replace(/^[.#]/, ""));
    }

    item.setAttribute("data-motionkit-anim-id", id);
    itemClone.setAttribute("data-motionkit-anim-id", id);

    // Sibling placement keeps theme ancestor selectors (e.g.
    // `header .wp-block-site-title { … }`) matching the clone. If a
    // transformed ancestor exists (ScrollSmoother / 3d-transform themes),
    // fall back to <body> so `position: fixed` stays viewport-relative.
    const useBodyFallback = hasTransformedAncestor(item);
    if (useBodyFallback) {
      document.body.appendChild(itemClone);
    } else {
      item.parentNode.insertBefore(itemClone, item.nextSibling);
    }

    gsap.set(itemClone, {
      position: "fixed",
      top: 0,
      zIndex,
      opacity: 0,
      y: -20,
      pointerEvents: "none",
      willChange: "transform, opacity",
    });

    // Mirror the original's actual rendered bounding box (left + width) so
    // the clone matches alignwide / has-global-padding sizing instead of
    // spanning the full viewport. Re-measure on resize and ScrollTrigger
    // refresh so layout changes don't desync it.
    const syncCloneBounds = () => {
      const rect = item.getBoundingClientRect();
      itemClone.style.left = `${rect.left}px`;
      itemClone.style.width = `${rect.width}px`;
      itemClone.style.right = "auto";
    };
    syncCloneBounds();

    const cleanups = [];
    const timelines = [];

    const onResize = () => syncCloneBounds();
    window.addEventListener("resize", onResize);
    cleanups.push(() => window.removeEventListener("resize", onResize));

    if (window.ScrollTrigger) {
      const onSTRefresh = () => syncCloneBounds();
      window.ScrollTrigger.addEventListener("refresh", onSTRefresh);
      cleanups.push(() =>
        window.ScrollTrigger.removeEventListener("refresh", onSTRefresh),
      );
    }

    const showClone = () => {
      gsap.killTweensOf(itemClone);
      gsap.set(itemClone, { pointerEvents: "auto" });
      gsap.to(itemClone, {
        y: calculatedPosition,
        opacity: 1,
        duration,
        ease,
        overwrite: true,
      });
      gsap.to(item, { opacity: 0, duration: duration ?? 0.3 });
    };

    const hideClone = () => {
      gsap.killTweensOf(itemClone);
      gsap.to(itemClone, {
        y: -20,
        opacity: 0,
        duration,
        ease,
        overwrite: true,
        onComplete: () => {
          itemClone.style.pointerEvents = "none";
        },
      });
      gsap.to(item, { opacity: 1, duration: duration ?? 0.3 });
    };

    if (upScroll) {
      const state = {
        lastScrollY: window.scrollY,
        isVisible: false,
        isInRange: false,
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: item,
          endTrigger: endClass,
          start: `top+=${calculatedPosition} top`,
          end: "bottom bottom-=600",
          invalidateOnRefresh: true,
          onEnter: () => {
            state.isInRange = true;
            state.lastScrollY = window.scrollY;
            gsap.to(item, { opacity: 0 });
          },
          onLeave: () => {
            state.isInRange = false;
            state.isVisible = false;
            hideClone();
          },
          onEnterBack: () => {
            state.isInRange = true;
            state.lastScrollY = window.scrollY;
            gsap.to(item, { opacity: 0 });
          },
          onLeaveBack: () => {
            state.isInRange = false;
            state.isVisible = false;
            hideClone();
          },
        },
      });
      timelines.push(tl);

      const onScroll = () => {
        if (!state.isInRange) return;
        const diff = window.scrollY - state.lastScrollY;
        if (diff < -5 && !state.isVisible) {
          showClone();
          state.isVisible = true;
        } else if (diff > 5 && state.isVisible) {
          hideClone();
          state.isVisible = false;
        }
        state.lastScrollY = window.scrollY;
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));
    } else {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: item,
          endTrigger: endClass,
          start: `top+=${calculatedPosition} top`,
          end: "bottom bottom-=600",
          invalidateOnRefresh: true,
          onEnter: showClone,
          onLeave: hideClone,
          onEnterBack: showClone,
          onLeaveBack: hideClone,
        },
      });
      timelines.push(tl);
    }

    instances.set(id, { timelines, cleanups, item, clone: itemClone });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

headerStickyAnim();
