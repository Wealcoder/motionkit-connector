import { isPreviewContext } from "../helper/previewMode.js";

// "default" is an editor sentinel. Omit so ScrollTrigger picks its own default.
export function nonDefault(v) {
  return v && v !== "default" ? v : undefined;
}

// Editor emits `"custom"` as the primary value when the user picks the Custom
// option; the actual value lives on a sibling key (e.g. start → customStart).
function resolveCustomable(cfg, key, customKey) {
  const v = cfg[key];
  return v === "custom" ? cfg[customKey] : v;
}

function parseScrub(s) {
  if (s === "false" || s === false || s == null || s === "") return undefined;
  if (s === "true" || s === true) return true;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : true;
}

function parsePin(p) {
  if (p === "false" || p === false || p == null || p === "") return undefined;
  if (p === "true" || p === true) return true;
  return p;
}

function parseBool(v) {
  if (v == null || v === "") return undefined;
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return undefined;
}

function parseNumber(v) {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseString(v) {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s : undefined;
}

// pinSpacing has no `customPinSpacing` sibling in the editor today, so a bare
// "custom" selection is dropped until/unless a sibling field is added.
function parsePinSpacing(v) {
  if (v == null || v === "") return undefined;
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  if (v === "custom") return undefined;
  return v;
}

// Optional ScrollTrigger properties surfaced via the editor's "Add Properties"
// popover. Each parser returns undefined to skip emission.
const OPTIONAL_PROPS = [
  ["pinSpacing", parsePinSpacing],
  ["pinType", parseString],
  ["pinReparent", parseBool],
  ["toggleClass", parseString],
  ["once", parseBool],
  ["toggleActions", parseString],
  ["anticipatePin", parseNumber],
  ["scroller", parseString],
  ["horizontal", parseBool],
  ["preventOverlaps", parseBool],
  ["fastScrollEnd", parseBool],
  ["invalidateOnRefresh", parseBool],
  ["refreshPriority", parseNumber],
  ["autoRefreshEvents", parseString],
  // Markers are a debugging aid — drop them on a published page even if the config saved them on.
  ["markers", (v) => (isPreviewContext() ? parseBool(v) : undefined)],
];

// Build a GSAP-ready ScrollTrigger config object from the editor's per-device
// cfg. fallbackTrigger is used when cfg.trigger is "default" — typically the
// first animated selector in the routed timeline.
export function buildScrollTriggerConfig(cfg, fallbackTrigger) {
  if (!cfg) return null;
  const out = {};

  const trg = nonDefault(cfg.trigger) || fallbackTrigger;
  if (trg) out.trigger = trg;

  const start = resolveCustomable(cfg, "start", "customStart");
  if (start) out.start = start;

  const end = resolveCustomable(cfg, "end", "customEnd");
  if (end) out.end = end;

  // endTrigger: "default" → mirror the resolved trigger (GSAP already does
  // this implicitly; making it explicit keeps the emitted config readable).
  // "custom" → customEndTrigger.
  let endTrg;
  if (cfg.endTrigger === "default") endTrg = trg;
  else if (cfg.endTrigger === "custom") endTrg = cfg.customEndTrigger;
  else endTrg = cfg.endTrigger;
  if (endTrg) out.endTrigger = endTrg;

  const scrub = parseScrub(resolveCustomable(cfg, "scrub", "customScrub"));
  if (scrub !== undefined) out.scrub = scrub;

  const pin = parsePin(resolveCustomable(cfg, "pin", "customPin"));
  if (pin !== undefined) out.pin = pin;

  for (const [key, parse] of OPTIONAL_PROPS) {
    const v = parse(cfg[key]);
    if (v !== undefined) out[key] = v;
  }

  // GSAP ignores toggleActions once scrub is set, so emitting both let the editor offer a
  // combination that silently does nothing. Drop the one that loses.
  if (out.scrub !== undefined) delete out.toggleActions;

  // ScrollTriggers refresh in creation order, and animations arrive in config order rather
  // than page order — which mis-measures pin spacing. Rank by the trigger's document position
  // so refresh runs top-to-bottom. An author-set value always wins.
  if (out.refreshPriority === undefined) {
    const priority = documentOrderPriority(out.trigger);
    if (priority !== undefined) out.refreshPriority = priority;
  }

  return out;
}

// Measured against GSAP 3.15 rather than trusted from the docs, which contradict each other on
// this: refreshPriority 100 refreshed before 0, which refreshed before -100. So HIGHER runs
// first, and an element nearer the top of the page needs the higher number — hence negating the
// document offset.
function documentOrderPriority(trigger) {
  if (!trigger || typeof document === "undefined") return undefined;
  let el = trigger;
  if (typeof trigger === "string") {
    try {
      el = document.querySelector(trigger);
    } catch (e) {
      return undefined;
    }
  }
  if (!el || el.nodeType !== 1 || typeof el.getBoundingClientRect !== "function") {
    return undefined;
  }
  const top = el.getBoundingClientRect().top + (window.scrollY || 0);
  return Number.isFinite(top) ? -Math.round(top) : undefined;
}
