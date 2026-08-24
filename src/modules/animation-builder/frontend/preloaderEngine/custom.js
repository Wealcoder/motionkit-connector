// Custom mode — the user assembles a preloader from toggleable parts, each coloured and
// sized through ordinary editor fields. Everything here is plain data; there is no code
// evaluation, and no dependency on the preset builders (their field names differ
// deliberately, so the two can evolve independently).

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const str = (v, fallback) => (typeof v === "string" && v !== "" ? v : fallback);

const CUSTOM_STYLE_ID = "motionkit-preloader-custom-style";

const ensureCustomCss = () => {
  if (document.getElementById(CUSTOM_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = CUSTOM_STYLE_ID;
  el.textContent =
    "@keyframes mk-pl-custom-spin{to{transform:rotate(360deg)}}";
  (document.head || document.documentElement).appendChild(el);
};

export function buildCustom({ visual }, cfg) {
  const ticks = [];

  // Raw markup escape hatch, rendered above the assembled parts. Same admin-level trust
  // boundary as the page transition's overlay logo field — anyone who can edit Global
  // Settings can already place arbitrary content on every page.
  const markup = str(cfg.markup, "");
  if (markup) {
    const holder = document.createElement("div");
    holder.className = "mk-pl-custom-markup";
    holder.innerHTML = markup;
    visual.appendChild(holder);
  }

  const stack = document.createElement("div");
  stack.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:18px";
  visual.appendChild(stack);

  if (cfg.showSpinner) {
    ensureCustomCss();
    const size = num(cfg.spinnerSize, 48);
    const thickness = num(cfg.spinnerThickness, 3);
    const speed = Math.max(0.1, num(cfg.spinnerSpeed, 1));
    const el = document.createElement("div");
    el.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      "border-radius:50%",
      `border:${thickness}px solid ${str(cfg.spinnerTrackColor, "#ffffff26")}`,
      `border-top-color:${str(cfg.spinnerColor, "#ffffff")}`,
      "box-sizing:border-box",
      `animation:mk-pl-custom-spin ${1 / speed}s linear infinite`,
    ].join(";");
    stack.appendChild(el);
  }

  if (cfg.showBar) {
    const track = document.createElement("div");
    track.style.cssText = [
      `width:${num(cfg.barWidth, 240)}px`,
      "max-width:80vw",
      `height:${num(cfg.barHeight, 4)}px`,
      `background:${str(cfg.barTrackColor, "#ffffff26")}`,
      `border-radius:${num(cfg.barRadius, 4)}px`,
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
    stack.appendChild(track);
    ticks.push((p) => {
      fill.style.width = `${Math.round(p * 100)}%`;
    });
  }

  if (cfg.showPercent) {
    const suffix =
      typeof cfg.percentSuffix === "string" ? cfg.percentSuffix : "%";
    const el = document.createElement("div");
    el.style.cssText = [
      `font-size:${num(cfg.percentSize, 16)}px`,
      `color:${str(cfg.percentColor, "#ffffff")}`,
      "line-height:1",
      "font-variant-numeric:tabular-nums",
    ].join(";");
    el.textContent = `0${suffix}`;
    stack.appendChild(el);
    ticks.push((p) => {
      el.textContent = `${Math.round(p * 100)}${suffix}`;
    });
  }

  return {
    tick(p) {
      for (let i = 0; i < ticks.length; i++) {
        try {
          ticks[i](p);
        } catch (e) {
          /* one broken part must not stall the rest */
        }
      }
    },
  };
}

/**
 * Intro animation for the assembled content. GSAP when available, CSS transition
 * otherwise — the preloader must never depend on GSAP having arrived.
 */
export function playIntro(content, cfg) {
  const effect = str(cfg.introEffect, "fade");
  if (effect === "none" || !content) return;

  const duration = Math.max(0, num(cfg.introDuration, 0.5));
  const delay = Math.max(0, num(cfg.introDelay, 0));
  const ease = str(cfg.introEase, "power2.out");
  const gsap = typeof window !== "undefined" ? window.gsap : null;

  const FROM = {
    fade: { opacity: 0 },
    slideUp: { opacity: 0, y: 24 },
    scale: { opacity: 0, scale: 0.9 },
    blur: { opacity: 0, filter: "blur(12px)" },
  };
  const from = FROM[effect] || FROM.fade;

  if (gsap) {
    gsap.from(content, { ...from, duration, delay, ease });
    return;
  }

  const CSS_FROM = {
    fade: { opacity: "0" },
    slideUp: { opacity: "0", transform: "translateY(24px)" },
    scale: { opacity: "0", transform: "scale(0.9)" },
    blur: { opacity: "0", filter: "blur(12px)" },
  };
  Object.assign(content.style, CSS_FROM[effect] || CSS_FROM.fade);
  content.style.transition = `opacity ${duration}s ease-out ${delay}s, transform ${duration}s ease-out ${delay}s, filter ${duration}s ease-out ${delay}s`;
  requestAnimationFrame(() => {
    content.style.opacity = "1";
    content.style.transform = "none";
    content.style.filter = "none";
  });
}
