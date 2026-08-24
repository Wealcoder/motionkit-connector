import { VOID_ELEMENTS } from "../../../config/VoidElement";

const PRESET_KEY = "motionkit-mk-image-sr-pa";

// Plus icon look — fixed rather than exposed in the UI. The bars are pure white
// and difference-blended, which inverts them against whatever they sit on, so the
// icon stays legible over both the lit image and the dark shade on its own. That
// is also why there is no colour option: there would be nothing for it to control.
const PLUS_SIZE = "26px";
const PLUS_THICKNESS = "2px";

export function imageSpotlightHoverReveal() {
  // id -> array of per-item teardown fns
  const instances = new Map();

  function toNumber(value, fallback) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function teardown(id) {
    (instances.get(id) || []).forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[imageSpotlight] teardown error:", err);
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function buildPlus({ zIndex }) {
    const plus = document.createElement("div");
    Object.assign(plus.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: PLUS_SIZE,
      height: PLUS_SIZE,
      pointerEvents: "none",
      // difference against white is exactly a per-pixel invert of the backdrop:
      // white over dark, black over light, no sampling of the image required.
      mixBlendMode: "difference",
      zIndex: String(zIndex + 1),
    });

    const bar = { position: "absolute", backgroundColor: "#ffffff" };
    const horizontal = document.createElement("span");
    Object.assign(horizontal.style, bar, {
      top: "50%",
      left: "0",
      width: "100%",
      height: PLUS_THICKNESS,
      transform: "translateY(-50%)",
    });
    const vertical = document.createElement("span");
    Object.assign(vertical.style, bar, {
      left: "50%",
      top: "0",
      width: PLUS_THICKNESS,
      height: "100%",
      transform: "translateX(-50%)",
    });

    plus.appendChild(horizontal);
    plus.appendChild(vertical);
    return plus;
  }

  function attachToItem({ id, target, cfg }) {
    // A replaced element like <img> cannot hold the overlay, so the overlay is
    // mounted in the parent and positioned onto the target's box instead. No
    // wrapper: the target keeps its place in the layout, and it keeps the hover
    // events and the cursor, so the animation stays bound to the item element.
    const isVoid = VOID_ELEMENTS.has(target.tagName);
    const mountEl = isVoid ? target.parentElement : target;
    if (!mountEl) return () => {};

    const priorMountPosition = mountEl.style.position;
    // Captured with its priority so an inline `cursor: x !important` that was
    // already on the element is restored as it was, not silently downgraded.
    const priorCursor = target.style.getPropertyValue("cursor");
    const priorCursorPriority = target.style.getPropertyPriority("cursor");
    if (window.getComputedStyle(mountEl).position === "static") {
      // Also makes mountEl the offsetParent, so offsetLeft/Top below are measured
      // against it rather than some ancestor further up.
      mountEl.style.position = "relative";
    }
    // !important because themes and page builders routinely force a cursor on
    // images inside links, and a plain inline value loses to that.
    if (cfg.showPlus) {
      target.style.setProperty("cursor", "none", "important");
    }

    // One dark layer, with the spotlight punched out of it as a mask hole: mask
    // alpha 0 at the pointer means the layer is absent there and the real image
    // shows through untouched — no second copy to size or keep aligned.
    const shade = document.createElement("div");
    shade.setAttribute("data-mk-spotlight", "");
    Object.assign(shade.style, {
      position: "absolute",
      backgroundColor: cfg.overlayColor,
      // Dark from the moment the animation is applied, not from first hover.
      opacity: String(cfg.darkness),
      borderRadius: "20px",
      pointerEvents: "none",
      zIndex: String(cfg.zIndex),
      ...(isVoid ? {} : { inset: "0" }),
    });
    mountEl.appendChild(shade);

    // The plus is a sibling of the shade, not a child: inside it the mask would
    // erase it at exactly the point it is meant to mark.
    const plus = cfg.showPlus ? buildPlus(cfg) : null;
    if (plus) {
      mountEl.appendChild(plus);
      // Scaled from zero rather than faded in: opacity below 1 would composite the
      // icon into its own group and weaken the difference blend while it appeared.
      gsap.set(plus, { xPercent: -50, yPercent: -50, scale: 0 });
    }

    target.setAttribute("data-motionkit-anim-id", id);

    // Offset of the target inside mountEl. Zero when the overlay is a child of the
    // target itself, since then the two boxes already coincide.
    const offset = { left: 0, top: 0 };

    function syncBox() {
      if (!isVoid) return;
      offset.left = target.offsetLeft;
      offset.top = target.offsetTop;
      Object.assign(shade.style, {
        left: `${offset.left}px`,
        top: `${offset.top}px`,
        width: `${target.offsetWidth}px`,
        height: `${target.offsetHeight}px`,
      });
    }

    // The shade is visible before any hover now, so its box has to be right
    // immediately and stay right — it can no longer be measured lazily on enter.
    // The observer's first callback also covers an <img> that had no intrinsic
    // size yet at attach time because it had not finished loading.
    syncBox();
    let resizeObserver = null;
    if (isVoid && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncBox);
      resizeObserver.observe(target);
    }

    // Eased pointer position plus the hole's current radius. quickTo on a plain
    // object gives one reusable tween per axis instead of a fresh gsap.to() on
    // every mousemove; `r` is driven by the reveal timeline.
    const pos = { x: 0, y: 0, r: 0 };
    const setX = gsap.quickTo(pos, "x", {
      duration: cfg.followDuration,
      ease: "expo",
    });
    const setY = gsap.quickTo(pos, "y", {
      duration: cfg.followDuration,
      ease: "expo",
    });

    const render = () => {
      // A zero-radius gradient is a degenerate case browsers disagree on, so the
      // closed state drops the mask entirely and leaves the shade uniformly dark.
      if (pos.r < 0.5) {
        shade.style.maskImage = "none";
        shade.style.webkitMaskImage = "none";
        return;
      }
      // Mask coordinates are relative to the shade, which is the target's box.
      const gradient = `radial-gradient(circle ${pos.r}px at ${pos.x}px ${pos.y}px, transparent ${cfg.core}%, #000 100%)`;
      shade.style.maskImage = gradient;
      shade.style.webkitMaskImage = gradient;
      // The plus is positioned against mountEl, so it needs the offset added back.
      if (plus) {
        gsap.set(plus, { x: offset.left + pos.x, y: offset.top + pos.y });
      }
    };

    // Hover opens the hole rather than fading the shade in. The ticker has to keep
    // painting while the hole closes too, so it is dropped on reverse-complete
    // instead of on mouseleave.
    const revealTl = gsap
      .timeline({
        paused: true,
        onReverseComplete: () => {
          gsap.ticker.remove(render);
          render();
        },
      })
      .to(
        pos,
        { r: cfg.radius, duration: cfg.revealDuration, ease: "expo.out" },
        0,
      );
    if (plus) {
      revealTl.to(
        plus,
        { scale: 1, duration: cfg.revealDuration, ease: "expo.out" },
        0,
      );
    }

    const onMouseMove = (evt) => {
      const rect = target.getBoundingClientRect();
      setX(evt.clientX - rect.left);
      setY(evt.clientY - rect.top);
    };

    const onMouseEnter = (evt) => {
      // Snap to the pointer before opening, so the hole does not grow from the top
      // left corner on the first hover.
      const rect = target.getBoundingClientRect();
      pos.x = evt.clientX - rect.left;
      pos.y = evt.clientY - rect.top;

      gsap.ticker.add(render);
      target.addEventListener("mousemove", onMouseMove);
      revealTl.play();
    };

    const onMouseLeave = () => {
      target.removeEventListener("mousemove", onMouseMove);
      revealTl.reverse();
    };

    target.addEventListener("mouseenter", onMouseEnter);
    target.addEventListener("mouseleave", onMouseLeave);

    return () => {
      target.removeEventListener("mouseenter", onMouseEnter);
      target.removeEventListener("mouseleave", onMouseLeave);
      target.removeEventListener("mousemove", onMouseMove);
      gsap.ticker.remove(render);
      if (resizeObserver) resizeObserver.disconnect();
      revealTl.kill();
      shade.remove();
      if (plus) plus.remove();
      target.style.removeProperty("cursor");
      if (priorCursor) {
        target.style.setProperty("cursor", priorCursor, priorCursorPriority);
      }
      mountEl.style.position = priorMountPosition;
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
        `[imageSpotlight] invalid itemClass selector "${anim.itemClass}":`,
        err.message,
      );
      return;
    }
    if (!items.length) return;

    const { id, vars = {} } = anim;
    const edgeSoftness = Math.min(
      100,
      Math.max(0, toNumber(vars.edgeSoftness, 45)),
    );

    const cfg = {
      radius: Math.max(1, toNumber(vars.spotlightSize, 320)) / 2,
      // Where the mask hole stops being fully transparent. 100 is a hard circle.
      core: 100 - edgeSoftness,
      darkness: Math.min(1, Math.max(0, toNumber(vars.darkness, 0.88))),
      overlayColor: vars.overlayColor || "#050608",
      followDuration: toNumber(vars.followDuration, 0.45),
      revealDuration: toNumber(vars.revealDuration, 0.45),
      showPlus: vars.showPlus !== false,
      zIndex: toNumber(vars.zIndex, 5),
    };

    // Live-update safety: tear down any prior setup for this id before rebuild.
    teardown(id);

    // Preview-one mode: tag the targets so the editor's inspector keeps its markers,
    // then bail before the spotlight DOM and its listeners are built.
    if (anim.mkInert) {
      items.forEach((target) =>
        target.setAttribute("data-motionkit-anim-id", id),
      );
      return;
    }

    const teardowns = [];
    items.forEach((target) =>
      teardowns.push(attachToItem({ id, target, cfg })),
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

imageSpotlightHoverReveal();
