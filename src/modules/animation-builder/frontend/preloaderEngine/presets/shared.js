// Primitives every preset builder shares.
//
// One file per preset, and exactly one preset per bundle — the site downloads the engine
// core plus the single preset it has selected, never the other fourteen. See
// webpack.config.js (glob over frontend/preloader/) and Frontend::enqueue_preloader().
//
// Builder contract — each default-exported builder receives ({ visual, content, root }, cfg)
// and returns:
//   {
//     tick(p)                             optional — progress-driven visuals (0..1)
//     destroy()                           optional — cleanup
//     revealOverride(root, reveal, done)  optional — preset supplies its own exit
//   }
//
// Continuous motion (spin, bounce, wave, morph) is done with CSS keyframes rather than
// GSAP on purpose: the cover must look alive even on a site whose GSAP CDN is slow or
// blocked. GSAP is used for the reveal, where it is available by then or the CSS fallback
// in reveal.js takes over.

const STYLE_PREFIX = "motionkit-preloader-preset-";

/** Add a preset's stylesheet once. Idempotent — safe to call from a rebuilt cover. */
export const injectCss = (id, cssText) => {
  const styleId = STYLE_PREFIX + id;
  if (document.getElementById(styleId)) return;
  const node = document.createElement("style");
  node.id = styleId;
  node.textContent = cssText;
  (document.head || document.documentElement).appendChild(node);
};

export const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const str = (v, fallback) => (typeof v === "string" && v !== "" ? v : fallback);

export const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Feature-detect a declaration. Never throws — an old browser must not kill the cover. */
export const supports = (prop, value) => {
  try {
    return typeof CSS !== "undefined" && !!CSS.supports && CSS.supports(prop, value);
  } catch (e) {
    return false;
  }
};

export const SVG_NS = "http://www.w3.org/2000/svg";

/** Join style fragments, dropping the empty ones conditionals leave behind. */
export const css = (parts) => parts.filter(Boolean).join(";");

/** A styled element in one call — the shape almost every builder opens with. */
export const el = (parts, tag = "div") => {
  const node = document.createElement(tag);
  node.style.cssText = Array.isArray(parts) ? css(parts) : parts;
  return node;
};

/**
 * Shared metrics for the text-stacking presets.
 *
 * Not just deduplication: strokeFill and glitchText both stack two or three copies of the
 * same string and rely on them registering pixel-for-pixel. Deriving every layer from one
 * block is what guarantees that — hand-written copies would eventually drift apart.
 *
 * @returns {string[]} fragments, so callers can append their own before css()
 */
export const textStyle = ({
  fontSize,
  maxVw,
  weight,
  spacing,
  lineHeight = 1.05,
}) => [
  `font-size:min(${fontSize}px, ${maxVw}vw)`,
  `font-weight:${weight}`,
  `letter-spacing:${spacing}em`,
  `line-height:${lineHeight}`,
  "white-space:nowrap",
  "font-family:inherit",
];

/**
 * A flex row of N identical children, each styled by index — the shape behind every
 * "staggered dots / bars" preset.
 *
 * @param {(i:number)=>string[]} styleFor per-child style fragments
 */
export const buildRow = ({ count, gap, height, align, styleFor }) => {
  const row = el([
    "display:flex",
    `align-items:${align}`,
    `gap:${gap}px`,
    `height:${height}px`,
  ]);
  for (let i = 0; i < count; i++) {
    row.appendChild(el(styleFor(i)));
  }
  return row;
};
