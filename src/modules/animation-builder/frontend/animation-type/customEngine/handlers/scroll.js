import { buildTimeline } from "../mbuild/timeline.js";
import { buildStepTweens } from "../mbuild/tween.js";
import {
  buildScrollTriggerConfig,
  nonDefault,
} from "../mbuild/scrollTrigger.js";
import {
  findRoutedScrollTriggers,
  findRoutedStepTriggers,
} from "../select/find.js";
import { querySelectorAllCached } from "../scheduler.js";
import { withScrollLogger } from "../helper/logger.js";
import { detectDeviceKey } from "../helper/device.js";
import { isTimelineEnabledFor } from "../helper/guards.js";
import { registerTimeline, isEditorPreviewMode } from "../customRegistry.js";
import { claimTargets, setAnims } from "../ownership.js";
import { collectAnimatedElements } from "../helper/interactionTargets.js";
import { presplitSteps } from "../extensions/splitText.js";
import { decorateMarkers } from "../helper/markers.js";

// Register this scroll animation's built tweens/timelines as the initial
// owner of its animated elements. Without this, a click/hover animation
// sharing the same target (e.g. the same heading, split with a different
// SplitText config) never finds a previous owner to pause — its own build
// then reverts this scroll tween's still-live SplitText spans out from under
// it (see splitText.js's getSplitEntry), and the still-ticking scroll tween keeps
// fighting the incoming one for the same properties every frame. That
// property/visual tug-of-war is what reads as flicker. Runtime-only: editor
// preview never triggers this (DevTools owns playback), matching
// ownership.js's own "only the interaction handlers claim" contract.
function registerScrollOwnership(anim, built) {
  if (isEditorPreviewMode()) return;
  setAnims(anim.id, built);
  claimTargets(collectAnimatedElements(anim), anim.id);
}

export function buildScrollAnim(anim) {
  const deviceKey = detectDeviceKey();
  const editorMode = isEditorPreviewMode();

  if (!isTimelineEnabledFor(anim)) {
    const routedSteps = findRoutedStepTriggers(anim, deviceKey);
    if (!routedSteps.length) return null;
    // A default trigger resolves to itemClass, which may match many elements — one shared ScrollTrigger would fire the whole group the moment the FIRST element scrolls in, so split the step per element and anchor each to itself.
    // An explicit trigger keeps the group behavior: one trigger element intentionally drives every matched element together.
    const units = [];
    routedSteps.forEach(({ cfg, step }) => {
      if (!nonDefault(cfg.trigger)) {
        querySelectorAllCached(step.itemClass).forEach((el) =>
          units.push({ cfg, step: { ...step, itemClass: el }, trigger: el }),
        );
        return;
      }
      units.push({ cfg, step, trigger: step.itemClass });
    });

    // Splits must exist before the context opens, or ctx.revert() owns them — see presplitSteps.
    presplitSteps(
      anim.id,
      units.map((u) => u.step),
    );

    const built = [];
    // Non-timeline mode builds standalone tweens with no timeline to register — same as the non-timeline pageload path. Only the timeline-mode branch below registers with DevTools.
    const stepCtx = gsap.context((self) => {
      units.forEach(({ cfg, step, trigger }) => {
        const scrollCfg = withScrollLogger(
          buildScrollTriggerConfig(cfg, trigger),
          {
            timelineId: null,
            timelineData: null,
            animationId: anim.id,
            animationData: anim,
          },
        );
        built.push(
          ...buildStepTweens(
            step,
            { scrollTrigger: scrollCfg },
            {
              animationId: anim.id,
              animationTitle: anim.title,
              ctx: self,
            },
          ),
        );
      });
    });
    registerScrollOwnership(anim, built);
    decorateMarkers(built, anim.title);
    return { contexts: [stepCtx], listeners: [] };
  }

  const routed = findRoutedScrollTriggers(anim, deviceKey);
  if (!routed.length) return null;

  presplitSteps(
    anim.id,
    routed.flatMap(({ tl }) => tl.animations || []),
  );

  const built = [];
  const ctx = gsap.context((self) => {
    routed.forEach(({ cfg, tl }) => {
      const fallbackTrigger = tl.animations?.[0]?.itemClass;
      const scrollCfg = withScrollLogger(
        buildScrollTriggerConfig(cfg, fallbackTrigger),
        {
          timelineId: tl.id,
          timelineData: tl,
          animationId: anim.id,
          animationData: anim,
        },
      );
      const tlBuilt = buildTimeline(
        tl,
        { scrollTrigger: scrollCfg },
        {
          animationId: anim.id,
          animationTitle: anim.title,
          scrollDriven: true,
          ctx: self,
        },
      );
      if (!tlBuilt) return;
      built.push(tlBuilt);
      // Register so DevTools can list the timeline, resolve its step tweens
      // for the Inspector, and route edits to it. It is deliberately NOT
      // composed into the DevTools master: master.add() reparents the timeline
      // into a paused master, and ScrollTrigger could no longer advance it —
      // scroll preview would freeze. vars.data.scrollDriven is the marker
      // devtoolsMaster checks to skip it.
      if (editorMode) registerTimeline(anim.id, tlBuilt);
    });
  });

  registerScrollOwnership(anim, built);
  decorateMarkers(built, anim.title);

  return { contexts: [ctx], listeners: [] };
}
