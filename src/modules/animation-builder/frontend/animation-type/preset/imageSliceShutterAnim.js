const PRESET_KEY = "motionkit-mk-image-ss-pa";

// Baked-in look values — kept out of the UI so the preset stays simple.
const SLICE_SKEW = 8; // deg alternating skew as strips fly in
const DEPTH = 42; // deg 3D rotation of the strips
const OFFSCREEN = 104; // % each strip is pushed out before it flies in

// Percent offset for a direction, spreadable into gsap.set().
function directionOffset(direction, amount) {
  const offset = { xPercent: 0, yPercent: 0 };
  if (direction === "topToBottom") offset.yPercent = -amount;
  else if (direction === "bottomToTop") offset.yPercent = amount;
  else if (direction === "leftToRight") offset.xPercent = -amount;
  else if (direction === "rightToLeft") offset.xPercent = amount;
  return offset;
}

// Where strip `index` starts. "alternate" makes every other strip enter from the
// opposite edge (axis decides the pairing axis).
function sliceOffset(direction, axis, index) {
  let resolved = direction;
  if (direction === "alternate") {
    if (axis === "horizontal") {
      resolved = index % 2 ? "rightToLeft" : "leftToRight";
    } else {
      resolved = index % 2 ? "bottomToTop" : "topToBottom";
    }
  }
  return directionOffset(resolved, OFFSCREEN);
}

