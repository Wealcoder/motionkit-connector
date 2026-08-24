import { PT_ARRIVE_KEY } from "./config.js";

// Should the preloader run on THIS page load?
//
// Every storage access is wrapped: Safari private mode throws on sessionStorage writes,
// and a throw here must never stop the page from being revealed. Failing towards
// "show it every time" is the safe direction — the alternative is a site that stays
// hidden because a storage read blew up.

const SESSION_KEY = "motionkit-preloader-seen";
const VISIT_KEY = "motionkit-preloader-visited";

const readStore = (store, key) => {
  try {
    return window[store]?.getItem(key) === "1";
  } catch (e) {
    return false;
  }
};

const writeStore = (store, key) => {
  try {
    window[store]?.setItem(key, "1");
  } catch (e) {
    /* private mode — treat as every-load */
  }
};

/**
 * True when a page-transition navigation brought us here. The transition runtime already
 * has an overlay covering the screen and is about to play its enter animation; running a
 * preloader too would stack two overlays and double the perceived wait.
 */
export function isTransitionArrival() {
  try {
    return window.sessionStorage?.getItem(PT_ARRIVE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function shouldRun(cfg) {
  if (isTransitionArrival()) return false;

  const mode = cfg?.shared?.showOn || "every-load";
  if (mode === "once-per-session") return !readStore("sessionStorage", SESSION_KEY);
  if (mode === "first-visit") return !readStore("localStorage", VISIT_KEY);
  return true;
}

/** Record that the visitor has now seen it, for the non-every-load modes. */
export function markShown(cfg) {
  const mode = cfg?.shared?.showOn || "every-load";
  if (mode === "once-per-session") writeStore("sessionStorage", SESSION_KEY);
  else if (mode === "first-visit") writeStore("localStorage", VISIT_KEY);
}
