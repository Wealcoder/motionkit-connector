import { num, str, el } from "./shared.js";

// ── 3. Number Counter ─────────────────────────────────────────
export default function counter({ visual }, cfg) {
  const from = num(cfg.countFrom, 0);
  const to = num(cfg.countTo, 100);
  const suffix = typeof cfg.suffix === "string" ? cfg.suffix : "%";

  const readout = el([
    `font-size:${num(cfg.fontSize, 72)}px`,
    `font-weight:${str(cfg.fontWeight, "700")}`,
    `color:${str(cfg.color, "#ffffff")}`,
    "line-height:1",
    "font-variant-numeric:tabular-nums",
  ]);
  readout.textContent = `${Math.round(from)}${suffix}`;
  visual.appendChild(readout);

  return {
    tick(p) {
      readout.textContent = `${Math.round(from + (to - from) * p)}${suffix}`;
    },
  };
}
