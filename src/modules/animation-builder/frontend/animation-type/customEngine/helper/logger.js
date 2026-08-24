import { isEditorPreviewMode } from "../customRegistry.js";

/* global __MOTIONKIT_DEV_LOG__ */

// Build-time flag from webpack DefinePlugin, driven by the MOTIONKIT_DEV_LOG env var (see .env / .env.example). Now only a fallback — the same var is also read at runtime by PHP (Helper::is_dev_log) and passed through as motionkitData.dev_log, so prefer toggling that and skip the rebuild. Baking it true still forces logs on for a dev bundle. The typeof guard keeps the module safe if the define is absent (e.g. running the source unbundled).
const DEV_LOG =
  typeof __MOTIONKIT_DEV_LOG__ !== "undefined" && __MOTIONKIT_DEV_LOG__ === true;

// Live "MOTIONKIT GSAP ENGINE" logger for custom-engine animations. Fires each time an animation actually begins running — a timeline/tween onStart, or a ScrollTrigger entering its active range — so the console reflects what is animating live rather than merely what got built. Logs the editor-side identity (timeline + animation) plus the resolved ScrollTrigger data so a running animation can be traced straight back to its config.

// Gate logging so it never spams a public customer site console. Resolution order, first match wins:
//   1. window.__motionkitRunLog — manual console override, `true` force-enables anywhere and `false` silences.
//   2. motionkitData.dev_log    — runtime flag PHP reads from .env per request, so toggling MOTIONKIT_DEV_LOG needs no rebuild.
//   3. DEV_LOG                  — the build-time define, kept so existing dev bundles keep logging unchanged.
//   4. editor preview.
function loggingEnabled() {
  if (typeof window === "undefined") return false;
  if (window.__motionkitRunLog != null) return !!window.__motionkitRunLog;
  if (window.motionkitData?.dev_log) return true;
  return DEV_LOG || isEditorPreviewMode();
}

// Gated general-purpose console log for customEngine internals (e.g. step-apply tracing). Routes ad-hoc debugging through the same env/editor gate so it never reaches a production console.
export function debugLog(label, payload) {
  if (!loggingEnabled()) return;
  console.log(label, payload);
}

function emit(info) {
  if (!loggingEnabled()) return;
  console.log("MOTIONKIT GSAP ENGINE =>", {
    "Animation Title": info?.animationData?.title ?? null,
    "timeline id": info.timelineId ?? null,
    "timeline data": info.timelineData ?? null,
    "animation id": info.animationId ?? null,
    "animation data": info.animationData ?? null,
    "scroll trigger data": info.scrollTriggerData ?? null,
  });
}

// Per-tween completion log — companion to the onStart run log above. Fires when a tween finishes so the console shows the full lifecycle (start → complete) of each step's animation. `info` is the step's stamped `data` object, so it carries the same anim/timeline/step identity used everywhere else.
function emitComplete(info) {
  if (!loggingEnabled()) return;
  console.log("MOTIONKIT GSAP ENGINE (COMPLETE) =>", {
    "Animation Title": info?.animationData?.title ?? null,
    "animation id": info?.animationId ?? null,
    "animation title": info?.animationTitle ?? null,
    "timeline id": info?.timelineId ?? null,
    "step id": info?.stepId ?? null,
    "step title": info?.stepTitle ?? null,
    method: info?.method ?? null,
  });
}

// Chain an onComplete logger onto a step's tween vars BEFORE the handler builds the tween, so every step's tween logs when it finishes. Any onComplete the editor config already set runs first, then ours. Returns vars UNCHANGED when logging is off, so production stamped vars stay callback-free (zero overhead). For fromTo the caller passes vars.to, since GSAP builds the tween from the `to` bucket.
export function withCompletion(vars, info) {
  if (!loggingEnabled() || !vars || typeof vars !== "object") return vars;
  const prev = typeof vars.onComplete === "function" ? vars.onComplete : null;
  return {
    ...vars,
    onComplete(...args) {
      if (prev) prev.apply(this, args);
      emitComplete(info);
    },
  };
}

// Chain an onStart logger onto a built GSAP timeline/tween without clobbering an existing onStart — the editor's own callback (if any) still runs, then ours. Used for page_load / click / hover where there is no ScrollTrigger, so scrollTriggerData is null.
export function attachPlayLogger(animation, info) {
  if (!animation || !loggingEnabled()) return animation;
  const prev = animation.eventCallback("onStart");
  animation.eventCallback("onStart", function (...args) {
    if (typeof prev === "function") prev.apply(this, args);
    emit({ ...info, scrollTriggerData: null });
  });
  return animation;
}

// Chain an onToggle logger into a ScrollTrigger config object BEFORE it is handed to GSAP — instance-level wrapping isn't reliable, so we wrap the config. We log only when the trigger enters its active range (self.isActive) and pass the live ScrollTrigger instance, which carries start/end/progress/direction, as the scroll trigger data.
export function withScrollLogger(scrollCfg, info) {
  if (!scrollCfg || !loggingEnabled()) return scrollCfg;
  const prev = scrollCfg.onToggle;
  scrollCfg.onToggle = function (self) {
    if (typeof prev === "function") prev.call(this, self);
    if (self?.isActive) emit({ ...info, scrollTriggerData: self });
  };
  return scrollCfg;
}
