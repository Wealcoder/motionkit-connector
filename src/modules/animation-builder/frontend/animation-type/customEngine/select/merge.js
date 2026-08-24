export function pickDeviceConfig(bag, deviceKey) {
  if (!bag || typeof bag !== "object") return null;
  return bag[deviceKey] || null;
}

// The CodeblockField emits a `custom` object of free-form GSAP props parsed from the user's code (e.g. { fontSize: "24px" }). GSAP wouldn't animate a literal `custom` key, so we spread it into the tween vars. `custom` goes FIRST so an explicit field of the same name (duration, ease, x, ...) overrides the custom entry — the dedicated control wins over a duplicate typed into the code block.
function flattenCustom(vars) {
  if (!vars || typeof vars !== "object") return vars;
  if (!vars.custom || typeof vars.custom !== "object") return vars;
  const { custom, ...rest } = vars;
  return { ...custom, ...rest };
}

// Editor emits step.vars in method-specific envelope:
//   from/to/set  →  { from: {...} } / { to: {...} } / { set: {...} }
//   fromTo       →  { from: {...}, to: {...} }
//   call         →  { call: { fn, args } } or raw
// Returns the unwrapped GSAP-ready vars, or null when nothing meaningful.
export function normalizeStepVars(step) {
  if (!step) return null;
  const v = step.vars || {};
  switch (step.method) {
    case "from":
    case "to":
    case "set": {
      const vars = v[step.method] || {};
      return Object.keys(vars).length ? flattenCustom(vars) : null;
    }
    case "fromTo": {
      const from = v.from || {};
      const to = v.to || {};
      if (!Object.keys(from).length && !Object.keys(to).length) return null;
      return { from: flattenCustom(from), to: flattenCustom(to) };
    }
    case "call":
      return v.call || v;
    case "scrollTo": {
      const vars = v[step.method] || v;
      return vars && Object.keys(vars).length
        ? flattenCustom(vars)
        : { autoKill: true };
    }
    default: {
      const vars = v[step.method] || v;
      return vars && Object.keys(vars).length ? flattenCustom(vars) : null;
    }
  }
}
