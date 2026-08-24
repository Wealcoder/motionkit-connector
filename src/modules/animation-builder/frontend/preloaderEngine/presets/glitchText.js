import { el, injectCss, num, str, textStyle } from "./shared.js";

// ── Glitch Text ───────────────────────────────────────────────
// Chromatic-aberration tear from three stacked copies. Intensity rides on a CSS custom
// property so the keyframes stay static and injectCss can keep being idempotent.
export default function glitchText({ visual }, cfg) {
  const text = str(cfg.text, "LOADING");
  const speed = Math.max(0.2, num(cfg.speed, 1));

  injectCss(
    "glitchtext",
    "@keyframes mk-pl-glitch-a{" +
      "0%,100%{clip-path:inset(0 0 86% 0);transform:translateX(calc(var(--mk-gi) * -1))}" +
      "25%{clip-path:inset(24% 0 52% 0);transform:translateX(var(--mk-gi))}" +
      "50%{clip-path:inset(58% 0 22% 0);transform:translateX(calc(var(--mk-gi) * -1))}" +
      "75%{clip-path:inset(38% 0 44% 0);transform:translateX(var(--mk-gi))}}" +
      "@keyframes mk-pl-glitch-b{" +
      "0%,100%{clip-path:inset(72% 0 8% 0);transform:translateX(var(--mk-gi))}" +
      "25%{clip-path:inset(12% 0 70% 0);transform:translateX(calc(var(--mk-gi) * -1))}" +
      "50%{clip-path:inset(46% 0 34% 0);transform:translateX(var(--mk-gi))}" +
      "75%{clip-path:inset(6% 0 80% 0);transform:translateX(calc(var(--mk-gi) * -1))}}",
  );

  // All three layers derive from one metrics block — the tear only reads as chromatic
  // aberration if the copies sit exactly on top of each other.
  const metrics = textStyle({
    fontSize: num(cfg.fontSize, 64),
    maxVw: 12,
    weight: str(cfg.fontWeight, "800"),
    spacing: num(cfg.letterSpacing, 0.08),
  });

  const holder = el("position:relative;display:inline-block");
  holder.style.setProperty("--mk-gi", `${num(cfg.intensity, 4)}px`);

  const base = el([...metrics, `color:${str(cfg.baseColor, "#ffffff")}`]);
  base.textContent = text;
  holder.appendChild(base);

  [
    [str(cfg.shiftColorA, "#ff2e63"), "mk-pl-glitch-a"],
    [str(cfg.shiftColorB, "#00fff0"), "mk-pl-glitch-b"],
  ].forEach(([color, anim]) => {
    const layer = el([
      ...metrics,
      "position:absolute",
      "left:0",
      "top:0",
      "width:100%",
      `color:${color}`,
      `animation:${anim} ${0.9 / speed}s steps(2,end) infinite`,
    ]);
    layer.textContent = text;
    holder.appendChild(layer);
  });

  visual.appendChild(holder);
  return {};
}
