const PRESET_KEY = "motionkit-mk-popup-media-pa";
const POPUP_TAG = "motionkit-popup-media";

// All popup styles live inside the shadow root so theme/page CSS on the
// customer site cannot reach in and override them (e.g. a generic
// `button:hover { background: red }` was painting a red box behind the close
// icon on production). `:host { display: contents }` keeps the host element
// layout-transparent so the inner overlay still positions fixed against the
// viewport — visual behavior is identical to the previous global-stylesheet
// version.
const POPUP_STYLES = `
  :host {
    display: contents;
  }
  .motionkit-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    overflow-y: auto;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .motionkit-popup-content {
    background-color: transparent;
    position: relative;
    max-width: 90%;
    max-height: 90%;
    width: 50vw;
    margin: 20px auto;
  }
  @media (max-width: 768px) {
    .motionkit-popup-content { width: 90vw; }
  }
  .motionkit-popup-close {
    position: absolute;
    top: -25px;
    right: 0px;
    width: 20px;
    height: 20px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    z-index: 1001;
  }
  .motionkit-popup-close:hover,
  .motionkit-popup-close:focus,
  .motionkit-popup-close:active {
    background-color: transparent;
    outline: none;
    box-shadow: none;
  }
  .motionkit-popup-close::before,
  .motionkit-popup-close::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: #ffffff;
    transition: background-color 0.3s ease;
  }
  .motionkit-popup-close::before { transform: rotate(45deg); }
  .motionkit-popup-close::after  { transform: rotate(-45deg); }
  .motionkit-popup-close:hover::before,
  .motionkit-popup-close:hover::after { background-color: #ff0000; }
  .motionkit-popup-media {
    max-width: 100%;
    max-height: 80vh;
    display: block;
    width: 100%;
  }
  .motionkit-popup-video-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 56.25%;
  }
  .motionkit-popup-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    object-fit: cover;
    cursor: pointer;
  }
  .motionkit-youtube-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
  .motionkit-popup-play-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s ease;
    z-index: 10;
    border: none;
    padding: 0;
  }
  .motionkit-popup-play-btn:hover {
    background-color: rgba(0, 0, 0, 0.9);
    transform: translate(-50%, -50%) scale(1.1);
  }
  .motionkit-popup-play-btn::after {
    content: '';
    border-style: solid;
    border-width: 15px 0 15px 26px;
    border-color: transparent transparent transparent #ffffff;
    margin-left: 5px;
  }
  .motionkit-popup-play-btn.motionkit-playing::after {
    content: '';
    width: 30px;
    height: 30px;
    background: linear-gradient(to right, #fff 30%, transparent 30%, transparent 70%, #fff 70%);
    border: none;
    margin-left: 0;
  }
  .motionkit-popup-video-wrapper {
    position: relative;
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
  }
  .motionkit-youtube-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 56.25%;
  }
`;

if (typeof window !== "undefined" && !customElements.get(POPUP_TAG)) {
  class MotionkitPopupMedia extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
  }
  customElements.define(POPUP_TAG, MotionkitPopupMedia);
}

function getActiveSmoother() {
  return window.ScrollSmoother?.get?.() || null;
}

// When ScrollSmoother is active, native scroll is already disabled by the
// smoother itself, so the only thing we need to do is pause it. Touching
// body styles in that case clobbers smoother's own inline styles and the
// smoother gets stuck after we "unlock". The non-smoother branch is the
// classic position:fixed body-lock for browsers without smoother.
function lockBodyScroll(savedScroll) {
  const smoother = getActiveSmoother();
  if (smoother) {
    smoother.paused(true);
    return;
  }
  const s = document.body.style;
  s.overflow = "hidden";
  s.height = "100%";
  s.position = "fixed";
  s.width = "100%";
  s.top = `-${savedScroll}px`;
}

function unlockBodyScroll() {
  const smoother = getActiveSmoother();
  if (smoother) {
    smoother.paused(false);
    return;
  }
  const s = document.body.style;
  s.overflow = "";
  s.height = "";
  s.position = "";
  s.width = "";
  s.top = "";
}

