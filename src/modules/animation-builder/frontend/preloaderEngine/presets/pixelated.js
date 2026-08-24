import { el, injectCss, num, str } from "./shared.js";

// ── Pixelated ─────────────────────────────────────────────────
// A full-screen grid of square cells that covers the page from the first frame and then
// dissolves away cell by cell to uncover it. The cover does not fade or slide — it breaks
// up into pixels.
//
// There is deliberately NO build-up phase. The grid is solid immediately, so it reads as a
// cover rather than as an animation the visitor watches assemble; the only motion it owns
// is leaving. Movement during the load itself comes from the shared progress readout
// (percentage / counter / bar) when one is enabled.
//
// Two constraints shape the builder, because this preset renders the most DOM of any of
// them at the single worst moment on the page:
//
//   1. The cell count is capped and the cell size grown to fit. A 20px grid on a desktop
//      viewport is >5000 nodes; that is a jank source, not a preloader.
//   2. The dissolve is pure CSS. Each cell gets its own transition-delay once, and the
//      reveal flips one class on the container — no per-frame JS, and it still works if
//      GSAP never loaded.
//
// Ordering the cells is also deferred to reveal time: nothing needs a sort while the page
// is still fetching assets.

const MAX_CELLS = 1400;

// Where the dissolve starts from. Each entry ranks a cell by how early it should go; the
// grid is then sorted on that rank. Adding a direction means adding one line here.
const RANKS = {
  top: (row) => row,
  bottom: (row, _col, rows) => rows - 1 - row,
  left: (_row, col) => col,
  right: (_row, col, _rows, cols) => cols - 1 - col,
  topLeft: (row, col) => row + col,
  topRight: (row, col, _rows, cols) => row + (cols - 1 - col),
  bottomLeft: (row, col, rows) => rows - 1 - row + col,
  bottomRight: (row, col, rows, cols) => rows - 1 - row + (cols - 1 - col),
  center: (row, col, rows, cols) => {
    const y = row - (rows - 1) / 2;
    const x = col - (cols - 1) / 2;
    return Math.sqrt(x * x + y * y);
  },
  edges: (row, col, rows, cols) =>
    Math.min(row, col, rows - 1 - row, cols - 1 - col),
};

/**
 * Order in which cells dissolve.
 *
 * @param {string} from a RANKS key, or anything else for a full scatter
 * @param {number} scatter 0-100. How wide the randomised front is, as a share of the sweep's
 *   own span — NOT a cell count. At 0 the grid clears along a dead-straight line, which reads
 *   as a bar wiping across. Around 35 the leading edge is an obviously random band of squares
 *   that still travels in the chosen direction. At 100 the direction is barely readable.
 *
 *   A share rather than a fixed number of cells because the grid's dimensions change with
 *   Pixel Size: "6 columns of jitter" is heavy raggedness on a coarse grid and almost
 *   invisible on a fine one, whereas 35% looks the same on both.
 * @returns {number[]} cell indices, earliest first
 */
const orderIndices = (from, cols, rows, scatter) => {
  const total = cols * rows;
  const idx = [];
  for (let i = 0; i < total; i++) idx.push(i);

  const rank = RANKS[from];
  if (!rank) {
    // Scatter — Fisher-Yates. Deliberately unseeded: a fresh pattern per load is the point.
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = idx[i];
      idx[i] = idx[j];
      idx[j] = t;
    }
    return idx;
  }

  // Rank once per cell, not inside the comparator — a sort calls it O(n log n) times.
  // The span is measured rather than assumed, so this works for the corner and radial
  // directions too, where it is neither cols nor rows.
  const base = new Array(total);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < total; i++) {
    const r = rank(Math.floor(i / cols), i % cols, rows, cols);
    base[i] = r;
    if (r < lo) lo = r;
    if (r > hi) hi = r;
  }

  const share = Math.max(0, Math.min(100, scatter)) / 100;
  const amount = share * (hi - lo);
  if (amount > 0) {
    for (let i = 0; i < total; i++) base[i] += Math.random() * amount;
  }
  return idx.sort((a, b) => base[a] - base[b]);
};

