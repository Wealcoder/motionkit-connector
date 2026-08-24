import { injectCss, num, str } from "./shared.js";

// ── 4. Logo Pulse ─────────────────────────────────────────────
// Breathes the branding logo when one is configured; falls back to a dot so the preset is
// never an empty screen.
export default function logoPulse({ visual, content }, cfg) {
  const scale = num(cfg.pulseScale, 1.12);
  const dur = Math.max(0.2, num(cfg.pulseDuration, 1.1));

  injectCss(
    "logopulse",
    `@keyframes mk-pl-pulse{0%,100%{transform:scale(1)}50%{transform:scale(${scale})}}`,
  );

  const target = content.querySelector(".mk-pl-logo");
  if (target) {
    target.style.animation = `mk-pl-pulse ${dur}s ease-in-out infinite`;
    if (cfg.glow) {
      target.style.filter = `drop-shadow(0 0 24px ${str(cfg.glowColor, "#ffffff66")})`;
    }
    return {};
  }

  const dot = document.createElement("div");
  dot.style.cssText = [
    "width:56px",
    "height:56px",
    "border-radius:50%",
    "background:#ffffff",
    `animation:mk-pl-pulse ${dur}s ease-in-out infinite`,
    cfg.glow
      ? `box-shadow:0 0 32px ${str(cfg.glowColor, "#ffffff66")}`
      : "",
  ]
    .filter(Boolean)
    .join(";");
  visual.appendChild(dot);
  return {};
}
