import { pickDeviceConfig } from "./merge.js";
import { isScrollTriggerActive, isStepActive } from "./filter.js";

export function findTimelineById(anim, id) {
  if (!id) return null;
  const tl = anim?.timeline;
  return tl && tl.id === id ? tl : null;
}

// Walk the timeline's animations to find a step by id. Used in no-timeline
// mode (anim.isTimelineEnabled === false), where a ScrollTrigger's `timeline`
// field routes to a step id rather than a timeline id.
export function findStepById(anim, id) {
  if (!id) return null;
  for (const step of anim?.timeline?.animations || []) {
    if (step.id === id) return step;
  }
  return null;
}

// For on_scroll anims: returns [{ st, cfg, tl }] for every enabled scroll
// trigger whose per-device config routes to a real timeline.
export function findRoutedScrollTriggers(anim, deviceKey) {
  const out = [];
  for (const st of anim?.trigger?.scrollTrigger || []) {
    if (!isScrollTriggerActive(st)) continue;
    const cfg = pickDeviceConfig(st.devices, deviceKey);
    if (!cfg) continue;
    const tl = findTimelineById(anim, cfg.timeline);
    if (!tl) continue;
    out.push({ st, cfg, tl });
  }
  return out;
}

// No-timeline counterpart of findRoutedScrollTriggers: each enabled scroll
// trigger's per-device cfg.animation holds a STEP id, so we resolve to the step
// and the caller builds a standalone tween per routed step.
export function findRoutedStepTriggers(anim, deviceKey) {
  const out = [];
  for (const st of anim?.trigger?.scrollTrigger || []) {
    if (!isScrollTriggerActive(st)) continue;
    const cfg = pickDeviceConfig(st.devices, deviceKey);
    if (!cfg) continue;
    // `all` routes this single scroll trigger to every active step, so one trigger drives all of the animation's effects.
    if (cfg.animation === "all") {
      for (const step of anim?.timeline?.animations || []) {
        if (!isStepActive(step)) continue;
        out.push({ st, cfg, step });
      }
      continue;
    }
    const step = findStepById(anim, cfg.animation);
    if (!step || !isStepActive(step)) continue;
    out.push({ st, cfg, step });
  }
  return out;
}