export default function pixelated({ content, root }, cfg) {
  const gap = Math.max(0, num(cfg.gap, 2));
  const radius = Math.max(0, num(cfg.radius, 0));
  const color = str(cfg.pixelColor, "#ffffff");

  const vw = Math.max(1, window.innerWidth || 1);
  const vh = Math.max(1, window.innerHeight || 1);

  // Grow the requested cell size until the grid fits inside the node budget.
  let cell = Math.max(4, num(cfg.cellSize, 32));
  let cols = Math.ceil(vw / cell);
  let rows = Math.ceil(vh / cell);
  while (cols * rows > MAX_CELLS) {
    cell += 2;
    cols = Math.ceil(vw / cell);
    rows = Math.ceil(vh / cell);
  }
  const total = cols * rows;

  injectCss(
    "pixelated",
    `
.mk-pl-px{position:absolute;inset:0;display:grid;pointer-events:none}
/* Solid from the first paint — there is no fill-in state. Only leaving is animated.
   No will-change: promoting 1000+ cells to their own layers for the whole load costs far
   more than the one-shot opacity transition it would smooth. */
.mk-pl-px-cell{opacity:1;transform:scale(1);transition:opacity .18s linear,transform .18s ease-out}
.mk-pl-px.is-out .mk-pl-px-cell{opacity:0;transform:scale(.35)}
`.trim(),
  );

  // The grid covers the whole overlay, so it hangs off the cover root rather than the
  // centred content stack — and the content (logo, label, progress readout) is lifted above
  // it, since the grid is appended after buildChrome has already run.
  const grid = el([
    `grid-template-columns:repeat(${cols},1fr)`,
    `grid-template-rows:repeat(${rows},1fr)`,
    `gap:${gap}px`,
    `padding:${gap}px`,
    "box-sizing:border-box",
  ]);
  grid.className = "mk-pl-px";

  const cells = new Array(total);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < total; i++) {
    const c = el([
      `background:${color}`,
      radius > 0 ? `border-radius:${radius}px` : "",
    ]);
    c.className = "mk-pl-px-cell";
    cells[i] = c;
    frag.appendChild(c);
  }
  grid.appendChild(frag);
  root.appendChild(grid);

  // The cells ARE the cover, so the overlay behind them has to be see-through. Left opaque,
  // a dissolving cell would uncover the overlay's own background colour instead of the page,
  // and the reveal would end with the whole cover snapping away — which is not a reveal.
  // Same reasoning as curtainReveal, whose panels are its cover.
  //
  // Note this only concerns the JS-built cover. The pre-paint mask PHP prints still paints a
  // background and hides <body> until uncoverPage() runs at the start of the reveal, so there
  // is no flash of unstyled content before the grid exists.
  root.style.background = "transparent";

  if (content) {
    content.style.position = "relative";
    content.style.zIndex = "1";
  }
  const pinned = root.querySelector(".mk-pl-readout-wrap");
  if (pinned) pinned.style.zIndex = "1";

  // No tick(): the grid does not react to progress. The dissolve IS the whole animation.
  return {
    revealOverride(_root, reveal, done) {
      const dur = Math.max(0.1, reveal.duration);
      const order = orderIndices(
        str(cfg.dissolveFrom, "random"),
        cols,
        rows,
        num(cfg.edgeScatter, 35),
      );

      // Spread the per-cell delays across 70% of the duration so the last cell still has
      // its own fade time inside the budget the user asked for.
      const spread = dur * 0.7;
      const step = total > 1 ? spread / (total - 1) : 0;
      for (let i = 0; i < total; i++) {
        cells[order[i]].style.transitionDelay = `${(i * step).toFixed(3)}s`;
      }
      // One class flip drives every cell.
      grid.classList.add("is-out");

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        done();
      };
      setTimeout(finish, (spread + 0.24) * 1000);
    },
  };
}
