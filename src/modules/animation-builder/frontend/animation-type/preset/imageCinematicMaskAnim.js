const PRESET_KEY = "motionkit-mk-image-cm-pa";

// Baked-in look values — deliberately kept out of the UI so the preset stays
// simple. Power users who need to tune these use a custom animation instead.
const END_SCALE = 1; // image settles back to full size
const IMAGE_SHIFT = 12; // % parallax drift of the image inside the frame
const FRAME_TRAVEL = 72; // px the frame slides in from
const TILT = 8; // deg 3D tilt as the frame settles

// Directional clip-path masks. Start states hide the frame from one edge (or
// pinched-in for centerOut); the timeline reveals to inset(0).
function directionClip(direction) {
  const clips = {
    topToBottom: "inset(0% 0% 100% 0%)",
    bottomToTop: "inset(100% 0% 0% 0%)",
    leftToRight: "inset(0% 100% 0% 0%)",
    rightToLeft: "inset(0% 0% 0% 100%)",
    centerOut: "inset(42% 42% 42% 42%)",
  };
  return clips[direction] || clips.bottomToTop;
}

// Returns a GSAP offset object for a direction. `unit: "pixel"` drives x/y (px);
// otherwise xPercent/yPercent (percent). Unused axis keys stay 0 so the object
// is safe to spread straight into gsap.set().
function directionOffset(direction, amount, unit) {
  const offset = { x: 0, y: 0, xPercent: 0, yPercent: 0 };
  const xKey = unit === "pixel" ? "x" : "xPercent";
  const yKey = unit === "pixel" ? "y" : "yPercent";

  if (direction === "topToBottom") offset[yKey] = -amount;
  else if (direction === "bottomToTop") offset[yKey] = amount;
  else if (direction === "leftToRight") offset[xKey] = -amount;
  else if (direction === "rightToLeft") offset[xKey] = amount;

  return offset;
}

// Build the light-sweep overlay as a child of the frame. Styles are inline so
// no stylesheet needs to ship with the preset. Returns nulls when the sweep is
// disabled, so nothing is injected into the DOM at all.
//
// Note: there is deliberately no full-bleed shade/tint layer here. An overlay
// that rests at a non-zero opacity sits over the image forever after the
// reveal; the sweep is safe because it animates back to opacity 0.
function buildOverlays(containerEl, { withSweep }) {
  if (!withSweep) return { wrap: null, sweep: null };

  const wrap = document.createElement("div");
  wrap.setAttribute("data-mk-cm-overlay", "");
  Object.assign(wrap.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    borderRadius: "inherit",
    overflow: "hidden",
    zIndex: "2",
  });

  const sweep = document.createElement("div");
  Object.assign(sweep.style, {
    position: "absolute",
    top: "0",
    bottom: "0",
    width: "42%",
    left: "-58%",
    background:
      "linear-gradient(90deg, transparent, rgba(255,255,255,0.64), transparent)",
    mixBlendMode: "overlay",
    transform: "skewX(-18deg)",
    opacity: "0",
  });
  wrap.appendChild(sweep);

  containerEl.appendChild(wrap);
  return { wrap, sweep };
}

