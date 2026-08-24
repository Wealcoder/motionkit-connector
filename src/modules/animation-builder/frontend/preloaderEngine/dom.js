import { COVER_ID, COVER_CLASS, STYLE_ID } from "./config.js";
import { ensureFont, toFontStack } from "./fonts.js";

// Overlay construction.
//
// The cover is a single opaque fixed element at the top of the stacking context — it
// hides the page by BEING on top of it, not by touching body visibility. That matters:
// nothing about the page's own layout or paint is mutated, so there is nothing to restore
// incorrectly if we die halfway.
//
// The cover may already exist when this runs: on WordPress, PHP prints it at wp_head
// priority 0 so it paints before GSAP's render-blocking CDN fetch even starts. In the
// exported standalone snippet there is no PHP, so ensureCover() creates it synchronously
// from <head>. Either way the engine finds one element and populates it.

const ALIGN_MAP = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
};

/**
 * Base stylesheet + the pure-CSS failsafe.
 *
 * The failsafe is the single most important line in this engine: after maxDuration the
 * cover fades itself out with NO JavaScript involved. If this bundle 404s, if GSAP fails
 * to load, if a preset builder throws before the watchdog is armed — the visitor still
 * gets the site. A preloader must fail open.
 */
export function ensureStyles(maxDuration) {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
#${COVER_ID}{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:24px;box-sizing:border-box;text-align:center;
animation:motionkit-preloader-failsafe .35s linear ${Math.max(1, maxDuration)}s forwards}
@keyframes motionkit-preloader-failsafe{to{opacity:0;visibility:hidden;pointer-events:none}}
#${COVER_ID} .mk-pl-content{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;max-width:min(90vw,520px)}
#${COVER_ID} .mk-pl-logo{display:flex;align-items:center;justify-content:center;max-width:min(80%,360px)}
#${COVER_ID} .mk-pl-logo img,#${COVER_ID} .mk-pl-logo svg{display:block;width:auto;max-width:100%;height:100%}
#${COVER_ID} .mk-pl-label{line-height:1;text-transform:uppercase;font-family:inherit}
#${COVER_ID} .mk-pl-visual{display:flex;align-items:center;justify-content:center}
#${COVER_ID} .mk-pl-readout{line-height:1;font-variant-numeric:tabular-nums}
#${COVER_ID} .mk-pl-track{overflow:hidden;width:100%}
#${COVER_ID} .mk-pl-fill{height:100%;width:0%;transform-origin:left center}
@media (prefers-reduced-motion:reduce){#${COVER_ID} *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`.trim();
  (document.head || document.documentElement).appendChild(el);
}

/** Find the PHP-printed cover, or create one. Returns the root element. */
export function ensureCover(cfg) {
  ensureStyles(cfg.shared.maxDuration);

  let root = document.getElementById(COVER_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = COVER_ID;
    // documentElement, not body — body may not be parsed yet when we run from <head>.
    document.documentElement.appendChild(root);
  }

  root.style.background = cfg.shared.background;
  root.style.opacity = String(cfg.shared.overlayOpacity);
  root.style.justifyContent = ALIGN_MAP[cfg.shared.alignment] || "center";

  // Set on the root so every preset's text inherits it — the presets all declare
  // font-family:inherit rather than each carrying its own font config.
  // ensureFont skips the network entirely when the page already has this family.
  if (cfg.shared.fontFamily) {
    ensureFont(cfg.shared.fontFamily);
    root.style.fontFamily = toFontStack(cfg.shared.fontFamily);
  }
  if (cfg.shared.backdropBlur && cfg.shared.blurAmount > 0) {
    const blur = `blur(${cfg.shared.blurAmount}px)`;
    root.style.backdropFilter = blur;
    root.style.webkitBackdropFilter = blur;
  }
  document.documentElement.classList.add(COVER_CLASS);
  return root;
}

const buildLogo = (shared) => {
  if (!shared.showLogo || !shared.logo) return null;
  const wrap = document.createElement("div");
  wrap.className = "mk-pl-logo";
  wrap.style.height = `${shared.logoSize}px`;

  const raw = String(shared.logo).trim();
  if (raw.toLowerCase().indexOf("<svg") === 0) {
    wrap.innerHTML = raw;
  } else {
    const img = document.createElement("img");
    img.src = raw;
    img.alt = "";
    img.style.objectFit = "contain";
    wrap.appendChild(img);
  }
  return wrap;
};

const buildLabel = (shared) => {
  if (!shared.showLabel || !shared.label) return null;
  const el = document.createElement("div");
  el.className = "mk-pl-label";
  el.textContent = String(shared.label);
  el.style.color = shared.labelColor;
  el.style.fontSize = `${shared.labelSize}px`;
  el.style.fontWeight = shared.labelWeight;
  el.style.letterSpacing = `${shared.labelSpacing}em`;
  return el;
};

// Where a non-inline readout is pinned. `center` is the odd one out — it stays in the
// content stack under the preset visual instead of being absolutely placed.
const READOUT_EDGE = {
  top: "position:absolute;top:40px;left:50%;transform:translateX(-50%)",
  bottom: "position:absolute;bottom:40px;left:50%;transform:translateX(-50%)",
  left: "position:absolute;left:40px;top:50%;transform:translateY(-50%)",
  right: "position:absolute;right:40px;top:50%;transform:translateY(-50%)",
};

