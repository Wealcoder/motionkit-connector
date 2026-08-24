const PRESET_KEY = "motionkit-mk-scroll-cr-pa";

export function cubeScrollRevealAnim() {
  // id -> { timelines, scrollTriggers, cleanups }
  const instances = new Map();

  function teardown(id) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.timelines.forEach((tl) => {
      try {
        tl.scrollTrigger?.kill();
        tl.kill();
      } catch (err) {
        console.warn("[cubeScroll] timeline teardown error:", err);
      }
    });
    inst.scrollTriggers.forEach((st) => {
      try {
        st.kill();
      } catch (err) {
        console.warn("[cubeScroll] scrollTrigger teardown error:", err);
      }
    });
    inst.cleanups.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn("[cubeScroll] cleanup error:", err);
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
    if (!anim.itemClass || !anim.endSectionClass) return;


    const {
      id,
      itemClass,
      endSectionClass,
      frontMedia,
      backMedia,
      leftMedia,
      rightMedia,
      topMedia,
      bottomMedia,
      vars = {},
    } = anim;

    const {
      cubeMinWidth,
      cubeMaxWidth,
      cubeMaxHeight,
      position,
      expandFace,
      scale,
      cubeAnimStart,
      cubeAnimCStart,
    } = vars;

    const cubeMinWidthNum = parseFloat(cubeMinWidth) || 0;
    const cubeMaxWidthNum = parseFloat(cubeMaxWidth) || 0;
    const cubeMaxHeightNum = parseFloat(cubeMaxHeight) || 0;
    const positionNum = parseFloat(position) || 0;
    const scaleNum = parseFloat(scale) || 1;

    let container;
    try {
      container = document.querySelector(itemClass);
    } catch (err) {
      console.warn(
        `[cubeScroll] invalid itemClass "${itemClass}":`,
        err.message,
      );
      return;
    }
    if (!container) return;

    teardown(id);

    container.setAttribute("data-motionkit-anim-id", id);

    // Preview-one mode: the container stays tagged above so the editor's inspector keeps
    // its marker, but we bail before the DOM rewrite below — only the previewed animation
    // may build.
    if (anim.mkInert) return;

    container.classList.add("motionkit-skip-selector-full");
    container.innerHTML = "";

    // Build cube DOM ─────────────────────────────────────────────────
    const scrollContainer = document.createElement("div");
    scrollContainer.className = "aab_wc-scroll-container";

    const scene = document.createElement("div");
    scene.className = "aab_wc-scene";

    const animContainer = document.createElement("div");
    animContainer.className = "aab_wc-animation-container";
    animContainer.style.width = `${cubeMinWidthNum}px`;
    animContainer.style.height = `${cubeMinWidthNum}px`;

    const cube = document.createElement("div");
    cube.className = "aab_wc-cube";

    const mediaMap = {
      front: frontMedia,
      back: backMedia,
      left: leftMedia,
      right: rightMedia,
      top: topMedia,
      bottom: bottomMedia,
    };

    // Editor sends face media in two possible shapes:
    //   • plain string URL (data: URL or normal URL) — most common path
    //   • object with `{ type, url }` — older / explicit shape
    // Normalize both so the rest of the function can use a single contract.
    const normalizeMedia = (media) => {
      if (!media) return null;
      if (typeof media === "string") {
        const isVideo =
          /^data:video\//i.test(media) ||
          /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(media);
        return { url: media, type: isVideo ? "video" : "image" };
      }
      if (typeof media === "object" && media.url) {
        return { url: media.url, type: media.type || "image" };
      }
      return null;
    };

    const getFaceContent = (faceName) => {
      const media = normalizeMedia(mediaMap[faceName]);
      if (!media) return "";
      if (media.type === "video") {
        return `
          <div class="aab_wc-video-player">
            <video class="aab_wc-video" data-face="${faceName}" muted loop playsinline>
              <source src="${media.url}" type="video/mp4" />
            </video>
          </div>
        `;
      }
      return `<img src="${media.url}" alt="${faceName}" />`;
    };

    const faces = [
      { class: "aab_wc-front", name: "front" },
      { class: "aab_wc-back", name: "back" },
      { class: "aab_wc-right", name: "right" },
      { class: "aab_wc-left", name: "left" },
      { class: "aab_wc-top", name: "top" },
      { class: "aab_wc-bottom", name: "bottom" },
    ];

    faces.forEach((face) => {
      const faceEl = document.createElement("div");
      faceEl.className = `aab_wc-face ${face.class}`;
      faceEl.innerHTML = getFaceContent(face.name);
      cube.appendChild(faceEl);
    });

    const videoControl = document.createElement("button");
    videoControl.className = "aab_wc-video-control";
    videoControl.type = "button";
    videoControl.textContent = "Play";

    animContainer.appendChild(cube);
    scene.appendChild(animContainer);
    scene.appendChild(videoControl);
    scrollContainer.appendChild(scene);
    container.appendChild(scrollContainer);

    // Scoped styles ──────────────────────────────────────────────────
    const style = document.createElement("style");
    style.textContent = `
      ${itemClass} { margin: 0; padding: 0; box-sizing: border-box; }
      ${itemClass} .aab_wc-scroll-container { position: relative; z-index: 100; }
      ${itemClass} .aab_wc-scene {
        width: 100%;
        display: flex;
        justify-content: center;
        position: relative;
      }
      ${itemClass} .aab_wc-animation-container {
        position: relative;
        transform-style: preserve-3d;
        perspective: 1000px;
      }
      ${itemClass} .aab_wc-cube {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transform: rotateX(-30deg) rotateY(45deg);
      }
      ${itemClass} .aab_wc-face {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        backface-visibility: hidden;
        overflow: hidden;
      }
      ${itemClass} .aab_wc-face img { width: 100%; height: 100%; object-fit: cover; }
      ${itemClass} .aab_wc-front  { transform: translateZ(${
        cubeMinWidthNum / 2
      }px); }
      ${itemClass} .aab_wc-back   { transform: rotateY(180deg) translateZ(${
        cubeMinWidthNum / 2
      }px); }
      ${itemClass} .aab_wc-right  { transform: rotateY(90deg)  translateZ(${
        cubeMinWidthNum / 2
      }px); }
      ${itemClass} .aab_wc-left   { transform: rotateY(-90deg) translateZ(${
        cubeMinWidthNum / 2
      }px); }
      ${itemClass} .aab_wc-top    { transform: rotateX(90deg)  translateZ(${
        cubeMinWidthNum / 2
      }px); }
      ${itemClass} .aab_wc-bottom { transform: rotateX(-90deg) translateZ(${
        cubeMinWidthNum / 2
      }px); }
      ${itemClass} .aab_wc-video-player {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        overflow: hidden;
      }
      ${itemClass} .aab_wc-video { width: 100%; height: 100%; object-fit: cover; }
      ${itemClass} .aab_wc-video-control {
        position: absolute;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        border: none;
        border-radius: 100px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s ease;
        z-index: 10;
        height: 100px;
        width: 100px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0;
        display: none;
      }
      ${itemClass} .aab_wc-animation-container:hover + .aab_wc-video-control,
      ${itemClass} .aab_wc-video-control:hover { opacity: 1; }
    `;
    container.appendChild(style);

    // Refs ───────────────────────────────────────────────────────────
    const controlBtn = container.querySelector(".aab_wc-video-control");
    const animContainerEl = container.querySelector(
      ".aab_wc-animation-container",
    );
    const cubeEl = container.querySelector(".aab_wc-cube");
    const front = container.querySelector(".aab_wc-front");
    const back = container.querySelector(".aab_wc-back");
    const right = container.querySelector(".aab_wc-right");
    const left = container.querySelector(".aab_wc-left");
    const topFace = container.querySelector(".aab_wc-top");
    const bottom = container.querySelector(".aab_wc-bottom");
    const face = container.querySelectorAll(".aab_wc-face");

    const expandingFaceMedia = normalizeMedia(mediaMap[expandFace]);
    const hasExpandingVideo = expandingFaceMedia?.type === "video";
    const video = hasExpandingVideo
      ? container.querySelector(`.aab_wc-video[data-face="${expandFace}"]`)
      : null;

    const faceRotations = {
      front: { rotationY: 0, rotationX: 0 },
      back: { rotationY: 180, rotationX: 0 },
      right: { rotationY: -90, rotationX: 0 },
      left: { rotationY: 90, rotationX: 0 },
      top: { rotationY: 0, rotationX: -90 },
      bottom: { rotationY: 0, rotationX: 90 },
    };
    const targetRotation = faceRotations[expandFace] || faceRotations.front;

    const allFaces = [front, back, right, left, topFace, bottom];
    const faceElements = {
      front,
      back,
      right,
      left,
      top: topFace,
      bottom,
    };
    const facesToHide = allFaces.filter((f) => f !== faceElements[expandFace]);

    // Resolve end section once. Distance is recomputed per refresh so
    // late-loading fonts/images or iframe resizes don't leave us with a
    // stale pin range.
    let endElement = null;
    try {
      endElement = document.querySelector(endSectionClass);
    } catch (err) {
      console.warn(
        `[cubeScroll] invalid endSectionClass "${endSectionClass}":`,
        err.message,
      );
    }

    const computeEndDistance = () => {
      if (!endElement) return window.innerHeight * 1.5;
      const containerRect = scrollContainer.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();
      const containerTop = containerRect.top + window.scrollY;
      const endTop = endRect.top + window.scrollY;
      return Math.max(window.innerHeight, endTop - containerTop);
    };

    // Default `cubeAnimStart` to "center center" so the cube is vertically
    // centered in the viewport during the pin, instead of sticking to the
    // top edge. Editor's form value (when sent) overrides this default.
    const startStr =
      cubeAnimStart === "custom"
        ? cubeAnimCStart
        : cubeAnimStart || "center center";

    // Main scroll-scrubbed cube timeline. `end` as a function +
    // `invalidateOnRefresh` ensures positions are recomputed on every
    // refresh (resize, font load, image load, etc.).
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer,
        start: startStr,
        end: () => "+=" + computeEndDistance(),
        scrub: 1,
        pin: true,
        pinSpacing: false,
        invalidateOnRefresh: true,
      },
    });

    // Number of extra full Y-rotations during the spin phase. Cube tumbles
    // through this many revolutions and *then* lands on the chosen expand
    // face at the end. Higher = more spinning, less time on each face.
    const EXTRA_REVOLUTIONS = 1;

    tl.to(animContainerEl, { scale: scaleNum, duration: 0.6 }, 0);
    tl.to(scene, { x: positionNum, duration: 0.6 }, 0);

    // Spin phase — long-running rotation that keeps the cube tumbling for
    // most of the pin range (0 → 1.8 of a 2.3s timeline ≈ 78% of scroll),
    // landing on the target face at the end of the spin.
    tl.to(
      cubeEl,
      {
        rotationY: targetRotation.rotationY + EXTRA_REVOLUTIONS * 360,
        rotationX: targetRotation.rotationX,
        rotate: 0,
        duration: 1.8,
        ease: "none",
      },
      0,
    );

    // Expansion phase — runs in the last ~22% of the pin range (1.8 → 2.3).
    tl.to(
      animContainerEl,
      {
        width: cubeMaxWidthNum,
        height: cubeMaxHeightNum,
        scale: 1,
        duration: 0.5,
      },
      1.8,
    );
    tl.to(face, { scale: 0.9, duration: 0.5 }, 1.8);
    // Other faces fade out together with the expansion so the spin reads as
    // one continuous motion until the very end.
    tl.to(facesToHide, { opacity: 0, duration: 0.4 }, 1.85);

    const scrollTriggers = [];
    const cleanups = [];

    // Video controls for the expanding face ──────────────────────────
    if (hasExpandingVideo && video) {
      tl.to(controlBtn, { display: "block", duration: 0.1 }, 1.5);

      tl.eventCallback("onUpdate", () => {
        if (!video) return;
        if (tl.progress() >= 0.7 && video.paused) {
          video
            .play()
            .catch((err) =>
              console.warn("[cubeScroll] video play failed:", err),
            );
          controlBtn.textContent = "Pause";
        } else if (tl.progress() < 0.7 && !video.paused) {
          video.pause();
          controlBtn.textContent = "Play";
        }
      });

      const videoTrigger = window.ScrollTrigger.create({
        trigger: scrollContainer,
        start: startStr,
        end: () => "+=" + computeEndDistance(),
        invalidateOnRefresh: true,
        onEnter: () => {
          if (tl.progress() >= 0.7 && video) {
            video
              .play()
              .catch((err) =>
                console.warn("[cubeScroll] video play failed:", err),
              );
            controlBtn.textContent = "Pause";
          }
        },
        onEnterBack: () => {
          if (tl.progress() >= 0.7 && video) {
            video
              .play()
              .catch((err) =>
                console.warn("[cubeScroll] video play failed:", err),
              );
            controlBtn.textContent = "Pause";
          }
        },
        onLeave: () => {
          if (video) {
            video.pause();
            controlBtn.textContent = "Play";
          }
        },
        onLeaveBack: () => {
          if (video) {
            video.pause();
            controlBtn.textContent = "Play";
          }
        },
      });
      scrollTriggers.push(videoTrigger);

      const onBtnClick = () => {
        if (video.paused) {
          video.play();
          controlBtn.textContent = "Pause";
        } else {
          video.pause();
          controlBtn.textContent = "Play";
        }
      };
      controlBtn.addEventListener("click", onBtnClick);
      cleanups.push(() => controlBtn.removeEventListener("click", onBtnClick));
    }

    // Teardown: wipe the rebuilt DOM + injected style element.
    cleanups.push(() => {
      container.classList.remove("motionkit-skip-selector-full");
      container.innerHTML = "";
    });

    // Refresh ScrollTrigger so it picks up the freshly-built cube DOM.
    // Re-refresh on font load (web-fonts often arrive after init) and on
    // each cube-face image load — both can shift `endElement`'s position
    // and stale-out the pin range.
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();

      document.fonts?.ready
        ?.then(() => window.ScrollTrigger.refresh())
        .catch(() => {});

      const imgs = scrollContainer.querySelectorAll("img");
      imgs.forEach((img) => {
        if (img.complete) return;
        const onLoad = () => window.ScrollTrigger.refresh();
        img.addEventListener("load", onLoad, { once: true });
        img.addEventListener("error", onLoad, { once: true });
        cleanups.push(() => {
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onLoad);
        });
      });
    }

    instances.set(id, {
      timelines: [tl],
      scrollTriggers,
      cleanups,
    });
  }

  document.addEventListener("aae-animation-event", handler);
  document.addEventListener("aae-reset-animation", teardownAll);

  return {
    destroy: () =>
      document.dispatchEvent(new CustomEvent("aae-reset-animation")),
  };
}

cubeScrollRevealAnim();
