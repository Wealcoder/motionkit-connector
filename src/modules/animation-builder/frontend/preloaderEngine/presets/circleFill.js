import { num, str, el } from "./shared.js";

// ── 8. Circle Fill ────────────────────────────────────────────
const FILL_DIRECTION = {
  center: "circle at 50% 50%",
  top: "to bottom",
  bottom: "to top",
  left: "to right",
  right: "to left",
};

export default function circleFill({ visual }, cfg) {
  const size = num(cfg.circleSize, 120);
  const fillColor = str(cfg.fillColor, "#ffffff");
  const trackColor = str(cfg.trackColor, "#ffffff26");
  const origin = str(cfg.origin, "center");

  const dial = el([
    `width:${size}px`,
    `height:${size}px`,
    "border-radius:50%",
    `background:${trackColor}`,
    "overflow:hidden",
    "position:relative",
    cfg.showRing === false ? "" : `box-shadow:inset 0 0 0 2px ${fillColor}`,
  ]);

  const isRadial = origin === "center";
  const fill = el([
    "position:absolute",
    "inset:0",
    `background:${fillColor}`,
    "transition:clip-path .12s linear,transform .12s linear",
  ]);
  if (isRadial) fill.style.clipPath = "circle(0% at 50% 50%)";
  else {
    const axis =
      origin === "top" || origin === "bottom" ? "scaleY" : "scaleX";
    fill.style.transformOrigin = FILL_DIRECTION[origin] || "bottom";
    fill.style.transform = `${axis}(0)`;
    fill.dataset.axis = axis;
  }
  dial.appendChild(fill);
  visual.appendChild(dial);

  return {
    tick(p) {
      if (isRadial) {
        fill.style.clipPath = `circle(${Math.round(p * 71)}% at 50% 50%)`;
        return;
      }
      fill.style.transform = `${fill.dataset.axis}(${p})`;
    },
  };
}
