import { num, str } from "./shared.js";

// ── 2. Progress Bar ───────────────────────────────────────────
export default function progressBar({ visual }, cfg) {
  const track = document.createElement("div");
  track.style.cssText = [
    `width:${num(cfg.barWidth, 240)}px`,
    "max-width:80vw",
    `height:${num(cfg.barHeight, 4)}px`,
    `background:${str(cfg.trackColor, "#ffffff26")}`,
    `border-radius:${num(cfg.radius, 4)}px`,
    "overflow:hidden",
  ].join(";");

  const fill = document.createElement("div");
  fill.style.cssText = [
    "width:0%",
    "height:100%",
    `background:${str(cfg.barColor, "#ffffff")}`,
    "border-radius:inherit",
    "transition:width .12s linear",
  ].join(";");
  track.appendChild(fill);
  visual.appendChild(track);

  return {
    tick(p) {
      fill.style.width = `${Math.round(p * 100)}%`;
    },
  };
}
