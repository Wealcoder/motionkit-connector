const PRESET_KEY = "motionkit-mk-scroll-vf-pa";

export function scrollVideoFrame() {
  // id -> { timelines: GSAPTimeline[], cleanups: Array<() => void> }
  const instances = new Map();

  function once(el, event, fn, opts) {
    const onceFn = function (e) {
      el.removeEventListener(event, onceFn);
      fn.apply(this, arguments);
    };
    el.addEventListener(event, onceFn, opts);
    return onceFn;
  }

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.timelines.forEach((tl) => {
      try {
        tl.revert();
        tl.kill();
      } catch (err) {
        console.warn("[scrollVideoFrame] timeline teardown error:", err);
      }
    });
    inst.cleanups.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[scrollVideoFrame] cleanup error:", err);
      }
    });
    instances.delete(id);
  }

  function teardownAll() {
    for (const id of [...instances.keys()]) teardown(id);
  }

  function handler(e) {
    const anim = e?.detail;
    if (!anim || anim.presetKey !== PRESET_KEY) return;
    if (anim.isPublished === false) return;
    if (!anim.containerClass || !anim.itemClass) return;

    const { id, containerClass, itemClass, vars = {} } = anim;
    // vars.containerHeight: CSS height for the pinned container (use vh units
    // for viewport-relative scroll lengths, e.g. '200vh').
    // vars.scrub: optional numeric smoothing (seconds) for scrub; set to e.g.
    // 0.3 for a smoother catch-up. If omitted, defaults to `true` immediate
    // scrub mapping.
    const { containerHeight, scrub: scrubCfg } = vars;
    if (!containerHeight) return;

    let containerEl;
    try {
      containerEl = document.querySelector(containerClass);
    } catch (err) {
      console.warn(
        `[scrollVideoFrame] invalid containerClass "${containerClass}":`,
        err.message,
      );
      return;
    }
    if (!containerEl) return;

    let video;
    try {
      video = document.querySelector(itemClass);
    } catch (err) {
      console.warn(
        `[scrollVideoFrame] invalid itemClass "${itemClass}":`,
        err.message,
      );
      return;
    }
    if (!video) return;

    teardown(id);

    containerEl.setAttribute("data-motionkit-anim-id", id);
    video.setAttribute("data-motionkit-anim-id", id);

    // Preview-one mode: targets stay tagged above so the editor's inspector keeps
    // its markers, but nothing is built — only the previewed animation may play.
    if (anim.mkInert) return;

    gsap.set(containerEl, {
      height: containerHeight,
      transition: "none",
    });
    gsap.set(video, { maxHeight: "100vh" });

    // Avoid changing the container's display (can affect surrounding layout).
    // Instead center the video itself and constrain sizing so it doesn't shift
    // when the container is pinned.
    try {
      gsap.set(video, {
        display: "block",
        marginLeft: "auto",
        marginRight: "auto",
        width: "100%",
        maxWidth: "100%",
        maxHeight: "100vh",
        objectFit: "cover",
      });
    } catch (err) {
      console.warn("[scrollVideoFrame] centering set failed:", err);
    }

    const src = video.currentSrc || video.src;
    video.removeAttribute("controls");

    // Choose a pin target: prefer the video's immediate wrapper so we don't
    // pin the full page-level container (which can change layout). Fall
    // back to the container if no wrapper exists.
    const pinTarget = (video && video.parentElement) || containerEl;

    // Determine scrub value: allow numeric smoothing via vars.scrub, else
    // default to `true` (immediate tie to scroll position).
    const scrubValue = typeof scrubCfg === "number" ? scrubCfg : true;

    const tl = gsap.timeline({
      defaults: { duration: 1 },
      scrollTrigger: {
        trigger: containerEl,
        pin: pinTarget,
        start: "top top",
        end: "bottom bottom",
        scrub: scrubValue,
        // Keep pin spacing so the document flow isn't collapsed when pinned.
        pinSpacing: true,
      },
    });

    // When ScrollTrigger pins an element it wraps it in a .gsap-pin-spacer
    // which can affect layout for wide/full-width blocks. Center that
    // spacer so the pinned content stays visually centered without
    // modifying the original container's display property.
    try {
      // Defer a tick so ScrollTrigger creates the spacer element first.
      requestAnimationFrame(() => {
        const spacer = pinTarget && pinTarget.parentElement;
        if (
          spacer &&
          spacer.classList &&
          spacer.classList.contains("gsap-pin-spacer")
        ) {
          try {
            // Limit spacer width to the original container width so full-width
            // blocks remain constrained while centered.
            const cw = containerEl.getBoundingClientRect().width || null;
            gsap.set(spacer, {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: "auto",
              marginRight: "auto",
              maxWidth: cw ? `${Math.round(cw)}px` : "100%",
            });
          } catch (err) {
            console.warn(
              "[scrollVideoFrame] failed to center pin-spacer:",
              err,
            );
          }
        }
      });
    } catch (err) {
      console.warn(
        "[scrollVideoFrame] pin-spacer center scheduling failed:",
        err,
      );
    }

    once(document.documentElement, "touchstart", () => {
      video.play();
      video.pause();
    });

    function attachTimelineOnMetadata() {
      tl.to(video, {
        currentTime: video.duration,
        ease: "none",
      });
    }

    // If metadata already loaded (e.g., cached), attach immediately.
    if (video.readyState >= 1) {
      attachTimelineOnMetadata();
    } else {
      once(video, "loadedmetadata", attachTimelineOnMetadata);
    }

    // Cross-browser scrubbable video trick: re-fetch as blob so Safari/iOS
    // can seek frames independently.
    // Skip in editor mode (proxy-snapshot) to avoid CORS issues
    const isEditorMode =
      window.motionkitData?.motionkit_token || window.location.hostname === "localhost";
    const timer = setTimeout(() => {
      if (!window.fetch || isEditorMode) return;
      fetch(src)
        .then((response) => response.blob())
        .then((blob) => {
          const blobURL = URL.createObjectURL(blob);
          const t = video.currentTime;
          once(document.documentElement, "touchstart", () => {
            video.play();
            video.pause();
          });
          video.setAttribute("src", blobURL);
          video.currentTime = t + 0.01;
        })
        .catch((err) =>
          console.warn("[scrollVideoFrame] blob fetch failed:", err),
        );
    }, 1000);

    const cleanups = [() => clearTimeout(timer)];

    instances.set(id, { timelines: [tl], cleanups });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

scrollVideoFrame();