export function imageCinematicMaskAnim() {
  // id -> { timelines, cleanups, elements: [{ containerEl, itemEl, overlay, restorePosition }] }
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
        console.warn("[imageCinematicMask] listener teardown error:", err);
      }
    });

    inst.timelines.forEach((tl) => {
      try {
        tl.revert();
        tl.kill();
      } catch (err) {
        console.warn("[imageCinematicMask] timeline teardown error:", err);
      }
    });

    inst.elements.forEach(({ containerEl, itemEl, overlay, restorePosition }) => {
      try {
        // Remove the injected sweep layer.
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);

        // clip-path / transforms / filter are applied via bare gsap.set() at
        // time 0, so tl.revert() can't restore them — clear them explicitly.
        gsap.set(containerEl, {
          clearProps: "transform,opacity,visibility,clipPath,overflow,perspective",
        });
        gsap.set(itemEl, {
          clearProps: "transform,opacity,visibility,filter,transformOrigin",
        });

        if (restorePosition) containerEl.style.position = "";
      } catch (err) {
        console.warn("[imageCinematicMask] element cleanup error:", err);
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
    if (!anim.itemClass) return;

    let items;
    try {
      items = document.querySelectorAll(anim.itemClass);
    } catch (err) {
      console.warn(
        `[imageCinematicMask] invalid itemClass selector "${anim.itemClass}":`,
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
        direction = "bottomToTop",
        startScale = 1.28,
        sweep = true,
        delay = 0,
        duration = 1.25,
        animationStart,
        animationCStart,
        ease = "expo.inOut",
      } = {},
    } = anim;

    const resolvedTriggerClass = triggerSelector || triggerClass;
    const resolvedStart =
      animationStart === "custom" ? animationCStart : animationStart;

    // Live-update safety: tear down any prior setup for this id first.
    teardown(id);

    // Preview-one mode: tag each item and its container (both are tagged in the build loop
    // below) so the editor's inspector keeps its markers, then bail without building.
    if (anim.mkInert) {
      items.forEach((itemEl) => {
        itemEl.setAttribute("data-motionkit-anim-id", id);
        itemEl.parentElement?.setAttribute("data-motionkit-anim-id", id);
      });
      return;
    }

    const timelines = [];
    const elements = [];
    const cleanups = [];

    // click/hover are interaction-driven: the timeline is built paused and
    // played by listeners on the trigger element(s).
    const isInteraction = triggerType === "click" || triggerType === "hover";

    items.forEach((itemEl) => {
      const containerEl = itemEl.parentElement;
      if (!containerEl) return;

      // Tag both nodes so the global reset sweep (lib/resetAllAnimations.js)
      // runs clearProps on each alongside our local teardown.
      containerEl.setAttribute("data-motionkit-anim-id", id);
      itemEl.setAttribute("data-motionkit-anim-id", id);

      const withSweep = sweep === true || sweep === "true";

      // The absolutely-positioned sweep overlay needs a positioned frame.
      let restorePosition = false;
      if (withSweep && getComputedStyle(containerEl).position === "static") {
        containerEl.style.position = "relative";
        restorePosition = true;
      }

      const { wrap: overlay, sweep: sweepEl } = buildOverlays(containerEl, {
        withSweep,
      });

      const frameOffset = directionOffset(direction, FRAME_TRAVEL, "pixel");
      const imageOffset = directionOffset(direction, IMAGE_SHIFT);

      let tlConfig;
      if (triggerType === "page_load") {
        tlConfig = { delay };
      } else if (isInteraction) {
        // Held at time 0 (the masked start state) until the user interacts.
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

      tl.set(containerEl, {
        ...frameOffset,
        rotationX: TILT,
        scale: 0.94,
        overflow: "hidden",
        transformPerspective: 1400,
        clipPath: directionClip(direction),
      })
        .set(itemEl, {
          ...imageOffset,
          scale: startScale,
          transformOrigin: "50% 50%",
          filter: "saturate(0.8) contrast(1.14)",
        })
        .to(
          containerEl,
          {
            x: 0,
            y: 0,
            rotationX: 0,
            scale: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            duration,
            ease,
          },
          0,
        )
        .to(
          itemEl,
          {
            xPercent: 0,
            yPercent: 0,
            scale: END_SCALE,
            filter: "saturate(1) contrast(1)",
            duration: duration * 1.08,
            ease: "power3.out",
          },
          0,
        );

      // Light sweep across the frame.
      if (sweepEl) {
        const at = duration * 0.28;
        tl.fromTo(
          sweepEl,
          { autoAlpha: 0, xPercent: 0 },
          {
            autoAlpha: 0.85,
            xPercent: 390,
            duration: Math.min(0.95, duration),
            ease: "power2.inOut",
          },
          at,
        ).to(
          sweepEl,
          { autoAlpha: 0, duration: 0.22 },
          at + Math.min(0.74, duration * 0.65),
        );
      }

      // Interaction triggers: resolve the element(s) that receive the
      // listeners, falling back to the frame itself when no trigger selector
      // is configured (matches the scrollTrigger fallback above).
      if (isInteraction) {
        let triggerEls = [containerEl];
        if (resolvedTriggerClass) {
          try {
            const found = document.querySelectorAll(resolvedTriggerClass);
            if (found.length) triggerEls = [...found];
          } catch (err) {
            console.warn(
              `[imageCinematicMask] invalid trigger selector "${resolvedTriggerClass}":`,
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
            // Hover: reveal on enter, re-mask on leave so it can play again.
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
      elements.push({ containerEl, itemEl, overlay, restorePosition });
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

imageCinematicMaskAnim();
