// True on the two editor surfaces, false on a published page.
//
// Both surfaces are served through the editor's proxy (/api/proxy-snapshot, /api/full-preview)
// with the WordPress URL in a `url` query param, so the WP-side flags arrive percent-encoded
// inside location.search rather than as real params. Opening the WP page directly with
// ?action=motionkit-editor matches too, which is correct — that is also a preview.
const PREVIEW_FLAGS = ["action=motionkit-editor", "motionkit_full_preview"];

export function isPreviewContext() {
  if (typeof location === "undefined") return false;
  const raw = location.search || "";
  let search = raw;
  try {
    search = decodeURIComponent(raw);
  } catch (e) {
    /* malformed escape sequence — test the raw string instead */
  }
  return PREVIEW_FLAGS.some((flag) => search.includes(flag));
}
