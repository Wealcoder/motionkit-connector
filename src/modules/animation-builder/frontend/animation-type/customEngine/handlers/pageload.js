import { buildTimeline } from "../mbuild/timeline.js";
import { buildStepTweens } from "../mbuild/tween.js";
import { attachPlayLogger } from "../helper/logger.js";
import { registerTimeline, isEditorPreviewMode } from "../customRegistry.js";
import { isTimelineEnabledFor } from "../helper/guards.js";
import { presplitSteps } from "../extensions/splitText.js";

export function buildPageloadAnim(anim) {
  const editorMode = isEditorPreviewMode();
  const timelineEnabled = isTimelineEnabledFor(anim);
  const tlCfg = anim.timeline;
  presplitSteps(anim.id, tlCfg?.animations);
  const ctx = gsap.context((self) => {
    if (!tlCfg) return;
    // Editor preview builds paused so DevTools owns playback; public builds auto-play.
    const extra = editorMode ? { paused: true } : undefined;

    if (timelineEnabled) {
      const tl = buildTimeline(tlCfg, extra, {
        animationId: anim.id,
        animationTitle: anim.title,
        ctx: self,
      });
      attachPlayLogger(tl, {
        timelineId: tlCfg.id,
        timelineData: tlCfg,
        animationId: anim.id,
        animationData: anim,
      });
      if (editorMode && tl) {
        registerTimeline(anim.id, tl);
      }
      return;
    }

    (tlCfg.animations || []).forEach((step) => {
      const tweens = buildStepTweens(step, extra, {
        animationId: anim.id,
        animationTitle: anim.title,
        ctx: self,
      });
      tweens.forEach((t) =>
        attachPlayLogger(t, {
          timelineId: null,
          timelineData: null,
          animationId: anim.id,
          animationData: anim,
        }),
      );
      if (editorMode) {
        tweens.forEach((t) => registerTimeline(anim.id, t));
      }
    });
  });
  return { contexts: [ctx], listeners: [] };
}
