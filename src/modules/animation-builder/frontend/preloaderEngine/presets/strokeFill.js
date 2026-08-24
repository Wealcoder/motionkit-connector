import { el, num, str, textStyle } from "./shared.js";

// ── Stroke Fill Text ──────────────────────────────────────────
// The word IS the progress bar: an outlined copy underneath, a solid copy on top clipped
// from the bottom up as loading advances.
export default function strokeFill({ visual }, cfg) {
  const text = str(cfg.text, "LOADING");
  const strokeWidth = num(cfg.strokeWidth, 1.5);
  // Both layers derive from one metrics block so they stay registered pixel-for-pixel.
  const metrics = textStyle({
    fontSize: num(cfg.fontSize, 88),
    maxVw: 13,
    weight: str(cfg.fontWeight, "800"),
    spacing: num(cfg.letterSpacing, 0.06),
  });

  const holder = el("position:relative;display:inline-block");

  const outline = el([
    ...metrics,
    "color:transparent",
    `-webkit-text-stroke:${strokeWidth}px ${str(cfg.strokeColor, "#ffffff33")}`,
  ]);
  outline.textContent = text;

  const fill = el([
    ...metrics,
    "position:absolute",
    "left:0",
    "top:0",
    "width:100%",
    `color:${str(cfg.fillColor, "#ffffff")}`,
    "clip-path:inset(100% 0 0 0)",
    "transition:clip-path .12s linear",
  ]);
  fill.textContent = text;

  holder.appendChild(outline);
  holder.appendChild(fill);
  visual.appendChild(holder);

  return {
    tick(p) {
      fill.style.clipPath = `inset(${(1 - p) * 100}% 0 0 0)`;
    },
  };
}
