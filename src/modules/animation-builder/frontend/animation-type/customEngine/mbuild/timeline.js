import { applyStep } from "./step.js";

// Spread order: editor tlCfg.vars (repeat, paused, ...) first, then extra
// config from the caller (scrollTrigger, paused override for click/hover)
// so extras win.
//
// `animContext` carries identity info DevTools needs to map a tween back to
// its editor-side config. It rides on tl.vars.data and is inherited by every
// step's tween.vars.data via applyStep.
export function buildTimeline(tlCfg, extraConfig, animContext = {}) {
  const tlVars = {
    ...(tlCfg?.vars || {}),
    ...(extraConfig || {}),
    id: tlCfg?.id,
    data: {
      animationId: animContext.animationId || null,
      animationTitle: animContext.animationTitle || null,
      timelineId: tlCfg?.id || null,
      timelineTitle: tlCfg?.title || null,
      // ScrollTrigger owns this timeline's playhead — DevTools must not
      // compose it into its master (that would reparent it away from ST).
      scrollDriven: !!animContext.scrollDriven,
    },
  };
  const tl = gsap.timeline(tlVars);
  // Kept off vars.data — that object is stamped onto every tween and read by DevTools.
  tl.__mkCtx = animContext.ctx || null;
  for (const step of tlCfg?.animations || []) {
    applyStep(tl, step);
  }
  return tl;
}
