export function isStepActive(step) {
  return !!step && step.disabled !== true;
}

export function isScrollTriggerActive(st) {
  return !!st && st.disabled !== true;
}
