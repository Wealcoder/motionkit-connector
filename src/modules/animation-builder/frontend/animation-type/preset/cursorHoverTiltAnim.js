const PRESET_KEY = "motionkit-mk-cursor-tilt-pa";

export function cursorHoverTiltAnim() {
  // id -> array of per-item teardown fns
  const instances = new Map();

  function toNumber(value, fallback) {
    if (value == null || value === "") return fallback;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function teardown(id) {
    const fns = instances.get(id);
    if (!fns) return;
    fns.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[cursorTilt] teardown error:", err);
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function attachToItem({ id, itemEl, maxTilt, perspective, duration }) {
    // Tag so the global reset sweep runs clearProps on this node alongside
    // our local teardown.
    itemEl.setAttribute("data-motionkit-anim-id", id);
    itemEl.classList.add("motionkit-skip-selector-full");

    gsap.set(itemEl, { transformPerspective: perspective });

    // One reusable tween per axis is MUCH cheaper than firing gsap.to() on
    // every mousemove event.
    const rotateXTo = gsap.quickTo(itemEl, "rotationX", {
      duration,
      ease: "power3.out",
    });
    const rotateYTo = gsap.quickTo(itemEl, "rotationY", {
      duration,
      ease: "power3.out",
    });

    const onMouseMove = (evt) => {
      // Read the element's own box each frame so resizes/scrolling don't
      // desync the basis. Position is relative to THIS element (not the
      // viewport), since the tilt should track where the cursor sits over
      // the image, not its screen position.
      const rect = itemEl.getBoundingClientRect();
      const xPercent = (evt.clientX - rect.left) / rect.width - 0.5;
      const yPercent = (evt.clientY - rect.top) / rect.height - 0.5;
      rotateYTo(xPercent * 2 * maxTilt);
      rotateXTo(yPercent * -2 * maxTilt);
    };

    const onMouseEnter = () => {
      itemEl.addEventListener("mousemove", onMouseMove);
    };

    const onMouseLeave = () => {
      itemEl.removeEventListener("mousemove", onMouseMove);
      // Ease back to flat when the pointer leaves.
      rotateXTo(0);
      rotateYTo(0);
    };

    itemEl.addEventListener("mouseenter", onMouseEnter);
    itemEl.addEventListener("mouseleave", onMouseLeave);

    return () => {
      itemEl.removeEventListener("mouseenter", onMouseEnter);
      itemEl.removeEventListener("mouseleave", onMouseLeave);
      itemEl.removeEventListener("mousemove", onMouseMove);
      gsap.killTweensOf(itemEl);
      gsap.set(itemEl, { clearProps: "transform,transformPerspective" });
      itemEl.classList.remove("motionkit-skip-selector-full");
    };
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
        `[cursorTilt] invalid itemClass selector "${anim.itemClass}":`,
        err.message,
      );
      return;
    }
    if (!items.length) return;

    const { id, vars = {} } = anim;
    const maxTilt = toNumber(vars.maxTilt, 5);
    const perspective = toNumber(vars.perspective, 1200);
    const duration = toNumber(vars.duration, 0.8);

    // Nothing to do if there's no tilt to apply.
    if (maxTilt === 0) return;

    // Live-update safety: drop the prior setup for this id before rebuild.
    teardown(id);

    // Preview-one mode: tag the targets so the editor's inspector keeps its markers,
    // then bail before any listener or tween is attached.
    if (anim.mkInert) {
      items.forEach((itemEl) =>
        itemEl.setAttribute("data-motionkit-anim-id", id),
      );
      return;
    }

    const teardowns = [];
    items.forEach((itemEl) => {
      teardowns.push(
        attachToItem({ id, itemEl, maxTilt, perspective, duration }),
      );
    });

    instances.set(id, teardowns);
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

cursorHoverTiltAnim();