export function popupMediaAnim() {
  // id -> { teardowns: Array<() => void>, scrollTrigger: ScrollTrigger | null }
  const instances = new Map();

  function getYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,
      /(?:youtube\.com\/embed\/)([^?]+)/,
      /(?:youtube\.com\/v\/)([^?]+)/,
      /(?:youtube\.com\/watch\?.*v=)([^&]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  }

  function getAnimationProperties(animateFrom) {
    const props = {
      from: { scale: 0.7, opacity: 0 },
      to: { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" },
    };
    switch (animateFrom) {
      case "left":
        props.from.x = "-100%";
        props.to.x = "0%";
        break;
      case "right":
        props.from.x = "100%";
        props.to.x = "0%";
        break;
      case "top":
        props.from.y = "-100%";
        props.to.y = "0%";
        break;
      case "bottom":
        props.from.y = "100%";
        props.to.y = "0%";
        break;
      case "rotate_top_left":
        props.from.rotationZ = -180;
        props.from.rotationX = -180;
        props.from.transformOrigin = "0 0";
        props.to.rotationZ = 0;
        props.to.rotationX = 0;
        break;
      case "rotate_top_right":
        props.from.rotationZ = -180;
        props.from.rotationX = -180;
        props.from.transformOrigin = "100% 0";
        props.to.rotationZ = 0;
        props.to.rotationX = 0;
        break;
      case "rotate_bottom_left":
        props.from.rotationZ = -180;
        props.from.rotationX = -180;
        props.from.transformOrigin = "0 100%";
        props.to.rotationZ = 0;
        props.to.rotationX = 0;
        break;
      case "rotate_bottom_right":
        props.from.rotationZ = -180;
        props.from.rotationX = -180;
        props.from.transformOrigin = "100% 100%";
        props.to.rotationZ = 0;
        props.to.rotationX = 0;
        break;
      case "rotate_center":
        props.from.rotationZ = -180;
        props.from.rotationX = -180;
        props.to.rotationZ = 0;
        props.to.rotationX = 0;
        break;
      default:
        // 'center' and unknown — plain scale/opacity only.
        break;
    }
    return props;
  }

  function preventScroll(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  function buildVideoElement(mediaUrl) {
    const wrapper = document.createElement("div");
    wrapper.className = "motionkit-popup-video-wrapper";
    const container = document.createElement("div");
    container.className = "motionkit-popup-video-container";
    const videoEl = document.createElement("video");
    videoEl.className = "motionkit-popup-video";
    videoEl.preload = "metadata";
    const source = document.createElement("source");
    source.src = mediaUrl;
    source.type = "video/mp4";
    videoEl.appendChild(source);

    const playButton = document.createElement("button");
    playButton.className = "motionkit-popup-play-btn";
    playButton.type = "button";

    const togglePlay = () => {
      if (videoEl.paused) {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => playButton.classList.add("motionkit-playing"))
            .catch((err) => console.warn("[popupMedia] playback failed:", err));
        }
      } else {
        videoEl.pause();
        playButton.classList.remove("motionkit-playing");
      }
    };

    videoEl.addEventListener("click", togglePlay);
    playButton.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePlay();
    });
    videoEl.addEventListener("play", () => {
      playButton.classList.add("motionkit-playing");
      playButton.style.display = "none";
    });
    videoEl.addEventListener("pause", () => {
      playButton.classList.remove("motionkit-playing");
      playButton.style.display = "flex";
    });
    videoEl.addEventListener("ended", () => {
      playButton.classList.remove("motionkit-playing");
      playButton.style.display = "flex";
      videoEl.currentTime = 0;
    });

    container.appendChild(videoEl);
    container.appendChild(playButton);
    wrapper.appendChild(container);
    return wrapper;
  }

  function buildMediaElement(mediaType, mediaUrl) {
    switch (mediaType) {
      case "image": {
        const img = document.createElement("img");
        img.src = mediaUrl;
        img.alt = "Popup Image";
        img.className = "motionkit-popup-media";
        return img;
      }
      case "youtube": {
        const container = document.createElement("div");
        container.className = "motionkit-youtube-container";
        const videoId = getYouTubeId(mediaUrl);
        if (!videoId) {
          console.warn("[popupMedia] invalid YouTube URL:", mediaUrl);
          return null;
        }
        const iframe = document.createElement("iframe");
        iframe.className = "motionkit-youtube-video";
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        container.appendChild(iframe);
        return container;
      }
      case "video":
        return buildVideoElement(mediaUrl);
      default:
        console.warn(`[popupMedia] unknown mediaType "${mediaType}"`);
        return null;
    }
  }

  function closePopup(host, instant = false) {
    if (!host || !host.parentNode) return;

    const root = host.shadowRoot;
    const savedScroll = parseInt(host.dataset.scrollPosition || "0", 10);

    root?.querySelector("video")?.pause();
    const iframe = root?.querySelector("iframe");
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);

    unlockBodyScroll();
    // ScrollSmoother manages its own scroll position; calling scrollTo would
    // fight it. Only restore scroll for the native body-lock path.
    if (!getActiveSmoother()) {
      window.scrollTo(0, savedScroll);
    }

    document.removeEventListener("touchmove", preventScroll);
    document.removeEventListener("wheel", preventScroll);

    // Disable pointer events on the overlay immediately so scroll/clicks
    // pass through to the page even during the half-second fade-out.
    const overlayEl = root?.querySelector(".motionkit-popup-overlay");
    if (overlayEl) overlayEl.style.pointerEvents = "none";

    const tl = host._wcfTimeline;
    let removed = false;
    const removeNow = () => {
      if (removed) return;
      removed = true;
      host.parentNode?.removeChild(host);
    };

    if (tl && !instant) {
      // GSAP's `.then()` only fires on FORWARD completion (progress 1), not
      // when reverse reaches progress 0 — so a `tl.reverse().then(removeNow)`
      // never fires and leaves the overlay in the DOM, blocking page
      // scroll. Use onReverseComplete instead, plus a safety timeout in
      // case the timeline gets killed/interrupted.
      tl.eventCallback("onReverseComplete", removeNow);
      tl.reverse();
      setTimeout(removeNow, 1500);
    } else {
      if (tl) tl.kill();
      removeNow();
    }
  }

  function openPopup({ mediaType, mediaUrl, animateFrom, popupId }) {
    if (!mediaType || !mediaUrl) return;

    // Only one popup at a time — close any existing instantly.
    document
      .querySelectorAll(POPUP_TAG)
      .forEach((existing) => closePopup(existing, true));

    const savedScroll = window.pageYOffset;

    const host = document.createElement(POPUP_TAG);
    host.classList.add("motionkit-skip-selector-full");
    host.dataset.popupId = popupId;
    host.dataset.scrollPosition = String(savedScroll);

    const root = host.shadowRoot;
    const styleEl = document.createElement("style");
    styleEl.textContent = POPUP_STYLES;
    root.appendChild(styleEl);

    const overlay = document.createElement("div");
    overlay.className = "motionkit-popup-overlay";

    const content = document.createElement("div");
    content.className = "motionkit-popup-content";

    const closeBtn = document.createElement("button");
    closeBtn.className = "motionkit-popup-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");

    const mediaEl = buildMediaElement(mediaType, mediaUrl);
    if (!mediaEl) return;

    content.appendChild(mediaEl);
    content.appendChild(closeBtn);
    overlay.appendChild(content);
    root.appendChild(overlay);
    document.body.appendChild(host);

    // Lock scroll (done AFTER appending so image/video sizing isn't affected).
    lockBodyScroll(savedScroll);
    document.addEventListener("touchmove", preventScroll, { passive: false });
    document.addEventListener("wheel", preventScroll, { passive: false });

    const { from, to } = getAnimationProperties(animateFrom);
    host._wcfTimeline = gsap
      .timeline()
      .set(overlay, { visibility: "visible" })
      .to(overlay, { opacity: 1, duration: 0.3 })
      .fromTo(content, from, to, "-=0.2");

    overlay.addEventListener("click", (e) => {
      if (
        e.target === overlay ||
        e.target.classList.contains("motionkit-popup-close")
      ) {
        closePopup(host);
      }
    });
  }

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.teardowns.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[popupMedia] teardown error:", err);
      }
    });
    inst.scrollTrigger?.kill();
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
    // Defensive: close any open popup + reset body scroll lock.
    document
      .querySelectorAll(POPUP_TAG)
      .forEach((host) => closePopup(host, true));
    unlockBodyScroll();
    document.removeEventListener("touchmove", preventScroll);
    document.removeEventListener("wheel", preventScroll);
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY) return;
    if (anim.isPublished === false) return;

    const {
      id,
      mediaType,
      mediaUrl,
      trigger: { type: triggerType, selector: triggerSelector } = {},
      vars: { animateFrom = "center" } = {},
    } = anim;

    if (!mediaType || !mediaUrl) {
      console.warn("[popupMedia] missing mediaType or mediaUrl");
      return;
    }

    // Live-update safety: tear down any prior setup for this id.
    teardown(id);

    // Preview-one mode: only the previewed animation may open a popup. Selector-driven
    // triggers still tag their elements below so the inspector keeps its marker; page_load
    // has no element to tag, so it bails right here.
    if (anim.mkInert && triggerType === "page_load") return;

    const teardowns = [];
    let scrollTrigger = null;
    const openFn = () =>
      openPopup({ mediaType, mediaUrl, animateFrom, popupId: id });

    if (triggerType === "page_load") {
      const timerId = setTimeout(openFn, 500);
      teardowns.push(() => clearTimeout(timerId));
    } else {
      if (!triggerSelector) {
        console.warn(
          `[popupMedia] trigger.selector required for triggerType "${triggerType}"`,
        );
        return;
      }

      let elements;
      try {
        elements = document.querySelectorAll(triggerSelector);
      } catch (err) {
        console.warn(
          `[popupMedia] invalid trigger selector "${triggerSelector}":`,
          err.message,
        );
        return;
      }
      if (!elements.length) {
        console.warn(`[popupMedia] no elements match "${triggerSelector}"`);
        return;
      }

      elements.forEach((el) => {
        el.setAttribute("data-motionkit-anim-id", id);

        // Tagged for the inspector, but no trigger listener while another animation
        // is the one being previewed.
        if (anim.mkInert) return;

        switch (triggerType) {
          case "click":
            el.addEventListener("click", openFn);
            teardowns.push(() => el.removeEventListener("click", openFn));
            break;
          case "hover":
            el.addEventListener("mouseenter", openFn);
            teardowns.push(() => el.removeEventListener("mouseenter", openFn));
            break;
          case "on_scroll":
            if (!window.ScrollTrigger) {
              console.warn("[popupMedia] ScrollTrigger not loaded");
              return;
            }
            scrollTrigger = window.ScrollTrigger.create({
              trigger: el,
              start: "top 80%",
              onEnter: openFn,
              once: true,
            });
            break;
        }
      });
    }

    instances.set(id, { teardowns, scrollTrigger });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

popupMediaAnim();
