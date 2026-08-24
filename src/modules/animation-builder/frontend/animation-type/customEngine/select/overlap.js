// `overlap` is the GSAP timeline POSITION parameter (last arg to to/from/set/
// fromTo/call/add) — not a tween property. Editor stores it inside the method
// envelope alongside x/opacity (isCustomAnim=true), so we strip it from vars
// here and let each handler pass it through as the position arg.
//
// Supported notations (passed through verbatim to GSAP):
//   "+=1", "-=1"            relative offset from end of timeline
//   "1.5"                   absolute time (parsed to Number)
//   "myLabel"               label
//   "myLabel+=2"            label + relative offset
//   "<", ">"                start/end of previous tween
//   "<-2", ">+0.5"          relative to previous tween bounds
//   "+=i*0.1"               stagger expression (only meaningful in stagger contexts)
export function extractOverlap(step, vars) {
  if (!vars || typeof vars !== "object") {
    return { vars, overlap: undefined };
  }

  if (step.method === "fromTo") {
    let value;
    let next = vars;
    if (vars.to && "overlap" in vars.to) {
      value = vars.to.overlap;
      const { overlap: _t, ...to } = vars.to;
      next = { ...next, to };
    }
    if (vars.from && "overlap" in vars.from) {
      // `to.overlap` wins; from.overlap is only a fallback
      if (value === undefined) value = vars.from.overlap;
      const { overlap: _f, ...from } = vars.from;
      next = { ...next, from };
    }
    return { vars: next, overlap: normalizeOverlap(value) };
  }

  if (!("overlap" in vars)) return { vars, overlap: undefined };
  const { overlap, ...rest } = vars;
  return { vars: rest, overlap: normalizeOverlap(overlap) };
}

// Numeric strings ("1.5") become Numbers so GSAP treats them as absolute
// time. Empty string / null means "use default" (end of timeline).
function normalizeOverlap(value) {
  if (value === "" || value == null) return undefined;
  if (typeof value === "string" && /^-?\d*\.?\d+$/.test(value.trim())) {
    return parseFloat(value);
  }
  return value;
}
