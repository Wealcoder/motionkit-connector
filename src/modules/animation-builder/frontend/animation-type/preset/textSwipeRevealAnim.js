import { isPreviewMode } from "@/utils/isPreviewMode";

const PRESET_KEY = "motionkit-mk-text-swipe-pa";

const DEFAULT_BAR1 = "#5fbff9";
const DEFAULT_BAR2 = "#f06543";

// Which edge the bar grows from (and shrinks back to).
function sweepOrigin(direction) {
  if (direction === "right") return "right center";
  if (direction === "center") return "center center";
  return "left center";
}

// Append a colored bar that fills `unitEl` and sits above its text.
function makeBar(unitEl, color, origin) {
  unitEl.style.position = "relative";
  const bar = document.createElement("span");
  Object.assign(bar.style, {
    position: "absolute",
    inset: "0",
    backgroundColor: color,
    transformOrigin: origin,
    transform: "scaleX(0)",
    pointerEvents: "none",
    zIndex: "2",
    visibility: "visible",
  });
  unitEl.appendChild(bar);
  return bar;
}

export function textSwipeRevealAnim() {
  const instances = new Map();

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.tl?.kill();
    inst.bars.forEach((bar) => bar.remove());
    inst.units.forEach((el) => gsap.set(el, { clearProps: "opacity,visibility,position" }));
    inst.splits.forEach((s) => {
      try {
        s.revert();
      } catch {}
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY || anim.isPublished === false) return;
    if (!anim.itemClass) return;

    const {
      id,
      itemClass,
      trigger: { type: triggerType, selector: triggerSelector } = {},
      vars: {
        splitType = "lines",
        direction = "left",
        bar1Color = DEFAULT_BAR1,
        bar2Color = DEFAULT_BAR2,
        start,
        startCustom,
        end,
        endCustom,
        delay = 0,
        duration = 0.5,
        stagger = 0.12,
        ease = "power2.inOut",
        markers,
      } = {},
    } = anim;

    let items;
    try {
      items = document.querySelectorAll(itemClass);
    } catch {
      return;
    }
    if (!items.length) return;

    teardown(id); // live-update safety

    // Preview-one mode: tag the targets so the editor's inspector keeps its markers, then
    // bail before SplitText runs — splitting rewrites the DOM and would be wasted work.
    if (anim.mkInert) {
      items.forEach((el) => el.setAttribute("data-motionkit-anim-id", id));
      return;
    }

    const origin = sweepOrigin(direction);

    // Resolve the units to cover (one bar each). Split into lines/words, or use
    // the whole element.
    const splits = [];
    let units = [];
    if (splitType === "element") {
      units = [...items];
    } else {
      const type = splitType === "words" ? "words" : "lines";
      items.forEach((el) => {
        const s = new SplitText(el, { type });
        splits.push(s);
        units.push(...s[type]);
      });
    }
    if (!units.length) return;

    items.forEach((el) => el.setAttribute("data-motionkit-anim-id", id));
    // Odd units (1st, 3rd…) get bar 1, even units (2nd, 4th…) get bar 2.
    const bars = units.map((el, i) =>
      makeBar(el, i % 2 === 0 ? bar1Color : bar2Color, origin),
    );

    // Timeline: each bar grows 0->1 to cover its unit, then reverses 1->0
    // (repeat:1 + yoyo). Text flips visible at the peak so it's revealed behind
    // the bar. `.set(..., 0)` re-hides on every play so the editor reset can't
    // skip the cover phase.
    const tl = gsap.timeline({
      delay: triggerType === "play_with_scroll" ? 0 : delay,
      scrollTrigger:
        triggerType === "page_load"
          ? undefined
          : {
              id,
              trigger: triggerSelector || itemClass,
              start: start === "custom" ? startCustom : start || "top 80%",
              end: end === "custom" ? endCustom : end || "bottom top",
              scrub: triggerType === "play_with_scroll",
              markers: markers === true && isPreviewMode(),
            },
    });

    // Hide the text with `visibility`, NOT autoAlpha. autoAlpha also sets
    // opacity:0 on the unit, and opacity multiplies down to children — so the
    // bar (a child of the unit) would be invisible during the whole cover
    // phase. visibility:hidden on the unit is overridden by visibility:visible
    // on the bar (set in makeBar), so the bar stays colored while the text is
    // hidden. Text flips visible at the peak, under the fully-covering bar.
    tl.set(units, { visibility: "hidden" }, 0);
    bars.forEach((bar, i) => {
      const at = i * stagger;
      tl.to(bar, { scaleX: 1, duration, ease, repeat: 1, yoyo: true }, at);
      tl.set(units[i], { visibility: "visible" }, at + duration);
    });

    instances.set(id, { tl, bars, units, splits });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () => document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

textSwipeRevealAnim();
