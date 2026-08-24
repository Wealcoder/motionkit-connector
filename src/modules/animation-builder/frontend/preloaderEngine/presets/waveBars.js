import { buildRow, injectCss, num, str } from "./shared.js";

// ── 7. Wave Bars ──────────────────────────────────────────────
export default function waveBars({ visual }, cfg) {
  const count = Math.max(2, Math.min(16, num(cfg.barCount, 5)));
  const width = num(cfg.barWidth, 6);
  const gap = num(cfg.gap, 6);
  const maxHeight = num(cfg.maxHeight, 48);
  const dur = Math.max(0.2, num(cfg.waveDuration, 0.9));

  injectCss(
    "wavebars",
    "@keyframes mk-pl-wave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}",
  );

  visual.appendChild(
    buildRow({
      count,
      gap,
      height: maxHeight,
      align: "center",
      styleFor: (i) => [
        `width:${width}px`,
        `height:${maxHeight}px`,
        `background:${str(cfg.barColor, "#ffffff")}`,
        "border-radius:2px",
        `animation:mk-pl-wave ${dur}s ease-in-out ${(i * dur) / count / 2}s infinite`,
      ],
    }),
  );
  return {};
}
