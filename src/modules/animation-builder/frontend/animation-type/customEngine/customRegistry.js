// Registry of custom-animation timelines, keyed by anim id.

const IS_DEVTOOLS = typeof __MOTIONKIT_DEVTOOLS__ !== "undefined" && Boolean(__MOTIONKIT_DEVTOOLS__);

const byAnimId = IS_DEVTOOLS ? new Map() : null; // animId → gsap.Timeline[]

export function registerTimeline(animId, tl) {
  if (!IS_DEVTOOLS) return;
  if (!animId || !tl) return;
  const list = byAnimId.get(animId) || [];
  list.push(tl);
  byAnimId.set(animId, list);
}

export function unregisterAnimation(animId) {
  if (!IS_DEVTOOLS) return;
  byAnimId.delete(animId);
}

export function getTimelines(animId) {
  if (!IS_DEVTOOLS) return [];
  return byAnimId.get(animId) || [];
}

export function getAllTimelines() {
  if (!IS_DEVTOOLS) return [];
  const out = [];
  for (const list of byAnimId.values()) out.push(...list);
  return out;
}

export function findTimelineById(timelineId) {
  if (!IS_DEVTOOLS) return null;
  for (const list of byAnimId.values()) {
    for (const tl of list) {
      if (tl?.vars?.id === timelineId) return tl;
    }
  }
  return null;
}

export function clearAll() {
  if (!IS_DEVTOOLS) return;
  byAnimId.clear();
}

// Expose a read-only snapshot of the registry on window so the DevTools
// Web Component (loaded in the same iframe) can build its master timeline
// without importing this module directly. Editor preview only.
if (IS_DEVTOOLS && typeof window !== "undefined") {
  window.__motionkitCustomRegistry = {
    getAllTimelines,
    findTimelineById,
    getTimelines,
  };
}

// "Editor preview mode" specifically means: a live DevTools instance is
// taking control of custom-animation playback.
export function isEditorPreviewMode() {
  if (!IS_DEVTOOLS) return false;
  if (typeof window === "undefined") return false;
  return window.__motionkitDevToolsLoaded === true;
}

