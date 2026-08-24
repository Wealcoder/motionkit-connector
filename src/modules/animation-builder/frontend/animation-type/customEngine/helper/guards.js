// Anim-shape predicates shared across the trigger handlers and the entry point.

export function isCustomAnimation(anim) {
  return (
    anim != null &&
    typeof anim === "object" &&
    (anim.group === "custom_animation" || anim.group === "cloud_trigger") &&
    anim.timeline != null &&
    typeof anim.timeline === "object"
  );
}

// isTimelineEnabled gates the build strategy. Absent (legacy animations) or
// true → shared-timeline mode (current behavior): all steps share one timeline
// and a single ScrollTrigger routes by timeline id. Explicit false → each step
// builds as its own standalone tween and ScrollTriggers route by step id.
export function isTimelineEnabledFor(anim) {
  return anim.isTimelineEnabled !== false;
}
