import { injectCss, num, str, el } from "./shared.js";

// ── 10. Morph Blob ────────────────────────────────────────────
// Pure CSS border-radius morphing — deliberately independent of the MorphSVG plugin so
// the preset works regardless of which GSAP plugins a site has enabled.
export default function morphBlob({ visual }, cfg) {
  const size = num(cfg.blobSize, 120);
  const speed = Math.max(0.2, num(cfg.morphSpeed, 1));
  const blur = num(cfg.blur, 0);

  injectCss(
    "morphblob",
    "@keyframes mk-pl-morph{0%,100%{border-radius:42% 58% 63% 37%/41% 44% 56% 59%}" +
      "34%{border-radius:66% 34% 38% 62%/58% 63% 37% 42%}" +
      "67%{border-radius:38% 62% 55% 45%/62% 38% 62% 38%}}",
  );

  visual.appendChild(
    el([
      `width:${size}px`,
      `height:${size}px`,
      `background:${str(cfg.blobColor, "#ffffff")}`,
      `animation:mk-pl-morph ${4 / speed}s ease-in-out infinite`,
      blur > 0 ? `filter:blur(${blur}px)` : "",
    ]),
  );
  return {};
}
