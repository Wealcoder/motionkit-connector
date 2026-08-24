import { num, str, SVG_NS } from "./shared.js";

// ── Progress Ring ─────────────────────────────────────────────
// Real progress on a circle. Uses stroke-dashoffset rather than a rotating mask so the
// arc is exact at every value, not an approximation that snaps at the end.
export default function progressRing({ visual }, cfg) {
  const size = num(cfg.ringSize, 132);
  const thickness = num(cfg.thickness, 6);
  const radius = Math.max(1, (size - thickness) / 2);
  const circumference = 2 * Math.PI * radius;

  const holder = document.createElement("div");
  holder.style.cssText = `position:relative;width:${size}px;height:${size}px`;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  // Rotate so the arc starts at 12 o'clock instead of 3.
  svg.style.cssText = "display:block;transform:rotate(-90deg)";

  const mkCircle = (stroke) => {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", String(size / 2));
    c.setAttribute("cy", String(size / 2));
    c.setAttribute("r", String(radius));
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", stroke);
    c.setAttribute("stroke-width", String(thickness));
    return c;
  };

  svg.appendChild(mkCircle(str(cfg.trackColor, "#ffffff1f")));

  const arc = mkCircle(str(cfg.ringColor, "#7c5cff"));
  arc.setAttribute("stroke-linecap", "round");
  arc.setAttribute("stroke-dasharray", String(circumference));
  arc.setAttribute("stroke-dashoffset", String(circumference));
  arc.style.transition = "stroke-dashoffset .12s linear";
  if (cfg.glow) {
    arc.style.filter = `drop-shadow(0 0 10px ${str(cfg.glowColor, "#7c5cff80")})`;
  }
  svg.appendChild(arc);
  holder.appendChild(svg);

  let label = null;
  if (cfg.showPercent !== false) {
    label = document.createElement("div");
    label.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      `color:${str(cfg.percentColor, "#ffffff")}`,
      `font-size:${num(cfg.percentSize, 28)}px`,
      "font-weight:700",
      "line-height:1",
      "font-variant-numeric:tabular-nums",
    ].join(";");
    label.textContent = "0%";
    holder.appendChild(label);
  }

  visual.appendChild(holder);

  return {
    tick(p) {
      arc.setAttribute("stroke-dashoffset", String(circumference * (1 - p)));
      if (label) label.textContent = `${Math.round(p * 100)}%`;
    },
  };
}
