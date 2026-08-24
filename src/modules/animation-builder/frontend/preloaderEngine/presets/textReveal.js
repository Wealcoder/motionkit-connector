import { injectCss, num, str } from "./shared.js";

// ── 9. Text Reveal ────────────────────────────────────────────
export default function textReveal({ visual }, cfg) {
  const text = str(cfg.text, "Loading");
  const mode = str(cfg.mode, "stagger");
  const stagger = Math.max(0, num(cfg.staggerAmount, 0.05));

  const wrap = document.createElement("div");
  wrap.style.cssText = [
    `font-size:${num(cfg.fontSize, 42)}px`,
    `font-weight:${str(cfg.fontWeight, "700")}`,
    `letter-spacing:${num(cfg.letterSpacing, 0.2)}em`,
    `color:${str(cfg.color, "#ffffff")}`,
    "line-height:1.1",
    "position:relative",
    "white-space:pre-wrap",
  ].join(";");

  if (mode === "mask") {
    injectCss(
      "textmask",
      "@keyframes mk-pl-maskwipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}",
    );
    wrap.textContent = text;
    wrap.style.animation = `mk-pl-maskwipe ${Math.max(0.4, text.length * stagger)}s ease-in-out infinite alternate`;
    visual.appendChild(wrap);
    return {};
  }

  // typewriter + stagger both need per-character spans.
  const chars = Array.from(text);
  const spans = chars.map((ch) => {
    const span = document.createElement("span");
    span.textContent = ch === " " ? " " : ch;
    span.style.display = "inline-block";
    return span;
  });

  if (mode === "typewriter") {
    spans.forEach((s) => {
      s.style.opacity = "0";
    });
    spans.forEach((s) => wrap.appendChild(s));
    visual.appendChild(wrap);
    return {
      tick(p) {
        const shown = Math.round(p * spans.length);
        for (let i = 0; i < spans.length; i++) {
          spans[i].style.opacity = i < shown ? "1" : "0";
        }
      },
    };
  }

  injectCss(
    "textstagger",
    "@keyframes mk-pl-letter{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-8px);opacity:1}}",
  );
  spans.forEach((s, i) => {
    s.style.animation = `mk-pl-letter 1.4s ease-in-out ${i * stagger}s infinite`;
    wrap.appendChild(s);
  });
  visual.appendChild(wrap);
  return {};
}
