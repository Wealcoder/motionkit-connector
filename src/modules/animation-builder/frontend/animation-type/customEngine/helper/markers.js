// Restyle ScrollTrigger's debug markers into a MotionKit badge carrying the animation's name,
// so a page with several scroll animations is readable instead of four identical green/red bars.
//
// GSAP owns the marker's geometry (position/top/right/width/transform) and repositions it on
// every refresh — so nothing here touches those. The outer node keeps its box and its border,
// which is the line marking the exact scroll position; the badge is an inner pill.

// mkOverlayLogo.png from the editor with its floating top dot removed and cropped to the mark,
// inlined so the preview iframe and a published page both render it without a plugin-URL lookup.
const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAA2CAYAAACBWxqaAAADnUlEQVR4nMXaPWgTYRzH8d9zTS4mJhojqNWqEScRa3Bw8AXSRXHTzU3r4qiCi4O0RZBOvozq0BYEX5YqvqEVG5CK+EJSqFZQ6YHUaOPLmcSkubw8DubRqmm93P2fux90C5fvp0nJpXcM9R0d/Bpfv9TfFfK1xHweFq5xaOlsOZF4q/dc7mzV4MJ2902E921acqi91bd/gZ9F80ZNny4j9aVYOrJ1TTD164G99/KHboxW+PCrWqOfib6RfMzp+L196eizd6Ukb7BMrsovjHzvAgB2fsSItQaVZNCnzHowo8L199+KHZ1bZ6glxx/bsXi4fbk3OttjCgbHqQffOpSQitNzxQOA6mHh5Qv9w068EmbiASCgMuxc5+9SvAozFSUQJ29nd5PV/jWz8WLRiDem+DwsbPYJVA8Lb1gRGOy5md9nq7TBmo0HAMYQnvu902BBn4JNK+f1UyKsxIs1DQAxwk48rAIwA3HiVq7L6jHsxsMOAHXE5mig2wqCIh52AQCgtrCmEVTxoACgSQRlPKgAqCO2rZ3ffelpeVYEdTwoAWLLQi0NETLiIQOABghZ8QDgoT6gWB2B62OfBmTFAwC7MVrh/zuZs7pcqYpVEa5vbPOaPl1pZp/yNTlvIdTjV0Y4ZMWLSQGI+FibV8bh/xg5wMl4UAOcjgclwI14UAHcigcVIBKsuRIPig+yyHyO9jaVpsbCbL8CC/ycpsTibAMURhNi+fntHkD1uCuwDZj4XKUpsTjbgKksQ8Fw7+/ANmDhvBbceVF2DUHyObA44HUNQXYq4RaC9GTODQT56bTTCClfaJxESPtK6RRCGgAAQqpHv/K8cFYmQhpAXFc7sCV4+OKT7z2yEFIApQrXZl4UPLg91C0LQQ4oVbg2/s7454qmLAQpQMQf2eVveGFcBoIM8L94MWoECSA7XTMVL0aJsA2Y1A1tMJkxHS9GhbAFmNQN7f74145+izeDUCAsA+zGi9lFWAJM5SopingxO4imAa8zRurO2CRZvJgVRMHgUIrlmumQ1xkj9ehNuqO/c41uNXSuNYvweZimlKt8wMyDZceLNYMY/2gklKGXhTOTennOV0H7YiSciBczg/iYrWoDI3oPAGB/Xzo68LiU/Pt2s7tjVX71iXHGiehGO/cw153JVf+55Wz8Q3l4MFmMAsAf/1Y7PZSLB1QlzpmyOqCy0ZfpYqp3z6KEWwDUf7kH4+E4w88bs4ZeFa8d3/W76QekE3JSLlhi3AAAAABJRU5ErkJggg==";

const STYLE_ID = "motionkit-marker-style";
// Editor design token --accent. Start and end share one chip design; the label tells them apart.
const ACCENT = "#2c76e6";
const MAX_TITLE = 20;