// Progress readout drawn on top of whatever the preset renders.
//   percent      small "42%"
//   counter      the same number, large
//   bar          track + fill
//   barPercent   both, side by side (stacked when pinned left/right)
const buildReadout = (shared) => {
  const type = shared.progressType;
  if (type === "none") return null;

  const position = shared.progressPosition || "center";
  // Pinned to a side edge → the bar reads better vertical, and the number sits under it.
  const vertical = position === "left" || position === "right";
  const size = Math.max(8, Number(shared.progressSize) || 14);

  const wrap = document.createElement("div");
  wrap.className = "mk-pl-readout-wrap";
  wrap.style.cssText =
    "display:flex;align-items:center;justify-content:center;gap:10px;" +
    (vertical ? "flex-direction:column;" : "flex-direction:row;") +
    (position === "center" ? "" : READOUT_EDGE[position] || "");

  let fill = null;
  let text = null;

  if (type === "bar" || type === "barPercent") {
    const thickness = Math.max(2, Math.round(size / 4));
    const length = vertical ? "min(220px,40vh)" : "min(240px,60vw)";

    const track = document.createElement("div");
    track.className = "mk-pl-track";
    track.style.cssText = [
      vertical ? `width:${thickness}px` : `width:${length}`,
      vertical ? `height:${length}` : `height:${thickness}px`,
      `border-radius:${thickness}px`,
      "background:rgba(255,255,255,.16)",
      "overflow:hidden",
      vertical ? "display:flex;align-items:flex-end" : "",
    ]
      .filter(Boolean)
      .join(";");

    fill = document.createElement("div");
    fill.className = "mk-pl-fill";
    fill.style.cssText = [
      `background:${shared.accentColor}`,
      "border-radius:inherit",
      vertical ? "width:100%;height:0%" : "height:100%;width:0%",
      "transition:width .12s linear,height .12s linear",
    ].join(";");
    fill.dataset.axis = vertical ? "height" : "width";
    track.appendChild(fill);
    wrap.appendChild(track);
  }

  if (type === "percent" || type === "counter" || type === "barPercent") {
    text = document.createElement("div");
    text.className = "mk-pl-readout";
    text.style.cssText = [
      `color:${shared.accentColor}`,
      `font-size:${type === "counter" ? size * 2.6 : size}px`,
      `font-weight:${type === "counter" ? 700 : 500}`,
      "line-height:1",
      "font-variant-numeric:tabular-nums",
    ].join(";");
    text.textContent = "0%";
    wrap.appendChild(text);
  }

  return { node: wrap, fill, text, pinned: position !== "center" };
};

/**
 * Populate the cover with logo / preset visual / label / progress readout.
 * Returns refs the caller updates on each progress tick.
 */
export function buildChrome(root, cfg) {
  const shared = cfg.shared;
  const content = document.createElement("div");
  content.className = "mk-pl-content";

  const logo = buildLogo(shared);
  if (logo) content.appendChild(logo);

  // The preset (or custom assembly) owns this node entirely.
  const visual = document.createElement("div");
  visual.className = "mk-pl-visual";
  content.appendChild(visual);

  const label = buildLabel(shared);
  if (label) content.appendChild(label);

  const readout = buildReadout(shared);
  // A pinned readout goes on the cover itself, not in the centred content stack —
  // otherwise the absolute positioning would resolve against the stack, not the screen.
  if (readout) (readout.pinned ? root : content).appendChild(readout.node);

  root.appendChild(content);
  return { content, visual, readout };
}

/** Update the shared progress readout. Preset visuals get their own tick(). */
export function setReadout(readout, p) {
  if (!readout) return;
  const pct = Math.round(p * 100);
  if (readout.fill) {
    readout.fill.style[readout.fill.dataset.axis] = `${pct}%`;
  }
  if (readout.text) {
    readout.text.textContent = `${pct}%`;
  }
}

let savedHtmlOverflow = "";
let savedBodyOverflow = "";
let locked = false;

export function lockScroll() {
  if (locked) return;
  locked = true;
  savedHtmlOverflow = document.documentElement.style.overflow;
  savedBodyOverflow = (document.body && document.body.style.overflow) || "";
  document.documentElement.style.overflow = "hidden";
  if (document.body) document.body.style.overflow = "hidden";
}

export function unlockScroll() {
  if (!locked) return;
  locked = false;
  document.documentElement.style.overflow = savedHtmlOverflow;
  if (document.body) document.body.style.overflow = savedBodyOverflow;
}

/**
 * Drop the PHP-printed page mask so real content is visible again.
 *
 * Called when the reveal STARTS, not when it ends. The mask (`body{visibility:hidden}`)
 * exists only to stop content painting before the cover element exists; once the cover is
 * animating away, the page underneath has to be there or the reveal uncovers the bare
 * html background and the real content snaps in afterwards. Most visible on the curtain
 * preset, where the panels part to show what is behind them.
 */
export function uncoverPage() {
  document.documentElement.classList.remove(COVER_CLASS);
}

/** Final teardown — always safe to call twice. */
export function teardown(root) {
  unlockScroll();
  uncoverPage();
  if (root && root.parentNode) root.parentNode.removeChild(root);
}
