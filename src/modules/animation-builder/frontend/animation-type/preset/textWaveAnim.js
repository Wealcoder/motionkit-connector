import { isPreviewMode } from "@/utils/isPreviewMode";

const PRESET_KEY = "motionkit-mk-text-wave-pa";

function resolveSelector(sel) {
  if (!sel || typeof sel !== "string") return "";
  const trimmed = sel.trim();
  if (
    trimmed.startsWith(".") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith(":") ||
    trimmed.includes(" ") ||
    trimmed.includes(">")
  ) {
    return trimmed;
  }
  // If it's a standard HTML tag name, keep it as tag
  const htmlTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "div", "a", "button", "li", "section", "article"];
  if (htmlTags.includes(trimmed.toLowerCase())) {
    return trimmed;
  }
  return "." + trimmed;
}

export function textWaveAnim() {
  // id -> { tweens: [], splits: [], cleanups: [] }
  const instances = new Map();

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.tweens.forEach((t) => {
      try {
        t.kill();
      } catch {}
    });
    inst.splits.forEach((s) => {
      try {
        s.revert();
      } catch {}
    });
    inst.cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    if (window.ScrollTrigger) {
      const st = window.ScrollTrigger.getById(id);
      if (st) {
        try {
          st.kill();
        } catch {}
      }
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
      trigger: { type: triggerType, selector: triggerSelector } = {},
      vars: {
        start,
        startCustom,
        end,
        endCustom,
        intensity = 2,
        yOffset = -25,
        stagger = 0.05,
        duration = 0.8,
        ease = "sine.inOut",
        markers,
      } = {},
    } = anim;

    const targetSelector = resolveSelector(itemClass);
    let items;
    try {
      items = document.querySelectorAll(targetSelector);
      if (!items.length && targetSelector !== itemClass) {
        items = document.querySelectorAll(itemClass);
      }
    } catch (err) {
      try {
        items = document.querySelectorAll(itemClass);
      } catch (e2) {
        console.warn(`[textWave] invalid itemClass "${itemClass}":`, err.message);
        return;
      }
    }
    if (!items || !items.length) return;

    teardown(id);

    // Preview-one mode: tag the targets so the editor's inspector keeps its markers, then
    // bail before SplitText rewrites the DOM — only the previewed animation may build.
    if (anim.mkInert) {
      items.forEach((el) => el.setAttribute("data-motionkit-anim-id", id));
      return;
    }

    const tweens = [];
    const splits = [];
    const cleanups = [];

    let splitInstance;
    try {
      splitInstance = new SplitText(items, {
        type: "chars",
        smartWrap: true,
      });
    } catch (err) {
      console.error("[textWave] SplitText failed:", err);
      return;
    }
    splits.push(splitInstance);
    const chars = splitInstance.chars;
    if (!chars?.length) return;

    items.forEach((el) => el.setAttribute("data-motionkit-anim-id", id));

    const previewMarkers = markers === true && isPreviewMode();

    const buildLoop = () =>
      gsap.to(chars, {
        y: yOffset,
        rotationZ: (i, el, arr) => (i - arr.length / 2) * intensity,
        duration,
        ease,
        stagger: { each: stagger, repeat: -1, yoyo: true },
      });

    const runScroll = () => {
      const tween = buildLoop();
      tween.pause();
      const resolvedTrigger = triggerSelector ? resolveSelector(triggerSelector) : targetSelector;
      const st = window.ScrollTrigger?.create({
        id,
        trigger: resolvedTrigger || items[0],
        start: start === "custom" ? startCustom : start || "top 80%",
        end: end === "custom" ? endCustom : end || "bottom 20%",
        once: true,
        markers: previewMarkers,
        onEnter: () => tween.play(),
      });
      tweens.push(tween);
      cleanups.push(() => {
        try {
          st?.kill();
        } catch {}
      });
    };

    const runPageLoad = () => {
      tweens.push(buildLoop());
    };

    const attachHover = () => {
      const resolvedTrigger = triggerSelector ? resolveSelector(triggerSelector) : targetSelector;
      let triggers;
      try {
        triggers = document.querySelectorAll(resolvedTrigger);
      } catch (err) {
        triggers = items;
      }
      if (!triggers || !triggers.length) triggers = items;

      triggers.forEach((el) => {
        let tween = null;
        const onEnter = () => {
          if (!tween) {
            tween = buildLoop();
            tweens.push(tween);
          } else {
            tween.play();
          }
        };
        const onLeave = () => {
          if (tween) tween.pause();
        };
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
        });
      });
    };

    const attachClick = () => {
      const resolvedTrigger = triggerSelector ? resolveSelector(triggerSelector) : targetSelector;
      let triggers;
      try {
        triggers = document.querySelectorAll(resolvedTrigger);
      } catch (err) {
        triggers = items;
      }
      if (!triggers || !triggers.length) triggers = items;

      triggers.forEach((el) => {
        let tween = null;
        const onClick = () => {
          if (!tween) {
            tween = buildLoop();
            tweens.push(tween);
          } else if (tween.paused()) {
            tween.play();
          } else {
            tween.pause();
          }
        };
        el.addEventListener("click", onClick);
        cleanups.push(() => el.removeEventListener("click", onClick));
      });
    };

    switch (triggerType) {
      case "on_scroll":
        runScroll();
        break;
      case "page_load":
      default:
        runPageLoad();
        break;
      case "hover":
        attachHover();
        break;
      case "click":
        attachClick();
        break;
    }

    instances.set(id, { tweens, splits, cleanups });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

textWaveAnim();
