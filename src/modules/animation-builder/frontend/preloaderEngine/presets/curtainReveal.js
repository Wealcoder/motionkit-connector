import { num, str } from "./shared.js";

// ── 5. Curtain Reveal ─────────────────────────────────────────
// The panels ARE the cover, so this preset supplies its own exit animation.
export default function curtainReveal({ root }, cfg) {
  const count = Math.max(1, Math.min(12, num(cfg.panelCount, 3)));
  const color = str(cfg.panelColor, "#0a0a0a");
  const direction = str(cfg.direction, "up");
  const stagger = Math.max(0, num(cfg.panelStagger, 0.08));
  const vertical = direction === "up" || direction === "down";

  const layer = document.createElement("div");
  layer.style.cssText = "position:absolute;inset:0;z-index:-1;display:flex;" +
    (vertical ? "flex-direction:row" : "flex-direction:column");

  const panels = [];
  for (let i = 0; i < count; i++) {
    const panel = document.createElement("div");
    panel.style.cssText = `flex:1 1 auto;background:${color}`;
    layer.appendChild(panel);
    panels.push(panel);
  }
  root.style.background = "transparent";
  root.appendChild(layer);

  const offset = {
    up: "translateY(-101%)",
    down: "translateY(101%)",
    left: "translateX(-101%)",
    right: "translateX(101%)",
  }[direction] || "translateY(-101%)";

  return {
    revealOverride(_root, reveal, done) {
      const gsap = typeof window !== "undefined" ? window.gsap : null;
      const dur = reveal.duration;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        done();
      };

      if (gsap) {
        const vars = { duration: dur, ease: reveal.ease, stagger };
        if (vertical) vars.yPercent = direction === "up" ? -101 : 101;
        else vars.xPercent = direction === "left" ? -101 : 101;
        gsap.to(panels, { ...vars, onComplete: finish });
        setTimeout(finish, (dur + stagger * count) * 1000 + 200);
        return;
      }

      panels.forEach((panel, i) => {
        panel.style.transition = `transform ${dur}s ease-in-out ${i * stagger}s`;
      });
      requestAnimationFrame(() => {
        panels.forEach((panel) => {
          panel.style.transform = offset;
        });
      });
      setTimeout(finish, (dur + stagger * count) * 1000 + 80);
    },
  };
}
