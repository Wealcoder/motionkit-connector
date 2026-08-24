const PRESET_KEY = "motionkit-mk-cursor-cm-pa";

export function cursorHoverMoveAnim() {
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
        console.warn("[cursorMove] teardown error:", err);
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function queryAll(selector, label) {
    try {
      return document.querySelectorAll(selector);
    } catch (err) {
      console.warn(
        `[cursorMove] invalid ${label} selector "${selector}":`,
        err.message,
      );
      return null;
    }
  }

  // `zoneEl` owns the pointer listeners; `itemEls` are what actually move.
  // With no container configured the item is its own zone (legacy behaviour).
  function attachToZone({ id, zoneEl, itemEls, moveX, moveY, duration }) {
    const movers = itemEls.map((itemEl) => {
      // Tag so the global reset sweep runs clearProps on this node alongside
      // our local teardown.
      itemEl.setAttribute("data-motionkit-anim-id", id);
      itemEl.classList.add("motionkit-skip-selector-full");

      // One reusable tween per axis is MUCH cheaper than firing gsap.to() on
      // every mousemove event (which used to create ~60 fresh tweens/sec).
      return {
        itemEl,
        xTo: gsap.quickTo(itemEl, "x", { duration, ease: "power3.out" }),
        yTo: gsap.quickTo(itemEl, "y", { duration, ease: "power3.out" }),
      };
    });

    const onMouseMove = (evt) => {
      // Read viewport size fresh each frame so resizes don't desync the basis.
      const xPercent = evt.clientX / window.innerWidth - 0.5;
      const yPercent = evt.clientY / window.innerHeight - 0.5;
      movers.forEach(({ xTo, yTo }) => {
        xTo(xPercent * moveX);
        yTo(yPercent * moveY);
      });
    };

    const onMouseEnter = () => {
      zoneEl.addEventListener("mousemove", onMouseMove);
    };

    const onMouseLeave = () => {
      zoneEl.removeEventListener("mousemove", onMouseMove);
      // Ease back to the origin when the pointer leaves the zone.
      movers.forEach(({ xTo, yTo }) => {
        xTo(0);
        yTo(0);
      });
    };

    zoneEl.addEventListener("mouseenter", onMouseEnter);
    zoneEl.addEventListener("mouseleave", onMouseLeave);

    return () => {
      zoneEl.removeEventListener("mouseenter", onMouseEnter);
      zoneEl.removeEventListener("mouseleave", onMouseLeave);
      zoneEl.removeEventListener("mousemove", onMouseMove);
      movers.forEach(({ itemEl }) => {
        gsap.killTweensOf(itemEl);
        gsap.set(itemEl, { clearProps: "transform" });
        itemEl.classList.remove("motionkit-skip-selector-full");
      });
    };
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY) return;
    if (anim.isPublished === false) return;
    if (!anim.itemClass) return;

    const { id, containerClass, vars = {} } = anim;
    const moveX = toNumber(vars.moveX, 0);
    const moveY = toNumber(vars.moveY, 0);
    const duration = toNumber(vars.duration, 0.6);

    // Nothing to do if both axes are zero.
    if (moveX === 0 && moveY === 0) return;

    // Container is optional. When set, the pointer only has to be anywhere
    // inside the container for the items within it to follow the cursor.
    const containers = containerClass
      ? queryAll(containerClass, "containerClass")
      : null;
    if (containerClass && (!containers || !containers.length)) return;

    // Build the zone -> items pairs. Each container scopes its own lookup so
    // multiple containers on a page drive only their own items.
    const zones = [];
    if (containers) {
      for (const containerEl of containers) {
        let scoped;
        try {
          scoped = containerEl.querySelectorAll(anim.itemClass);
        } catch (err) {
          console.warn(
            `[cursorMove] invalid itemClass selector "${anim.itemClass}":`,
            err.message,
          );
          return;
        }
        if (scoped.length) zones.push({ zoneEl: containerEl, itemEls: [...scoped] });
      }
    } else {
      const items = queryAll(anim.itemClass, "itemClass");
      if (!items) return;
      // Legacy mode: every item is its own hover zone.
      items.forEach((itemEl) => zones.push({ zoneEl: itemEl, itemEls: [itemEl] }));
    }

    if (!zones.length) return;

    // Live-update safety: drop the prior setup for this id before rebuild.
    teardown(id);

    // Preview-one mode: tag the targets so the editor's inspector keeps its markers,
    // then bail before any listener or tween is attached.
    if (anim.mkInert) {
      zones.forEach(({ itemEls }) =>
        itemEls.forEach((itemEl) =>
          itemEl.setAttribute("data-motionkit-anim-id", id),
        ),
      );
      return;
    }

    const teardowns = zones.map(({ zoneEl, itemEls }) =>
      attachToZone({ id, zoneEl, itemEls, moveX, moveY, duration }),
    );

    instances.set(id, teardowns);
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

cursorHoverMoveAnim();
