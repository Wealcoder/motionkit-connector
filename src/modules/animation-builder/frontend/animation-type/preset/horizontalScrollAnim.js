const PRESET_KEY = "motionkit-mk-scroll-hor-pa";

export function horizontalScrollAnim() {
  // id -> { timelines: GSAPTimeline[] }
  const instances = new Map();

  // `el` is the item the value belongs to — `%` is relative to that item's
  // own natural width, so 100% keeps whatever the content/CSS already sized
  // it to. Measured before any width is applied, or the second read would
  // just return the width we set on the first.
  function convertToPixels(value, el) {
    if (value == null || value === "") return 0;
    const str = String(value);
    if (str.endsWith("px")) return parseFloat(str);
    if (str.endsWith("vw")) return (parseFloat(str) / 100) * window.innerWidth;
    if (str.endsWith("%")) {
      if (!el) return 0;
      return (parseFloat(str) / 100) * el.getBoundingClientRect().width;
    }
    const num = parseFloat(str);
    if (Number.isFinite(num)) return num;
    console.warn("[horizontalScroll] unsupported unit:", value);
    return 0;
  }

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.timelines.forEach((tl) => {
      try {
        tl.revert();
        tl.kill();
      } catch (err) {
        console.warn("[horizontalScroll] timeline teardown error:", err);
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY) return;
    if (anim.isPublished === false) return;
    if (!anim.containerClass || !anim.itemClass) return;

    const { id, containerClass, itemClass, itemWidthType, vars = {} } = anim;
    const { containerHeight, itemWidth, itemsWidth } = vars;
    if (!containerHeight) return;

    let containerEl;
    try {
      containerEl = document.querySelector(containerClass);
    } catch (err) {
      console.warn(
        `[horizontalScroll] invalid containerClass "${containerClass}":`,
        err.message,
      );
      return;
    }
    if (!containerEl) return;

    let items;
    try {
      items = Array.from(containerEl.querySelectorAll(itemClass));
    } catch (err) {
      console.warn(
        `[horizontalScroll] invalid itemClass "${itemClass}":`,
        err.message,
      );
      return;
    }
    if (!items.length) return;

    teardown(id);

    containerEl.setAttribute("data-motionkit-anim-id", id);
    items.forEach((el) => el.setAttribute("data-motionkit-anim-id", id));

    // Preview-one mode: targets stay tagged above so the editor's inspector keeps
    // its markers, but nothing is built — only the previewed animation may play.
    if (anim.mkInert) return;

    let widthsPx;
    if (
      itemWidthType === "custom" &&
      Array.isArray(itemsWidth) &&
      itemsWidth.length
    ) {
      widthsPx = itemsWidth
        .slice(0, items.length)
        .map((w, i) => convertToPixels(w, items[i]));
    } else {
      // Resolved per item rather than once: a `%` value measures each item's
      // own width, so the results differ even though the input is shared.
      widthsPx = items.map((el) => convertToPixels(itemWidth, el));
    }

    gsap.set(containerEl, { height: containerHeight, transition: "none" });
    items.forEach((el, i) =>
      gsap.set(el, { width: widthsPx[i], flexShrink: 0 }),
    );

    // Measure the track rather than summing widthsPx: the row's real width
    // also includes flex `gap` and the track's own padding, which the sum
    // can't see. Summing left that spacing untravelled, so the pin released
    // with the last item still off-screen.
    const trackEl = items[0].parentElement;
    const getScrollPx = () =>
      Math.max(0, trackEl.scrollWidth - containerEl.offsetWidth);

    // Items fit (or only one item) — no horizontal scroll needed.
    if (getScrollPx() <= 0) {
      instances.set(id, { timelines: [] });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerEl,
        pin: true,
        start: "top top",
        // Pin range = the measured travel (1:1 horizontal to vertical
        // scroll). Decoupling from `bottom bottom` means the animation
        // gets a sensible scroll length regardless of `containerHeight`.
        // Measured in the callback so invalidateOnRefresh re-reads it.
        end: () => "+=" + getScrollPx(),
        // Smooth catch-up over 1 second instead of jumping with every
        // wheel-tick. Drop to 0.5 if it feels laggy, or back to `true` for
        // instant 1:1 mapping.
        scrub: 1,
        pinSpacing: true,
        invalidateOnRefresh: true,
      },
    });

    tl.to(items, {
      x: () => -getScrollPx(),
      ease: "none",
      force3D: true,
    });

    instances.set(id, { timelines: [tl] });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

horizontalScrollAnim();
