// Coalesces many ScrollTrigger.refresh() calls in one event-loop tick into a
// single rAF-deferred refresh — critical when N custom animations dispatch
// back-to-back on the same preview payload.
let pendingRefresh = false;

export function requestRefresh() {
  if (pendingRefresh) return;
  if (typeof ScrollTrigger === "undefined") return;
  pendingRefresh = true;
  requestAnimationFrame(() => {
    pendingRefresh = false;
    try {
      ScrollTrigger.refresh();
    } catch (e) {
      /* noop */
    }
  });
}

// Memoized querySelectorAll, invalidated on reset. Same selector hit by many
// animations → one DOM query.
const selectorCache = new Map();

export function querySelectorAllCached(selector) {
  if (!selector || typeof selector !== "string") return [];
  if (selectorCache.has(selector)) return selectorCache.get(selector);
  let els;
  try {
    els = document.querySelectorAll(selector);
  } catch (e) {
    els = [];
  }
  // Never cache a miss. Lazy-loaded sections and slider clones arrive after the first
  // build, and a cached empty result meant they stayed unanimated until a full reload.
  if (els.length) selectorCache.set(selector, els);
  return els;
}

export function clearSelectorCache() {
  selectorCache.clear();
}
