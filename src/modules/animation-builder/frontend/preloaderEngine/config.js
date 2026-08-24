// Preloader engine — configuration reader.
//
// This engine is deliberately SEPARATE from the page-transition runtime and from
// customEngine. It shares no modules with either. A page transition spans a navigation
// (exit → sessionStorage handoff → enter); a preloader is a single-shot cover with
// progress tracking. They look similar today and will diverge, so coupling them would
// make both harder to change.

export const COVER_ID = 'motionkit-preloader';
export const COVER_CLASS = 'motionkit-preloading';
export const STYLE_ID = 'motionkit-preloader-style';

// Written by the page-transition runtime when it navigates away. If it is set, THIS page
// load is a transition arrival — the transition overlay is already covering the screen,
// so the preloader must stand down rather than stack a second overlay on top.
export const PT_ARRIVE_KEY = 'motionkit-pt-arriving';

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v, fallback) => (typeof v === 'string' && v !== '' ? v : fallback);

const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);

// Reveal settings live on the chosen preset's sub-object in preset mode, and directly on
// the custom object in custom mode.
const readReveal = (src) => ({
  type: str(src?.revealType, 'fade'),
  origin: str(src?.revealOrigin, 'center'),
  delay: Math.max(0, num(src?.revealDelay, 0)),
  duration: Math.max(0, num(src?.revealDuration, 0.8)),
  ease: str(src?.revealEase, 'power2.inOut'),
});

const readShared = (src) => ({
  background: str(src?.background, '#0a0a0a'),
  overlayOpacity: Math.max(0, Math.min(1, num(src?.overlayOpacity, 1))),
  alignment: str(src?.alignment, 'center'),
  // Applied to the overlay root; every preset's text inherits it.
  fontFamily: str(src?.fontFamily, ''),

  showLogo: bool(src?.showLogo, false),
  logo: str(src?.logo, ''),
  logoSize: Math.max(8, num(src?.logoSize, 72)),

  showLabel: bool(src?.showLabel, false),
  label: str(src?.label, ''),
  labelColor: str(src?.labelColor, '#ffffff'),
  labelSize: Math.max(8, num(src?.labelSize, 20)),
  labelWeight: str(src?.labelWeight, '700'),
  labelSpacing: Math.max(0, num(src?.labelSpacing, 0.25)),

  progressType: str(src?.progressType, 'none'),
  accentColor: str(src?.accentColor, '#ffffff'),
  backdropBlur: bool(src?.backdropBlur, false),
  blurAmount: Math.max(0, num(src?.blurAmount, 8)),

  completeOn: str(src?.completeOn, 'load'),
  minDuration: Math.max(0, num(src?.minDuration, 1.2)),
  // Never allow 0 — this is the failsafe ceiling, and a 0 here would mean "hide the site
  // forever" if the reveal path ever threw.
  maxDuration: Math.max(1, num(src?.maxDuration, 8)),
  showOn: str(src?.showOn, 'every-load'),
  lockScroll: bool(src?.lockScroll, true),
});

/**
 * Resolve the active preloader config, or null when nothing should run.
 *
 * Two sources, in priority order:
 *   1. `window.__MOTIONKIT_PRELOADER__` — set by the exported standalone snippet
 *   2. `window.motionkitData.all_settings.preloader` — set by the WP connector
 *
 * The exported snippet wins so a static page that also happens to carry motionkitData
 * behaves predictably.
 */
export function readConfig() {
  let src = null;
  try {
    src =
      window.__MOTIONKIT_PRELOADER__ ||
      window.motionkitData?.all_settings?.preloader ||
      null;
  } catch (e) {
    return null;
  }

  if (!src || typeof src !== 'object') return null;
  if (src.enable !== true) return null;

  const mode = src.tabs === 'custom' ? 'custom' : 'preset';
  const base = mode === 'custom' ? src.custom : src.preset;
  if (!base || typeof base !== 'object') return null;

  const shared = readShared(base);

  if (mode === 'custom') {
    return {
      mode,
      presetKey: 'custom',
      shared,
      preset: base,
      reveal: readReveal(base),
    };
  }

  const presetKey = str(base.preloaderType, 'spinner');
  const preset = base[presetKey];
  if (!preset || typeof preset !== 'object') {
    // Type selected but its settings were never seeded — still run, with the preset's
    // own defaults applied inside its builder, rather than showing nothing.
    return { mode, presetKey, shared, preset: {}, reveal: readReveal({}) };
  }

  return { mode, presetKey, shared, preset, reveal: readReveal(preset) };
}
