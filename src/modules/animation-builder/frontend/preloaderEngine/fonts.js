// Font loading for the preloader overlay.
//
// The rule: never request a font the page already has. A preloader runs during the most
// bandwidth-contended moment of a page load, so adding a duplicate fonts.googleapis.com
// request — for a family the theme is already fetching — actively slows down the thing
// the preloader is meant to paper over.
//
// Note the small duplication with the editor's font catalogue: they live in different
// repos and ship in different bundles, so a shared module isn't possible. Only the URL
// shape and the fallback map are repeated, both of which are stable.

const LINK_ID = "motionkit-preloader-font";

const GENERIC_FALLBACK = "sans-serif";

// Families whose CSS name differs from a plain generic fallback. Anything not listed
// falls back to sans-serif, which is right far more often than not.
const SERIF_HINTS = [
  "playfair",
  "merriweather",
  "lora",
  "baskerville",
  "garamond",
  "serif",
  "spectral",
  "fraunces",
  "bitter",
];
const MONO_HINTS = ["mono", "code"];
const CURSIVE_HINTS = ["caveat", "dancing", "pacifico", "satisfy", "vibes", "sacramento"];

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "");

const genericFor = (family) => {
  const f = normalize(family);
  if (MONO_HINTS.some((h) => f.includes(h))) return "monospace";
  if (CURSIVE_HINTS.some((h) => f.includes(h))) return "cursive";
  if (SERIF_HINTS.some((h) => f.includes(h))) return "serif";
  return GENERIC_FALLBACK;
};

/** A usable CSS font-family value, always with a fallback behind it. */
export function toFontStack(family) {
  if (!family) return "";
  const trimmed = String(family).trim();
  // Already a stack (contains a comma) — hand it through untouched.
  if (trimmed.indexOf(",") !== -1) return trimmed;
  return `'${trimmed}', ${genericFor(trimmed)}`;
}

/**
 * Is this family already available to the page?
 *
 * Three checks, because each catches a case the others miss:
 *   1. document.fonts   — @font-face rules the browser has parsed, plus anything added
 *                         through the FontFace API. Misses fonts still in flight.
 *   2. <link> hrefs     — catches the common "theme already requested it but it hasn't
 *                         landed yet" case, which check 1 reports as absent.
 *   3. inline <style>   — self-hosted @font-face blocks printed straight into the head.
 */
export function isFontOnPage(family) {
  const target = normalize(family);
  if (!target) return false;

  try {
    if (document.fonts && typeof document.fonts.forEach === "function") {
      let found = false;
      document.fonts.forEach((face) => {
        if (!found && normalize(face.family) === target) found = true;
      });
      if (found) return true;
    }
  } catch (e) {
    /* FontFaceSet unavailable — fall through to the DOM checks */
  }

  const needle = target.replace(/\s+/g, "+");
  const plain = target.replace(/\s+/g, "");

  try {
    const links = document.querySelectorAll("link[rel='stylesheet'][href]");
    for (let i = 0; i < links.length; i++) {
      const href = String(links[i].href || "")
        .toLowerCase()
        .replace(/%20/g, "+");
      if (href.indexOf(needle) !== -1 || href.indexOf(plain) !== -1) return true;
    }
  } catch (e) {
    /* ignore */
  }

  try {
    const styles = document.querySelectorAll("style");
    for (let i = 0; i < styles.length; i++) {
      const text = String(styles[i].textContent || "").toLowerCase();
      if (text.indexOf("@font-face") === -1) continue;
      if (text.indexOf(target) !== -1) return true;
    }
  } catch (e) {
    /* ignore */
  }

  return false;
}

/**
 * Make `family` usable, fetching it from Google Fonts only if the page doesn't have it.
 *
 * @returns {{ requested: boolean, reason: string }}
 */
export function ensureFont(family, weights) {
  const name = String(family || "").trim();
  if (!name) return { requested: false, reason: "no-family" };

  // A full stack was configured (contains a comma) — the author is naming fonts they
  // already control, so there is nothing to fetch.
  if (name.indexOf(",") !== -1) {
    return { requested: false, reason: "explicit-stack" };
  }

  if (isFontOnPage(name)) {
    return { requested: false, reason: "already-on-page" };
  }

  if (document.getElementById(LINK_ID)) {
    return { requested: false, reason: "already-requested" };
  }

  try {
    const list = Array.isArray(weights) && weights.length ? weights : [400, 700];
    const href =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(name).replace(/%20/g, "+") +
      ":wght@" +
      list.join(";") +
      "&display=swap";

    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
    return { requested: true, reason: "injected" };
  } catch (e) {
    return { requested: false, reason: "inject-failed" };
  }
}