// Read the image source off an <img> (preferred) or a background-image element.
function resolveImageSrc(el) {
  if (!el) return "";
  if (el.tagName === "IMG") return el.currentSrc || el.getAttribute("src") || "";
  const bg = getComputedStyle(el).backgroundImage;
  if (!bg || bg === "none") return "";
  const match = bg.match(/url\((['"]?)(.*?)\1\)/);
  return match ? match[2] : "";
}

// A 1px overlap between neighbouring strips so sub-pixel layout rounding can't
// leave hairline gaps (the "grid lines" seam).
const BLEED = 1;

// Build the strip layer as children of the frame. Every strip is a WINDOW into
// one full-size background (`background-size: W×H`, position `-left -top`), so all
// strips share the same coordinate space — overlaps show identical pixels
// (seamless) and the 1px bleed closes any rounding gap. When the frame can't be
// measured yet we fall back to percentage sizing. Styles are inline.
function buildSlices(containerEl, src, count, axis) {
  const wrap = document.createElement("div");
  wrap.setAttribute("data-mk-ss-slices", "");
  Object.assign(wrap.style, {
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    borderRadius: "inherit",
    zIndex: "3",
    perspective: "1400px",
  });

  const rect = containerEl.getBoundingClientRect();
  const usePx = rect.width > 0 && rect.height > 0;
  const W = rect.width;
  const H = rect.height;
  const denom = Math.max(count - 1, 1);
  const slices = [];

  for (let i = 0; i < count; i += 1) {
    const slice = document.createElement("span");
    const base = {
      position: "absolute",
      display: "block",
      overflow: "hidden",
      backgroundImage: `url("${src}")`,
      backgroundRepeat: "no-repeat",
      transformStyle: "preserve-3d",
      backfaceVisibility: "hidden",
      willChange: "transform, opacity",
    };

    if (axis === "horizontal") {
      const stripH = H / count;
      if (usePx) {
        Object.assign(slice.style, base, {
          left: "0",
          top: `${i * stripH}px`,
          width: `${W}px`,
          height: `${stripH + BLEED}px`,
          backgroundSize: `${W}px ${H}px`,
          backgroundPosition: `0 ${-i * stripH}px`,
        });
      } else {
        Object.assign(slice.style, base, {
          left: "0",
          top: `${(i * 100) / count}%`,
          width: "100%",
          height: `${100 / count}%`,
          backgroundSize: `100% ${count * 100}%`,
          backgroundPosition: `0 ${(i / denom) * 100}%`,
        });
      }
    } else {
      const stripW = W / count;
      if (usePx) {
        Object.assign(slice.style, base, {
          top: "0",
          left: `${i * stripW}px`,
          width: `${stripW + BLEED}px`,
          height: `${H}px`,
          backgroundSize: `${W}px ${H}px`,
          backgroundPosition: `${-i * stripW}px 0`,
        });
      } else {
        Object.assign(slice.style, base, {
          top: "0",
          left: `${(i * 100) / count}%`,
          width: `${100 / count}%`,
          height: "100%",
          backgroundSize: `${count * 100}% 100%`,
          backgroundPosition: `${(i / denom) * 100}% 0`,
        });
      }
    }

    wrap.appendChild(slice);
    slices.push(slice);
  }

  containerEl.appendChild(wrap);
  return { wrap, slices };
}

export function imageSliceShutterAnim() {
  // id -> { timelines, cleanups, elements: [{ containerEl, itemEl, wrap, restorePosition, restoreOverflow }] }
  const instances = new Map();

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;

    // Detach click/hover listeners before reverting, so a late event can't
    // restart a timeline we're about to kill.
    inst.cleanups.forEach((off) => {
      try {
        off();
      } catch (err) {
        console.warn("[imageSliceShutter] listener teardown error:", err);
      }
    });

    inst.timelines.forEach((tl) => {
      try {
        tl.revert();
        tl.kill();
      } catch (err) {
        console.warn("[imageSliceShutter] timeline teardown error:", err);
      }
    });

    inst.elements.forEach(
      ({ containerEl, itemEl, wrap, restorePosition, restoreOverflow }) => {
        try {
          if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
          gsap.set(itemEl, { clearProps: "opacity,visibility" });
          if (restorePosition) containerEl.style.position = "";
          if (restoreOverflow) containerEl.style.overflow = "";
        } catch (err) {
          console.warn("[imageSliceShutter] element cleanup error:", err);
        }
      },
    );

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

    let items;
    try {
      items = document.querySelectorAll(anim.itemClass);
    } catch (err) {
      console.warn(
        `[imageSliceShutter] invalid itemClass selector "${anim.itemClass}":`,
        err.message,
      );
      return;
    }
    if (!items.length) return;

    const {
      id,
      triggerClass,
      trigger: { type: triggerType, selector: triggerSelector } = {},
      vars: {
        sliceAxis = "vertical",
        sliceDirection = "alternate",
        sliceCount = 14,
        stagger = 0.48,
        delay = 0,
        duration = 1.15,
        animationStart,
        animationCStart,
        ease = "expo.out",
      } = {},
    } = anim;

    const resolvedTriggerClass = triggerSelector || triggerClass;
    const resolvedStart =
      animationStart === "custom" ? animationCStart : animationStart;
    const count = Math.max(2, Math.round(sliceCount));
    // How long before the strips finish we start handing back to the real image.
    const handoff = Math.min(0.25, duration * 0.3);

    // Live-update safety: tear down any prior setup for this id first.
    teardown(id);

    const timelines = [];
    const elements = [];
    const cleanups = [];

    // click/hover are interaction-driven: the timeline is built paused and
    // played by listeners on the trigger element(s).
    const isInteraction = triggerType === "click" || triggerType === "hover";

    items.forEach((itemEl) => {
      const containerEl = itemEl.parentElement;
      if (!containerEl) return;

      const src = resolveImageSrc(itemEl);
      if (!src) {
        console.warn(
          "[imageSliceShutter] could not resolve an image source for",
          anim.itemClass,
        );
        return;
      }

      // Tag both nodes so the global reset sweep runs clearProps on each.
      containerEl.setAttribute("data-motionkit-anim-id", id);
      itemEl.setAttribute("data-motionkit-anim-id", id);

      // Preview-one mode: this pair stays tagged for the editor's inspector, but nothing
      // is built for it — only the previewed animation may play.
      if (anim.mkInert) return;

      // Strips are absolutely positioned inside the frame and must be clipped to it.
      const cs = getComputedStyle(containerEl);
      let restorePosition = false;
      let restoreOverflow = false;
      if (cs.position === "static") {
        containerEl.style.position = "relative";
        restorePosition = true;
      }
      if (cs.overflow === "visible") {
        containerEl.style.overflow = "hidden";
        restoreOverflow = true;
      }

      const { wrap, slices } = buildSlices(containerEl, src, count, sliceAxis);

      let tlConfig;
      if (triggerType === "page_load") {
        tlConfig = { delay };
      } else if (isInteraction) {
        // Held at time 0 (strips offscreen, real image hidden) until the user
        // interacts.
        tlConfig = { delay, paused: true };
      } else {
        tlConfig = {
          delay,
          scrollTrigger: {
            trigger: resolvedTriggerClass || containerEl,
            start: resolvedStart,
            scrub: triggerType === "play_with_scroll",
          },
        };
      }

      const tl = gsap.timeline(tlConfig);

      tl.set(itemEl, { autoAlpha: 0 })
        .set(slices, {
          autoAlpha: 0,
          xPercent: (i) => sliceOffset(sliceDirection, sliceAxis, i).xPercent,
          yPercent: (i) => sliceOffset(sliceDirection, sliceAxis, i).yPercent,
          rotationY: (i) => {
            const x = sliceOffset(sliceDirection, sliceAxis, i).xPercent;
            return x ? (x > 0 ? -DEPTH : DEPTH) : 0;
          },
          rotationX: (i) => {
            const y = sliceOffset(sliceDirection, sliceAxis, i).yPercent;
            return y ? (y > 0 ? DEPTH : -DEPTH) : 0;
          },
          skewY: (i) => (i % 2 ? SLICE_SKEW : -SLICE_SKEW),
          transformOrigin: "center center",
        })
        .to(slices, {
          autoAlpha: 1,
          xPercent: 0,
          yPercent: 0,
          rotationY: 0,
          rotationX: 0,
          skewY: 0,
          duration,
          ease,
          stagger: { amount: stagger, from: "center" },
        })
        // Reveal the real (seamless) image behind the strips just before they
        // land so any sub-pixel seams are backed by it, then fade the strip
        // layer out exactly as the last strip settles — no frozen, seamed frame.
        .set(itemEl, { autoAlpha: 1 }, `>-${handoff}`)
        .to(wrap, { autoAlpha: 0, duration: handoff, ease: "power2.out" }, "<");

      // Interaction triggers: resolve the element(s) that receive the
      // listeners, falling back to the frame itself when no trigger selector
      // is configured (matches the scrollTrigger fallback above).
      if (isInteraction) {
        // A paused timeline hasn't rendered frame 0 yet, so the strips would
        // sit at their natural position (a visible, seamed copy of the image)
        // until the first interaction. Render time 0 now to apply the start
        // state, then hold there.
        tl.progress(0, true).pause();

        let triggerEls = [containerEl];
        if (resolvedTriggerClass) {
          try {
            const found = document.querySelectorAll(resolvedTriggerClass);
            if (found.length) triggerEls = [...found];
          } catch (err) {
            console.warn(
              `[imageSliceShutter] invalid trigger selector "${resolvedTriggerClass}":`,
              err.message,
            );
          }
        }

        triggerEls.forEach((triggerEl) => {
          if (triggerType === "click") {
            // Replay from the start on every click.
            const onClick = () => {
              tl.restart(true);
            };
            triggerEl.addEventListener("click", onClick);
            cleanups.push(() =>
              triggerEl.removeEventListener("click", onClick),
            );
          } else {
            // Hover: shutter in on enter, back out on leave so it can play again.
            const onEnter = () => {
              tl.play();
            };
            const onLeave = () => {
              tl.reverse();
            };
            triggerEl.addEventListener("mouseenter", onEnter);
            triggerEl.addEventListener("mouseleave", onLeave);
            cleanups.push(() => {
              triggerEl.removeEventListener("mouseenter", onEnter);
              triggerEl.removeEventListener("mouseleave", onLeave);
            });
          }
        });
      }

      timelines.push(tl);
      elements.push({
        containerEl,
        itemEl,
        wrap,
        restorePosition,
        restoreOverflow,
      });
    });

    instances.set(id, { timelines, cleanups, elements });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

imageSliceShutterAnim();
