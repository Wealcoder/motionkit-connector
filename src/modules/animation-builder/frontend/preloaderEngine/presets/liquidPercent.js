import { injectCss, num, str, clamp01, supports } from "./shared.js";

// ── Liquid Percentage ─────────────────────────────────────────
// Full-screen film grain behind a big outlined percentage that fills from the bottom like
// water in a glass.
//
// Two stacked copies of the same glyphs, both laid out from the same origin so they
// register exactly: the lower one is stroked with a transparent fill, the upper one is
// solid and clipped to a wavy waterline that rises with real progress. Clipping the fill
// layer — rather than masking the outline — means the outline stays crisp at every value.
//
// The grain is an inline feTurbulence SVG, not an image: zero extra requests during the
// one moment on the page where bandwidth is most contended. It jitters via a composited
// transform on a steps() keyframe, so the texture animates without ever repainting.
const GRAIN_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E" +
  "%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E" +
  "%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E" +
  "%3Crect width='320' height='320' filter='url(%23g)'/%3E%3C/svg%3E";

const WAVE_STEPS = 14;

export default function liquidPercent({ visual, content, root }, cfg) {
  const size = Math.max(24, num(cfg.digitSize, 220));
  const strokeWidth = Math.max(0.5, num(cfg.strokeWidth, 1.5));
  const outlineColor = str(cfg.outlineColor, "#ffffffb3");
  const fillColor = str(cfg.fillColor, "#ffffff");
  const weight = str(cfg.digitWeight, "700");
  const showSymbol = cfg.showSymbol !== false;
  const waveOn = cfg.wave !== false;
  const waveAmount = Math.max(0, num(cfg.waveAmount, 2.4));

  injectCss(
    "liquidPercent",
    `
@keyframes mk-pl-grain{
0%,100%{transform:translate(0,0)}
10%{transform:translate(-2%,-4%)}
20%{transform:translate(-7%,2%)}
30%{transform:translate(4%,-5%)}
40%{transform:translate(-3%,5%)}
50%{transform:translate(-7%,3%)}
60%{transform:translate(5%,0)}
70%{transform:translate(0,6%)}
80%{transform:translate(2%,4%)}
90%{transform:translate(-4%,-2%)}}
.mk-pl-grain{position:absolute;top:-25%;left:-25%;width:150%;height:150%;pointer-events:none;
background-image:url("${GRAIN_URI}");background-repeat:repeat;mix-blend-mode:screen}
.mk-pl-grain.is-animated{animation:mk-pl-grain .8s steps(1) infinite}
.mk-pl-lq{position:relative;display:inline-block;line-height:.85;white-space:nowrap;
font-family:inherit;font-variant-numeric:tabular-nums}
.mk-pl-lq-in{position:absolute;left:0;top:0}
.mk-pl-lq-dots{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.mk-pl-lq-dot{position:absolute;border-radius:50%;opacity:.35;transform:translate(-50%,-50%);
animation-name:mk-pl-lq-blink;animation-iteration-count:infinite;animation-timing-function:ease-in-out}
@keyframes mk-pl-lq-blink{
0%,100%{opacity:.06;transform:translate(-50%,-50%) scale(.5)}
50%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
`.trim(),
  );

  // Both the grain and the dot field are full-screen layers hung off the cover root, and
  // both are appended after buildChrome has already run. Without an explicit order they
  // would paint over the number, so the content stack — and a pinned readout, which also
  // lives on the root — gets lifted above them.
  let lifted = false;
  const liftContent = () => {
    if (lifted) return;
    lifted = true;
    content.style.position = "relative";
    content.style.zIndex = "1";
    const pinned = root.querySelector(".mk-pl-readout-wrap");
    if (pinned) pinned.style.zIndex = "1";
  };

  if (cfg.grain !== false) {
    const grain = document.createElement("div");
    grain.className =
      "mk-pl-grain" + (cfg.grainAnimate !== false ? " is-animated" : "");
    grain.style.opacity = String(clamp01(num(cfg.grainOpacity, 0.5)));
    root.appendChild(grain);
    liftContent();
  }

  const holder = document.createElement("div");
  holder.className = "mk-pl-lq";
  holder.style.cssText = `font-size:min(${size}px,34vw);font-weight:${weight}`;

  const outlineLayer = document.createElement("div");
  outlineLayer.className = "mk-pl-lq-out";
  if (supports("-webkit-text-stroke-width", "1px")) {
    outlineLayer.style.color = "transparent";
    outlineLayer.style.webkitTextStrokeWidth = `${strokeWidth}px`;
    outlineLayer.style.webkitTextStrokeColor = outlineColor;
  } else {
    // Without text-stroke a transparent fill would render nothing at all. Degrade to a
    // faint solid number: less striking, still legible.
    outlineLayer.style.color = outlineColor;
    outlineLayer.style.opacity = "0.4";
  }
  holder.appendChild(outlineLayer);

  // Same reasoning for clip-path: unsupported means the fill layer would sit there fully
  // opaque from the first frame, hiding the effect. Drop it and let the outline count.
  const canClip = supports("clip-path", "inset(50% 0 0 0)");
  let fillLayer = null;
  if (canClip) {
    fillLayer = document.createElement("div");
    fillLayer.className = "mk-pl-lq-in";
    fillLayer.style.color = fillColor;
    holder.appendChild(fillLayer);
  }

  visual.appendChild(holder);

  const setText = (text) => {
    outlineLayer.textContent = text;
    if (fillLayer) fillLayer.textContent = text;
  };
  setText(showSymbol ? "0%" : "0");

  // ── Blinking dot field ───────────────────────────────────────
  // Twinkling dots scattered over the whole overlay, kept clear of the number so nothing
  // ever blinks on top of the glyphs. Placement is rejection-sampled against a measured
  // exclusion box rather than z-ordered behind the text: the outline is transparent, so a
  // dot passing "behind" the number would show straight through it.
  if (cfg.showDots !== false) {
    const count = Math.max(0, Math.min(240, Math.round(num(cfg.dotCount, 70))));
    const dotSize = Math.max(1, num(cfg.dotSize, 3));
    const dotColor = str(cfg.dotColor, "#ffffff");
    const speed = Math.max(0.2, num(cfg.dotSpeed, 1.2));
    const pad = Math.max(0, num(cfg.dotClearance, 40));

    const vw = Math.max(1, window.innerWidth || 1);
    const vh = Math.max(1, window.innerHeight || 1);

    // Measure at the widest value the counter will ever show. The zone has to stay clear
    // at "100%", not just at the "0%" currently rendered.
    const shown = outlineLayer.textContent;
    outlineLayer.textContent = showSymbol ? "100%" : "100";
    let rect = null;
    try {
      rect = holder.getBoundingClientRect();
    } catch (e) {
      rect = null;
    }
    outlineLayer.textContent = shown;

    let zone;
    if (rect && rect.width > 1 && rect.height > 1) {
      zone = {
        x1: ((rect.left - pad) / vw) * 100,
        x2: ((rect.right + pad) / vw) * 100,
        y1: ((rect.top - pad) / vh) * 100,
        y2: ((rect.bottom + pad) / vh) * 100,
      };
    } else {
      // No layout yet — the engine can run from <head>, before <body> is even parsed.
      // Estimate a centred box from the font size rather than leave the number exposed.
      const fs = Math.min(size, vw * 0.34);
      const w = fs * 2.6;
      const h = fs * 0.95;
      zone = {
        x1: (((vw - w) / 2 - pad) / vw) * 100,
        x2: (((vw + w) / 2 + pad) / vw) * 100,
        y1: (((vh - h) / 2 - pad) / vh) * 100,
        y2: (((vh + h) / 2 + pad) / vh) * 100,
      };
    }

    const inZone = (x, y) =>
      x > zone.x1 && x < zone.x2 && y > zone.y1 && y < zone.y2;

    const field = document.createElement("div");
    field.className = "mk-pl-lq-dots";

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let tries = 0;
      do {
        x = Math.random() * 100;
        y = Math.random() * 100;
        tries += 1;
      } while (inZone(x, y) && tries < 12);
      // A very large clear zone can exhaust the retries. Dropping the dot keeps the
      // guarantee absolute — better one dot fewer than one over the percentage.
      if (inZone(x, y)) continue;

      // Mild size jitter around the configured size, so the field reads as scattered
      // rather than as a grid of identical circles.
      const px = Math.max(1, dotSize * (0.7 + Math.random() * 0.6));
      const dot = document.createElement("div");
      dot.className = "mk-pl-lq-dot";
      dot.style.cssText = [
        `left:${x.toFixed(2)}%`,
        `top:${y.toFixed(2)}%`,
        `width:${px.toFixed(1)}px`,
        `height:${px.toFixed(1)}px`,
        `background:${dotColor}`,
        // Independent duration and a negative delay per dot — otherwise all of them
        // pulse in lockstep, which reads as a strobe instead of a twinkle.
        `animation-duration:${(speed * (0.6 + Math.random() * 0.9)).toFixed(2)}s`,
        `animation-delay:-${(Math.random() * speed * 2).toFixed(2)}s`,
      ].join(";");
      field.appendChild(dot);
    }

    root.appendChild(field);
    liftContent();
  }

  const setClip = (value) => {
    fillLayer.style.clipPath = value;
    fillLayer.style.webkitClipPath = value;
  };

  // Phase advances per frame rather than off a clock, so the ripple speed is independent
  // of how long the page happens to take to load.
  let phase = 0;

  return {
    tick(p) {
      setText(showSymbol ? `${Math.round(p * 100)}%` : String(Math.round(p * 100)));
      if (!fillLayer) return;

      const level = (1 - p) * 100;
      if (!waveOn || waveAmount === 0) {
        setClip(`inset(${level}% 0 0 0)`);
        return;
      }

      phase += 0.11;
      // Flatten the ripple over the last stretch, or the surface would still be chopping
      // into the glyphs at 100%.
      const amp = waveAmount * Math.min(1, (1 - p) / 0.12);
      const points = [];
      for (let i = 0; i <= WAVE_STEPS; i++) {
        const ratio = i / WAVE_STEPS;
        const y = level + Math.sin(phase + ratio * Math.PI * 2.2) * amp;
        points.push(`${(ratio * 100).toFixed(1)}% ${y.toFixed(2)}%`);
      }
      points.push("100% 100%", "0% 100%");
      setClip(`polygon(${points.join(",")})`);
    },
  };
}
