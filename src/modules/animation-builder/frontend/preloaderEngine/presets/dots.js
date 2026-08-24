import { buildRow, injectCss, num, str } from "./shared.js";

// ── 6. Bouncing Dots ──────────────────────────────────────────
export default function dots({ visual }, cfg) {
  const count = Math.max(1, Math.min(10, num(cfg.dotCount, 3)));
  const size = num(cfg.dotSize, 12);
  const gap = num(cfg.gap, 14);
  const height = num(cfg.bounceHeight, 18);
  const dur = Math.max(0.1, num(cfg.bounceDuration, 0.5));

  injectCss(
    "dots",
    `@keyframes mk-pl-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-${height}px)}}`,
  );

  visual.appendChild(
    buildRow({
      count,
      gap,
      height: size + height,
      align: "flex-end",
      styleFor: (i) => [
        `width:${size}px`,
        `height:${size}px`,
        "border-radius:50%",
        `background:${str(cfg.dotColor, "#ffffff")}`,
        `animation:mk-pl-bounce ${dur * 2}s ease-in-out ${(i * dur) / count}s infinite`,
      ],
    }),
  );
  return {};
}
