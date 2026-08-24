import { injectCss, num, str, el } from "./shared.js";

// ── 1. Spinner Ring ───────────────────────────────────────────
export default function spinner({ visual }, cfg) {
  const size = num(cfg.ringSize, 56);
  const thickness = num(cfg.thickness, 4);
  const speed = Math.max(0.1, num(cfg.spinSpeed, 1));

  injectCss(
    "spinner",
    "@keyframes mk-pl-spin{to{transform:rotate(360deg)}}",
  );

  visual.appendChild(
    el([
      `width:${size}px`,
      `height:${size}px`,
      "border-radius:50%",
      `border:${thickness}px solid ${str(cfg.trackColor, "#ffffff26")}`,
      `border-top-color:${str(cfg.ringColor, "#ffffff")}`,
      "box-sizing:border-box",
      `animation:mk-pl-spin ${1 / speed}s linear infinite`,
    ]),
  );
  return {};
}