const MARKER_CSS = `
/* GSAP pins the scroller markers to a fixed 149px box; direction:rtl makes a wider pill spill
   leftward into the page instead of off the right edge, without touching that geometry. */
.motionkit-marker{background:none!important;border-width:0!important;
 padding:0!important;font-size:0!important;line-height:0!important;direction:rtl!important}
/* clip-path draws the arrow, so no border-radius and no box-shadow (a shadow would be clipped
   off by the same path). An element marker points RIGHT, toward the line it marks; the padding
   on that side keeps the chip clear of the tip. */
.motionkit-marker__pill{direction:ltr;display:inline-flex;align-items:center;gap:5px;vertical-align:bottom;
 flex-direction:row-reverse;margin:2px 6px;padding:2px 9px 2px 2px;
 clip-path:polygon(0 0,calc(100% - 7px) 0,100% 50%,calc(100% - 7px) 100%,0 100%);
 background:rgba(15,16,21,.92);
 font:600 10px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
 color:#f4f4f5;letter-spacing:.01em;white-space:nowrap}
.motionkit-marker__logo{width:11px;height:11px;flex:none;object-fit:contain;display:block}
/* Not align-self:stretch — the chip shares the same centre line as the logo and the name. */
.motionkit-marker__role{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
 padding:2px 5px;display:flex;align-items:center;line-height:1;background:${ACCENT};color:#fff}
/* Scroller markers sit at the viewport edge, so theirs mirrors: point and logo on the left. */
.motionkit-marker--scroller .motionkit-marker__pill{background:rgba(15,16,21,.62);color:#d4d4d8;font-weight:500;
 flex-direction:row;padding:2px 2px 2px 12px;
 clip-path:polygon(0 50%,7px 0,100% 0,100% 100%,7px 100%)}
.motionkit-marker--scroller .motionkit-marker__logo{opacity:.55}
`;

function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const tag = doc.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = MARKER_CSS;
  (doc.head || doc.documentElement).appendChild(tag);
}

// GSAP writes "start-<id>" / "scroller-end-<id>" as the marker text; we replace it wholesale.
function decorate(node, title, role, scroller) {
  if (!node || node.dataset.mkMarker) return;
  node.dataset.mkMarker = "1";
  ensureStyle(node.ownerDocument);

  node.classList.add("motionkit-marker", `motionkit-marker--${role}`);
  if (scroller) node.classList.add("motionkit-marker--scroller");

  const pill = node.ownerDocument.createElement("span");
  pill.className = "motionkit-marker__pill";

  const logo = node.ownerDocument.createElement("img");
  logo.className = "motionkit-marker__logo";
  logo.src = LOGO;
  logo.alt = "";

  // Long titles would push the badge across the page, so cap them.
  const name = node.ownerDocument.createElement("span");
  name.textContent =
    title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1)}…` : title;

  const tag = node.ownerDocument.createElement("span");
  tag.className = "motionkit-marker__role";
  tag.textContent = scroller ? `scroller ${role}` : role;

  pill.append(logo, name, tag);
  node.textContent = "";
  node.appendChild(pill);
}

// Sweep the DOM rather than tracking the animations we built. On a hard reload GSAP defers
// ScrollTrigger init past the build, so a reference captured at build time is not ready when we
// look at it — that is why markers came up raw on load and only styled after Play re-dispatched
// them. Reading the live marker nodes instead makes this independent of when GSAP gets around
// to creating them.
let hooked = false;
let observer = null;

// Every marker of one trigger carries `marker-<animation id>`, and the matching ScrollTrigger
// knows the editor-side title, so a marker can be labelled without knowing who built it.
function titlesById() {
  const map = new Map();
  const all = (typeof ScrollTrigger !== "undefined" && ScrollTrigger.getAll?.()) || [];
  all.forEach((st) => {
    const title = st.animation?.vars?.data?.animationTitle;
    const id = st.animation?.vars?.id ?? st.vars?.id;
    if (title && id) map.set(String(id), title);
  });
  return map;
}

function sweep() {
  if (typeof document === "undefined") return;
  const nodes = document.querySelectorAll(
    '[class*="gsap-marker-"]:not([data-mk-marker])',
  );
  if (!nodes.length) return;
  const titles = titlesById();
  nodes.forEach((node) => {
    const key = [...node.classList].find((c) => c.startsWith("marker-"));
    const title = key ? titles.get(key.slice(7)) : null;
    if (!title) return;
    decorate(
      node,
      title,
      node.className.includes("-start") ? "start" : "end",
      node.className.includes("gsap-marker-scroller-"),
    );
  });
}

// Watch for the marker nodes instead of polling for them — GSAP appends them to the body, so
// the observer fires the moment they exist no matter how late ScrollTrigger initialises.
function watch() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((records) => {
    const added = records.some((r) => r.addedNodes.length);
    if (added) sweep();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Called after each scroll animation is built. The build is only a cue to start looking — the
// sweep and the observer are what actually find the markers, whenever GSAP creates them.
export function decorateMarkers(built, title) {
  if (!title || !built?.length) return;
  if (!hooked && typeof ScrollTrigger !== "undefined") {
    hooked = true;
    try {
      ScrollTrigger.addEventListener("refresh", sweep);
    } catch (e) {
      /* older ScrollTrigger without the event API — the observer still covers it */
    }
  }
  watch();
  sweep();
}
