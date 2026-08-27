// The one place the runtime decides whether something is allowed to play.

// An animation is in exactly one of three states. A boolean could only ever answer "is this live",
// which left the two not-live states — private work, and work someone has been handed a preview
// link to — indistinguishable, and the link needed to tell them apart.

// Both this and statusOf stay module-private: isPlayable is the only question anything outside asks.
const ANIMATION_STATUS = {
  DRAFT: 'draft',
  PREVIEW: 'preview',
  PUBLISHED: 'published',
};

const KNOWN = [
  ANIMATION_STATUS.DRAFT,
  ANIMATION_STATUS.PREVIEW,
  ANIMATION_STATUS.PUBLISHED,
];

// Reads the state, falling back to the `isPublished` boolean that came before it. That fallback
// is the entire migration: a record saved by an older build resolves to draft or published
// exactly as it used to, so no pass over stored data is needed and a half-updated site is fine.
// New writes only ever set `status`, so a record converges the first time it is saved.
function statusOf(node) {
  if (!node || typeof node !== 'object') return ANIMATION_STATUS.PUBLISHED;

  if (KNOWN.indexOf(node.status) !== -1) return node.status;

  // A missing flag has always meant published — only a literal false ever unpublished anything.
  return node.isPublished === false
    ? ANIMATION_STATUS.DRAFT
    : ANIMATION_STATUS.PUBLISHED;
}

// Whether this node may run in the document it was handed to.

// Not a permission check — by the time anything reaches the runtime the decision is already made,
// server side: a visitor is only ever sent published records, a share link is sent published plus
// the copies its token covers, and the editor stamps what it pushes for playback as `preview`.
// This is the backstop for a draft that reaches a page it should never have reached, so it refuses
// to play rather than quietly going live.
export function isPlayable(node) {
  return statusOf(node) !== ANIMATION_STATUS.DRAFT;
}
