import { VOID_ELEMENTS } from "../../../config/VoidElement";

const PRESET_KEY = "motionkit-mk-image-mg-pa";

export function imageHoverMagnifier() {
  // id -> array of per-item teardown fns
  const instances = new Map();

  // The editor's border field emits one to FOUR space-separated values
  // ("2px", "2px 4px", "2px 2px 2px 2px"), so each token needs its own unit —
  // appending one to the end of the whole string would produce "2 2 2 2px".
  function toCssLengthList(value, fallback) {
    if (value == null || String(value).trim() === "") return fallback;
    return String(value)
      .trim()
      .split(/\s+/)
      .map((token) => (/[a-z%]$/i.test(token) ? token : `${token}px`))
      .join(" ");
  }

  function toNumber(value, fallback) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function teardown(id) {
    (instances.get(id) || []).forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[imageMagnifier] teardown error:", err);
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  // Unlike the spotlight preset, this one cannot avoid needing the source: a
  // magnified view has to re-render the image, it cannot just uncover it. Read off
  // the target rather than asked for in the UI, so the two can never disagree.
  function resolveImageUrl(target) {
    const img = target.tagName === "IMG" ? target : target.querySelector("img");
    if (img) return img.currentSrc || img.src || "";

    const bg = window.getComputedStyle(target).backgroundImage;
    if (!bg || bg === "none") return "";

    const match = bg.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : "";
  }

  // The URL lands inside a CSS url('...') literal, so a stray quote or backslash
  // would break out of the declaration.
  function escapeCssUrl(url) {
    return String(url).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  function buildLens({ imageUrl, size, ringStyle, zIndex }) {
    const lens = document.createElement("div");
    lens.setAttribute("data-mk-magnifier", "");
    Object.assign(lens.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      overflow: "hidden",
      pointerEvents: "none",
      willChange: "transform",
      zIndex: String(zIndex),
      ...ringStyle,
    });

    // The magnified copy. Sized to the image box times the zoom and shifted by
    // transform, so the whole lens rides the compositor instead of repainting a
    // background-position every frame.
    const zoomed = document.createElement("div");
    Object.assign(zoomed.style, {
      position: "absolute",
      top: "0",
      left: "0",
      backgroundImage: `url('${escapeCssUrl(imageUrl)}')`,
      // cover on a box with the same aspect ratio as the original reproduces the
      // base image's own cover crop, just scaled — so object-fit: cover matches.
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      willChange: "transform",
    });

    lens.appendChild(zoomed);
    return { lens, zoomed };
  }

  // Clips the lens to the image box so it can overhang the edge without painting
  // outside it. This is a sibling of the target, sized onto the target's box —
  // NOT a wrapper, and NOT overflow:hidden on the parent, whose box is usually
  // bigger than the image. Being the lens's offset parent also means lens
  // coordinates are plain image coordinates, with no offset to add back.
  function buildClip({ target, isVoid, zIndex }) {
    const clip = document.createElement("div");
    clip.setAttribute("data-mk-magnifier-clip", "");
    Object.assign(clip.style, {
      position: "absolute",
      overflow: "hidden",
      pointerEvents: "none",
      // Match the image's own corners, or the lens would show through in the gap
      // a rounded image leaves behind.
      borderRadius: window.getComputedStyle(target).borderRadius,
      zIndex: String(zIndex),
      ...(isVoid ? {} : { inset: "0" }),
    });
    return clip;
  }

  function attachToItem({ id, target, cfg }) {
    const imageUrl = resolveImageUrl(target);
    // Nothing to magnify — leave the element alone rather than showing an empty lens.
    if (!imageUrl) return () => {};

    // A replaced element like <img> cannot hold the lens, so the clip layer is
    // mounted in the parent and positioned onto the target's box instead. No
    // wrapper: the target keeps its place in the layout, and it keeps the hover
    // events, so the animation stays bound to the item element.
    const isVoid = VOID_ELEMENTS.has(target.tagName);
    const mountEl = isVoid ? target.parentElement : target;
    if (!mountEl) return () => {};

    const priorMountPosition = mountEl.style.position;
    if (window.getComputedStyle(mountEl).position === "static") {
      // Also makes mountEl the offsetParent, so offsetLeft/Top below are measured
      // against it rather than some ancestor further up.
      mountEl.style.position = "relative";
    }

    const radius = cfg.size / 2;
    const clip = buildClip({ target, isVoid, zIndex: cfg.zIndex });
    const { lens, zoomed } = buildLens({ ...cfg, imageUrl });
    clip.appendChild(lens);
    mountEl.appendChild(clip);
    target.setAttribute("data-motionkit-anim-id", id);

    gsap.set(lens, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });

    // Position and size the clip onto the target's box, and scale the zoomed layer
    // to match. Re-measured on mouseenter: the lens is invisible until then, so that
    // is the only moment the geometry has to be right — no observer needed.
    function syncBox() {
      if (isVoid) {
        Object.assign(clip.style, {
          left: `${target.offsetLeft}px`,
          top: `${target.offsetTop}px`,
          width: `${target.offsetWidth}px`,
          height: `${target.offsetHeight}px`,
        });
      }
      zoomed.style.width = `${target.clientWidth * cfg.zoom}px`;
      zoomed.style.height = `${target.clientHeight * cfg.zoom}px`;
    }
    syncBox();

    const setLensX = gsap.quickTo(lens, "x", {
      duration: cfg.followDuration,
      ease: "expo",
    });
    const setLensY = gsap.quickTo(lens, "y", {
      duration: cfg.followDuration,
      ease: "expo",
    });

    // Counter-movers for the magnified layer. Same duration and ease as the lens,
    // which is what keeps the two registered mid-tween: the lens eases toward `m`
    // while this eases toward `radius - m * zoom`, both linear in `m`, so the point
    // under the cursor stays at the lens centre on every frame — not just at the
    // endpoints. Different easings here would make the image slide inside the lens.
    const setZoomX = gsap.quickTo(zoomed, "x", {
      duration: cfg.followDuration,
      ease: "expo",
    });
    const setZoomY = gsap.quickTo(zoomed, "y", {
      duration: cfg.followDuration,
      ease: "expo",
    });

    const revealTl = gsap.timeline({ paused: true }).to(lens, {
      scale: 1,
      opacity: 1,
      duration: cfg.revealDuration,
      ease: "expo.out",
    });

    // Pointer position in image coordinates. No clamping and no offset: the clip is
    // the lens's offset parent and shares the image's origin, so the raw position is
    // already what the lens wants — and leaving it unclamped is what lets the lens
    // reach right into the corners.
    function pointerIn(evt) {
      const rect = target.getBoundingClientRect();
      return { mx: evt.clientX - rect.left, my: evt.clientY - rect.top };
    }

    const onMouseMove = (evt) => {
      const { mx, my } = pointerIn(evt);
      setLensX(mx);
      setLensY(my);
      setZoomX(radius - mx * cfg.zoom);
      setZoomY(radius - my * cfg.zoom);
    };

    const onMouseEnter = (evt) => {
      syncBox();

      // Snap to the pointer before opening, so the lens does not fly in from the
      // top left corner on the first hover.
      const { mx, my } = pointerIn(evt);
      gsap.set(lens, { x: mx, y: my });
      gsap.set(zoomed, {
        x: radius - mx * cfg.zoom,
        y: radius - my * cfg.zoom,
      });

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
      revealTl.kill();
      gsap.killTweensOf([lens, zoomed]);
      // Removing the clip takes the lens and the zoomed layer with it.
      clip.remove();
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
        `[imageMagnifier] invalid itemClass selector "${anim.itemClass}":`,
        err.message,
      );
      return;
    }
    if (!items.length) return;

    const { id, vars = {} } = anim;

    // Longhands, not the `border` shorthand: the shorthand takes a single width, so
    // the field's four-value output ("2px 2px 2px 2px") makes the whole declaration
    // invalid and the ring silently disappears. border-width takes 1-4 values.
    const ringWidth = toCssLengthList(vars.borderWidth, "");
    const ringStyle = ringWidth
      ? {
          borderWidth: ringWidth,
          borderStyle: "solid",
          borderColor: vars.borderColor || "#ffffff",
          boxSizing: "border-box",
        }
      : {};

    const cfg = {
      size: Math.max(20, toNumber(vars.lensSize, 200)),
      // Below 1 would shrink rather than magnify, which is not what this preset is.
      zoom: Math.max(1, toNumber(vars.zoom, 2.4)),
      followDuration: toNumber(vars.followDuration, 0.4),
      revealDuration: toNumber(vars.revealDuration, 0.35),
      ringStyle,
      zIndex: toNumber(vars.zIndex, 5),
    };

    // Live-update safety: tear down any prior setup for this id before rebuild.
    teardown(id);

    // Preview-one mode: tag the targets so the editor's inspector keeps its markers,
    // then bail before the lens DOM and its listeners are built.
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

imageHoverMagnifier();
