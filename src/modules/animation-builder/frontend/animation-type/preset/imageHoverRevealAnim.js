const PRESET_KEY = "motionkit-mk-image-hr-pa";

export function imageHoverRevealAnim() {
  // id -> array of per-item teardown fns
  const instances = new Map();

  function toCssLength(value, fallback) {
    if (value == null || value === "") return fallback;
    const str = String(value);
    return /[a-z%]$/i.test(str) ? str : `${str}px`;
  }

  function teardown(id) {
    const fns = instances.get(id);
    if (!fns) return;
    fns.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[imageHoverReveal] teardown error:", err);
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function resolveInitialOffset(animationPosition) {
    switch (animationPosition) {
      case "left":
        return { xPercent: -100, yPercent: -50 };
      case "right":
        return { xPercent: 0, yPercent: -50 };
      case "top":
        return { xPercent: -50, yPercent: -100 };
      case "bottom":
        return { xPercent: -50, yPercent: 0 };
      case "center":
      default:
        return { xPercent: -50, yPercent: -50 };
    }
  }

  function attachToItem({
    id,
    itemEl,
    cursorImgConfig,
    animationPosition,
    imageRotation,
  }) {
    const parentEl = itemEl.parentElement;
    if (!parentEl) return () => {};

    const cursorImg = document.createElement("div");
    cursorImg.setAttribute("data-wcf-image-hover-reveal", "");
    cursorImg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${cursorImgConfig.width};
      height: ${cursorImgConfig.height};
      background-image: url('${cursorImgConfig.imageUrl}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      pointer-events: none;
      z-index: ${cursorImgConfig.zIndex};
      border-radius: 8px;
      will-change: transform, opacity;
    `;

    const priorParentPosition = parentEl.style.position;
    if (window.getComputedStyle(parentEl).position === "static") {
      parentEl.style.position = "relative";
    }
    parentEl.appendChild(cursorImg);

    // Tag both nodes so the global reset sweep runs clearProps on them.
    itemEl.setAttribute("data-motionkit-anim-id", id);
    parentEl.setAttribute("data-motionkit-anim-id", id);

    // rotation lives in the initial set (not the reveal tween) so the tilt holds
    // steady through the scale-in, the quickTo x/y follow, and the reverse.
    const initial = {
      ...resolveInitialOffset(animationPosition),
      scale: 0,
      rotation: imageRotation,
      opacity: 0,
      force3D: true,
    };
    gsap.set(cursorImg, initial);

    const setCursorX = gsap.quickTo(cursorImg, "x", {
      duration: 0.6,
      ease: "expo",
    });
    const setCursorY = gsap.quickTo(cursorImg, "y", {
      duration: 0.6,
      ease: "expo",
    });

    const moveToEvent = (evt) => {
      const rect = parentEl.getBoundingClientRect();
      setCursorX(evt.clientX - rect.left);
      setCursorY(evt.clientY - rect.top);
    };

    const revealTl = gsap.timeline({ paused: true }).to(cursorImg, {
      scale: 1,
      opacity: 1,
      duration: 0.5,
      ease: "expo.inOut",
    });

    const onMouseEnter = (evt) => {
      moveToEvent(evt);
      itemEl.addEventListener("mousemove", moveToEvent);
      revealTl.play();
    };

    const onMouseLeave = () => {
      itemEl.removeEventListener("mousemove", moveToEvent);
      revealTl.reverse();
    };

    itemEl.addEventListener("mouseenter", onMouseEnter);
    itemEl.addEventListener("mouseleave", onMouseLeave);

    return () => {
      itemEl.removeEventListener("mouseenter", onMouseEnter);
      itemEl.removeEventListener("mouseleave", onMouseLeave);
      itemEl.removeEventListener("mousemove", moveToEvent);
      revealTl.kill();
      cursorImg.remove();
      parentEl.style.position = priorParentPosition;
    };
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY) return;
    if (anim.isPublished === false) return;
    if (!anim.itemClass || !anim.imageUrl) return;

    let items;
    try {
      items = document.querySelectorAll(anim.itemClass);
    } catch (err) {
      console.warn(
        `[imageHoverReveal] invalid itemClass selector "${anim.itemClass}":`,
        err.message,
      );
      return;
    }
    if (!items.length) return;

    const { id, imageUrl, vars = {} } = anim;
    const {
      imageWidth = "300px",
      imageHeight = "400px",
      animationPosition = "center",
      imageRotation = 0,
      zIndex,
    } = vars;

    const rotation = Number(imageRotation) || 0;

    const cursorImgConfig = {
      imageUrl,
      width: toCssLength(imageWidth, "300px"),
      height: toCssLength(imageHeight, "400px"),
      zIndex: zIndex === "" || zIndex == null ? 999 : zIndex,
    };

    teardown(id);

    // Preview-one mode: tag the item and its parent (both are tagged by attachToItem) so the
    // editor's inspector keeps its markers, then bail before the cursor image is injected.
    if (anim.mkInert) {
      items.forEach((itemEl) => {
        itemEl.setAttribute("data-motionkit-anim-id", id);
        itemEl.parentElement?.setAttribute("data-motionkit-anim-id", id);
      });
      return;
    }

    const teardowns = [];
    items.forEach((itemEl) => {
      teardowns.push(
        attachToItem({
          id,
          itemEl,
          cursorImgConfig,
          animationPosition,
          imageRotation: rotation,
        }),
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

imageHoverRevealAnim();
