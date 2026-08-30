import { VOID_ELEMENTS } from "../../../config/VoidElement";
import { isPlayable } from "../../../shared/animation-status.js";

const PRESET_KEY = "motionkit-mk-cursor-cr-pa";

// Shown while a bound video is playing; the paused label is the config's own viewText.
const PAUSE_LABEL = "Pause";

export function cursorHoverRevealAnim() {
  // id -> array of per-item teardown fns
  const instances = new Map();

  function toCssLength(value, fallback) {
    if (value == null || value === "") return fallback;
    const str = String(value);
    // Preserve any CSS unit the editor already appended (px, %, em, rem, etc).
    return /[a-z%]$/i.test(str) ? str : `${str}px`;
  }

  function teardown(id) {
    const fns = instances.get(id);
    if (!fns) return;
    fns.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[cursorReveal] teardown error:", err);
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function buildCursorEl({
    viewText,
    textColor,
    backgroundColor,
    width,
    height,
    radius,
    zIndex,
    borderStyle,
    fontSize,
  }) {
    const el = document.createElement("div");
    el.setAttribute("data-wcf-cursor-reveal", "");
    el.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${width};
      height: ${height};
      background-color: ${backgroundColor};
      color: ${textColor};
      pointer-events: none;
      z-index: ${zIndex};
      border-radius: ${radius};
      ${borderStyle}
      will-change: transform, opacity;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1;
      font-size: ${fontSize};
      font-weight: 500;
      padding: 8px;
      box-sizing: border-box;
      margin: 0;
    `;
    el.textContent = viewText;
    return el;
  }

  function attachToItem({ id, itemEl, cursorConfig }) {
    const cursorEl = buildCursorEl(cursorConfig);

    // Remember the element's original inline position so we can restore on teardown; only bump it to relative if currently static, otherwise the cursor's absolute positioning is relative to the nearest ancestor.
    const priorInlinePosition = itemEl.style.position;
    if (window.getComputedStyle(itemEl).position === "static") {
      itemEl.style.position = "relative";
    }

    // Tag so the global reset sweep runs clearProps alongside our local teardown.
    itemEl.setAttribute("data-motionkit-anim-id", id);
    itemEl.appendChild(cursorEl);

    gsap.set(cursorEl, {
      xPercent: -50,
      yPercent: -50,
      scale: 0,
      opacity: 0,
      force3D: true,
    });

    const setCursorX = gsap.quickTo(cursorEl, "x", {
      duration: 0.6,
      ease: "expo",
    });
    const setCursorY = gsap.quickTo(cursorEl, "y", {
      duration: 0.6,
      ease: "expo",
    });

    const revealTl = gsap.timeline({ paused: true }).to(cursorEl, {
      scale: 1,
      opacity: 1,
      duration: 0.5,
      ease: "expo.inOut",
    });

    const moveCursorToEvent = (evt) => {
      const rect = itemEl.getBoundingClientRect();
      setCursorX(evt.clientX - rect.left);
      setCursorY(evt.clientY - rect.top);
    };

    const onMouseEnter = (evt) => {
      // Snap the cursor to the current mouse position BEFORE fading in, so it doesn't pop from (0,0) on the first reveal.
      moveCursorToEvent(evt);
      itemEl.addEventListener("mousemove", moveCursorToEvent);
      revealTl.play();
    };

    const onMouseLeave = () => {
      itemEl.removeEventListener("mousemove", moveCursorToEvent);
      revealTl.reverse();
    };

    itemEl.addEventListener("mouseenter", onMouseEnter);
    itemEl.addEventListener("mouseleave", onMouseLeave);

    // A <video> inside the item opts it into playback control automatically: clicking toggles play/pause and the label tracks the real state, while items without one never bind.
    const video = itemEl.querySelector("video");

    const syncLabel = () => {
      cursorEl.textContent = video.paused ? cursorConfig.viewText : PAUSE_LABEL;
    };

    const onClick = () => {
      // play() rejects when the browser blocks autoplay; the label is driven by the media events, so a rejection just leaves it reading "play".
      if (video.paused) {
        const played = video.play();
        if (played && typeof played.catch === "function") {
          played.catch(() => {});
        }
      } else {
        video.pause();
      }
    };

    if (video) {
      // Listening to the media events rather than the click keeps the label correct when playback changes on its own — the video ending, or another script pausing it.
      video.addEventListener("play", syncLabel);
      video.addEventListener("pause", syncLabel);
      video.addEventListener("ended", syncLabel);
      itemEl.addEventListener("click", onClick);
      syncLabel();
    }

    return () => {
      itemEl.removeEventListener("mouseenter", onMouseEnter);
      itemEl.removeEventListener("mouseleave", onMouseLeave);
      itemEl.removeEventListener("mousemove", moveCursorToEvent);
      if (video) {
        video.removeEventListener("play", syncLabel);
        video.removeEventListener("pause", syncLabel);
        video.removeEventListener("ended", syncLabel);
        itemEl.removeEventListener("click", onClick);
      }
      revealTl.kill();
      cursorEl.remove();
      itemEl.style.position = priorInlinePosition;
    };
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY) return;
    if (!isPlayable(anim)) return;
    if (!anim.itemClass) return;

    let items;
    try {
      items = document.querySelectorAll(anim.itemClass);
    } catch (err) {
      console.warn(
        `[cursorReveal] invalid itemClass selector "${anim.itemClass}":`,
        err.message,
      );
      return;
    }
    if (!items.length) return;

    const { id, vars = {} } = anim;
    const {
      viewText,
      textColor = "#ffffff",
      backgroundColor = "#000000",
      backgroundWidth = "70px",
      backgroundHeight = "70px",
      borderType,
      borderWidth,
      borderColor = "#000000",
      borderRadius = "50px",
      zIndex,
      fontSize,
    } = vars;

    if (!viewText) return;

    // Render the border only when both a type (other than 'none') AND a width are provided; a width of "0" / "0px" is respected as a zero-width border, but if either field is empty the border is skipped entirely.
    const hasBorderWidth = borderWidth != null && borderWidth !== "";
    const borderStyle =
      borderType && borderType !== "none" && hasBorderWidth
        ? `border: ${toCssLength(borderWidth)} ${borderType} ${
            borderColor || "#000000"
          };`
        : "";

    const cursorConfig = {
      viewText,
      textColor,
      backgroundColor,
      width: toCssLength(backgroundWidth, "70px"),
      height: toCssLength(backgroundHeight, "70px"),
      radius: toCssLength(borderRadius, "50px"),
      zIndex: zIndex === "" || zIndex == null ? 999 : zIndex,
      borderStyle,
      // Defaults match the values these were hardcoded to, so configs saved before these fields existed render exactly as they did.
      fontSize: toCssLength(fontSize, "14px"),
    };

    // Live-update safety: tear down any prior setup for this id before rebuild.
    teardown(id);

    // Preview-one mode: tag the targets (mirroring attachToItem's void-element hop) so the editor's inspector keeps its markers, then bail before any cursor node is injected.
    if (anim.mkInert) {
      items.forEach((originalEl) => {
        const el = VOID_ELEMENTS.has(originalEl.tagName)
          ? originalEl.parentElement
          : originalEl;
        el?.setAttribute("data-motionkit-anim-id", id);
      });
      return;
    }

    const teardowns = [];
    items.forEach((originalEl) => {
      const isVoid = VOID_ELEMENTS.has(originalEl.tagName);
      const itemEl = isVoid ? originalEl.parentElement : originalEl;
      if (!itemEl) return;

      if (isVoid && originalEl.tagName === "IMG") {
        originalEl.style.display = "block";
      }

      teardowns.push(attachToItem({ id, itemEl, cursorConfig }));
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

cursorHoverRevealAnim();
