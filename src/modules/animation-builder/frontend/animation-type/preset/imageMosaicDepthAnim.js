const PRESET_KEY = "motionkit-mk-image-md-pa";

// Baked-in look values — kept out of the UI so the preset stays simple.
const TILE_SCATTER = 90; // px random x/y spread of the tiles before they settle
const DEPTH = 260; // px random z spread (needs the layer's perspective)
const TILE_START_SCALE = 0.52; // tiles start shrunk, then grow to 1
const TILE_ROTATION = 55; // deg random 3D rotation of each tile

// Read the image source off an <img> (preferred) or a background-image element.
function resolveImageSrc(el) {
  if (!el) return "";
  if (el.tagName === "IMG") return el.currentSrc || el.getAttribute("src") || "";
  const bg = getComputedStyle(el).backgroundImage;
  if (!bg || bg === "none") return "";
  const match = bg.match(/url\((['"]?)(.*?)\1\)/);
  return match ? match[2] : "";
}

// A 1px overlap between neighbouring pieces so sub-pixel layout rounding can't
// leave hairline gaps (the "grid lines" seam).
const BLEED = 1;

// Build the tile layer as a cols×rows grid of children. Every tile is a WINDOW
// into one full-size background (`background-size: W×H`, position `-left -top`),
// so all tiles share the same coordinate space — overlaps show identical pixels
// (seamless) and the 1px bleed closes any rounding gap. When the frame can't be
// measured yet we fall back to percentage sizing. Tiles are appended row-major
// so a GSAP grid stagger of [rows, cols] lines up. Styles are inline.
function buildTiles(containerEl, src, cols, rows) {
  const wrap = document.createElement("div");
  wrap.setAttribute("data-mk-md-tiles", "");
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
  const tileW = W / cols;
  const tileH = H / rows;
  const denomX = Math.max(cols - 1, 1);
  const denomY = Math.max(rows - 1, 1);
  const tiles = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const tile = document.createElement("span");
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

      if (usePx) {
        Object.assign(tile.style, base, {
          left: `${x * tileW}px`,
          top: `${y * tileH}px`,
          width: `${tileW + BLEED}px`,
          height: `${tileH + BLEED}px`,
          backgroundSize: `${W}px ${H}px`,
          backgroundPosition: `${-x * tileW}px ${-y * tileH}px`,
        });
      } else {
        Object.assign(tile.style, base, {
          left: `${(x * 100) / cols}%`,
          top: `${(y * 100) / rows}%`,
          width: `${100 / cols}%`,
          height: `${100 / rows}%`,
          backgroundSize: `${cols * 100}% ${rows * 100}%`,
          backgroundPosition: `${(x / denomX) * 100}% ${(y / denomY) * 100}%`,
        });
      }

      wrap.appendChild(tile);
      tiles.push(tile);
    }
  }

  containerEl.appendChild(wrap);
  return { wrap, tiles };
}

export function imageMosaicDepthAnim() {
  // id -> { timelines, elements: [{ containerEl, itemEl, wrap, restorePosition, restoreOverflow }] }
  const instances = new Map();

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;

    inst.timelines.forEach((tl) => {
      try {
        tl.revert();
        tl.kill();
      } catch (err) {
        console.warn("[imageMosaicDepth] timeline teardown error:", err);
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
          console.warn("[imageMosaicDepth] element cleanup error:", err);
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
        `[imageMosaicDepth] invalid itemClass selector "${anim.itemClass}":`,
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
        tileColumns = 7,
        tileRows = 5,
        tileOrder = "random",
        stagger = 0.72,
        delay = 0,
        duration = 1.22,
        animationStart,
        animationCStart,
        ease = "expo.out",
      } = {},
    } = anim;

    const resolvedTriggerClass = triggerSelector || triggerClass;
    const resolvedStart =
      animationStart === "custom" ? animationCStart : animationStart;
    const cols = Math.max(2, Math.round(tileColumns));
    const rows = Math.max(2, Math.round(tileRows));
    // How long before the tiles finish we start handing back to the real image.
    const handoff = Math.min(0.28, duration * 0.32);

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

    items.forEach((itemEl) => {
      const containerEl = itemEl.parentElement;
      if (!containerEl) return;

      const src = resolveImageSrc(itemEl);
      if (!src) {
        console.warn(
          "[imageMosaicDepth] could not resolve an image source for",
          anim.itemClass,
        );
        return;
      }

      // Tag both nodes so the global reset sweep runs clearProps on each.
      containerEl.setAttribute("data-motionkit-anim-id", id);
      itemEl.setAttribute("data-motionkit-anim-id", id);

      // Tiles are absolutely positioned inside the frame and must be clipped to it.
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

      const { wrap, tiles } = buildTiles(containerEl, src, cols, rows);

      const tlConfig =
        triggerType === "page_load"
          ? { delay }
          : {
              delay,
              scrollTrigger: {
                trigger: resolvedTriggerClass || containerEl,
                start: resolvedStart,
                scrub: triggerType === "play_with_scroll",
              },
            };

      const tl = gsap.timeline(tlConfig);

      tl.set(itemEl, { autoAlpha: 0 })
        .set(tiles, {
          autoAlpha: 0,
          scale: TILE_START_SCALE,
          z: () => gsap.utils.random(-DEPTH, DEPTH),
          x: () => gsap.utils.random(-TILE_SCATTER, TILE_SCATTER),
          y: () => gsap.utils.random(-TILE_SCATTER, TILE_SCATTER),
          rotationX: () => gsap.utils.random(-TILE_ROTATION, TILE_ROTATION),
          rotationY: () => gsap.utils.random(-TILE_ROTATION, TILE_ROTATION),
        })
        .to(tiles, {
          autoAlpha: 1,
          scale: 1,
          x: 0,
          y: 0,
          z: 0,
          rotationX: 0,
          rotationY: 0,
          duration,
          ease,
          stagger: {
            amount: stagger,
            from: tileOrder,
            grid: [rows, cols],
          },
        })
        // Reveal the real (seamless) image behind the tiles just before they
        // land so any sub-pixel seams are backed by it, then fade the tile
        // layer out exactly as the last tile settles — no frozen, seamed frame.
        .set(itemEl, { autoAlpha: 1 }, `>-${handoff}`)
        .to(wrap, { autoAlpha: 0, duration: handoff, ease: "power2.out" }, "<");

      timelines.push(tl);
      elements.push({
        containerEl,
        itemEl,
        wrap,
        restorePosition,
        restoreOverflow,
      });
    });

    instances.set(id, { timelines, elements });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

imageMosaicDepthAnim();
