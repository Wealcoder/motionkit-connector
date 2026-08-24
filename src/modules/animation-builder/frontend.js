"use strict";

if (typeof window !== "undefined" && typeof window.__MOTIONKIT_DEVTOOLS__ === "undefined") {
  window.__MOTIONKIT_DEVTOOLS__ = false;
}

(function () {
  var parentOrigin = null;

  var platform =
    document.querySelector('meta[name="motionkit-platform"]')?.content ||
    "html";

  var deepClone =
    typeof structuredClone === "function"
      ? structuredClone
      : function (v) {
          return JSON.parse(JSON.stringify(v));
        };

  function isPlainObject(v) {
    if (!v || typeof v !== "object") return false;
    var proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
  }

  // Return the deviceConfig entry whose mediaQuery currently matches.
  // Falls back to the first device or a synthetic 'desktop' entry so
  // callers always get *something* to work with.
  function detectCurrentDevice(devices) {
    for (var i = 0; i < (devices || []).length; i++) {
      var d = devices[i];
      if (!d || !d.mediaQuery) continue;
      try {
        if (window.matchMedia(d.mediaQuery).matches) return d;
      } catch (e) {
        /* invalid mq */
      }
    }
    return (devices && devices[0]) || { key: "desktop" };
  }

  // Pull devices[deviceKey] off a node and place it under a vars prop
  // on a shallow clone. Original root fields are preserved; devices bag
  // is removed. If no per-device override exists, vars = {}.
  function flattenDeviceBag(node, deviceKey) {
    if (!node || typeof node !== "object") return node;
    var perDevice = node.devices && node.devices[deviceKey];
    var out = Object.assign({}, node);
    out.vars =
      perDevice && typeof perDevice === "object"
        ? Object.assign({}, perDevice)
        : {};
    delete out.devices;
    return out;
  }

  function isResponsiveEnabled(node, deviceKey) {
    if (!node || typeof node !== "object") return true;
    var r = node.responsive;
    if (!r || typeof r !== "object") return true;
    return r[deviceKey] !== false;
  }

  // True if the node is published. Missing isPublished defaults to true
  // so payloads that never set the flag still run.
  function isActive(node) {
    if (!node || typeof node !== "object") return true;
    return node.isPublished !== false;
  }

  // Walk all_animations once: filter by published/responsive, flatten the
  // per-device vars bag, and collect active GSAP plugins inline. Returns
  // { animations, activePlugins } so callers don't re-walk the tree.
  function buildAnimationsForDevice(all_animations, deviceKey) {
    var animations = (all_animations || [])
      .filter(function (a) {
        return isActive(a) && isResponsiveEnabled(a, deviceKey);
      })
      .map(function (a) {
        if (!a || typeof a !== "object") return a;

        // Custom animation branch — flatten the single timeline + its inner animations.
        // cloud_trigger shares the same timeline-of-steps shape as custom_animation,
        // so it needs the same per-step device flatten (see customEngine isCustomAnimation).
        if (
          (a.group === "custom_animation" || a.group === "cloud_trigger") &&
          a.timeline &&
          typeof a.timeline === "object"
        ) {
          var outCustom = Object.assign({}, a);
          var flatTl = flattenDeviceBag(a.timeline, deviceKey);
          if (Array.isArray(a.timeline.animations)) {
            flatTl.animations = a.timeline.animations
              .filter(function (step) {
                return isActive(step) && isResponsiveEnabled(step, deviceKey);
              })
              .map(function (step) {
                return flattenDeviceBag(step, deviceKey);
              });
          }
          outCustom.timeline = flatTl;
          delete outCustom.devices;
          return outCustom;
        }

        // Preset / free animation — flatten the root devices bag.
        var flat = flattenDeviceBag(a, deviceKey);
        return flat;
      });

    return { animations: animations };
  }

  function resolveAndDispatch(all_animations, all_settings, play_only) {
    var devices = Object.values(
      (all_settings && all_settings.deviceConfig) || {},
    );

    var currentDevice = detectCurrentDevice(devices);
    var built = buildAnimationsForDevice(all_animations, currentDevice.key);

    // Deep-clone each anim before dispatch — GSAP mutates the vars object you
    // pass to it (adds `duration`, `ease`, `parent`, etc.). Without this, those
    // GSAP-injected props leak back into motionkitData.all_animations.
    for (var i = 0; i < built.animations.length; i++) {
      var detail = deepClone(built.animations[i]);
      // Preview-one mode. The editor sends the WHOLE list even when it only wants a
      // single animation played, so every target still gets resolved and tagged with
      // data-motionkit-anim-id and the editor's animation inspector keeps its markers.
      // Engines read mkInert and stop after tagging instead of building anything —
      // sending a one-entry list instead (the old behaviour) made every other
      // animation vanish from the DOM for as long as the preview lasted.
      if (play_only) detail.mkInert = detail.id !== play_only;
      document.dispatchEvent(
        new CustomEvent("aae-animation-event", {
          detail: detail,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  }

  // Notify parent that bridge is ready
  // Use same-origin since iframe is served via proxy-snapshot (same origin as editor)
  function sendReady() {
    window.parent.postMessage(
      {
        type: "motionkit-ready",
        data: {
          platform: platform,
          base_domain: window.location.origin,
        },
      },
      window.location.origin,
    );
  }

  // Coalesce bursts of `motionkit-animation-config` from the editor (slider drags
  // can fire ~50/sec). We hold the latest payload and process it once per
  // animation frame — older ones are superseded and dropped, since only the
  // final state is observable. Without this, every intermediate config
  // triggers a full GSAP rebuild and ScrollTrigger refresh.
  var pendingConfig = null;
  var rebuildScheduled = false;

  function flushPendingConfig() {
    rebuildScheduled = false;
    if (!pendingConfig) return;
    var cfg = pendingConfig;
    pendingConfig = null;
    // Fire a global reset BEFORE rebuilding so stale timelines, ScrollTriggers,
    // and inline GSAP styles from the previous config are torn down. Without
    // this, animations that change type (preset↔custom) at the same id leak
    // their old context.
    document.dispatchEvent(
      new CustomEvent("aae-reset-animation", {
        detail: "",
        bubbles: true,
        cancelable: true,
      }),
    );
    resolveAndDispatch(cfg.all_animations, cfg.all_settings, cfg.play_only);
  }

  // Listen for messages from the editor
  window.addEventListener("message", function (event) {
    if (!parentOrigin) parentOrigin = event.origin;

    if (event.data?.type === "motionkit-animation-config") {
      var payload = event.data.data || {};
      var all_animations = payload.all_animations || [];
      var all_settings = payload.all_settings || {};
      window.motionkitData = Object.assign({}, window.motionkitData || {}, {
        all_animations: all_animations,
        all_settings: all_settings,
      });
      // Route through the rAF-coalesced flush instead of dispatching directly.
      // flushPendingConfig fires `aae-reset-animation` before rebuilding, which
      // tears down animations that no longer exist in this config. Dispatching
      // directly skipped that reset, so an animation deleted or renamed between
      // configs was never re-received by the custom engine and its gsap context,
      // ScrollTriggers, and interaction listeners leaked for the session.
      pendingConfig = {
        all_animations: all_animations,
        all_settings: all_settings,
        // Id of the one animation allowed to play; every other one builds inert.
        // Absent on a normal push, which plays the whole list as before.
        play_only: payload.play_only || null,
      };
      if (!rebuildScheduled) {
        rebuildScheduled = true;
        requestAnimationFrame(flushPendingConfig);
      }
    }

    // Reset animations
    if ("motionkit-animation-config-reset" in event.data) {
      document.dispatchEvent(
        new CustomEvent("aae-reset-animation", {
          detail: "",
          bubbles: true,
          cancelable: true,
        }),
      );
    }

    // Saving global settings for html platform (necessary for scroll paralax preset)
    if (event.data.type === "motionkit-settings") {
      const { globalSettings = {}, currentPageSettings = {} } =
        event.data.data || {};
      window.motionkitData = Object.assign({}, window.motionkitData || {}, {
        currentPageSettings,
        globalSettings,
      });
    }
  });

  // Send ready after a short delay to let parent set up listener
  setTimeout(sendReady, 200);

  function loadFullPreviewData() {
    if (
      !/\/api\/full-preview(\/|$|\?)/.test(
        window.location.pathname + window.location.search,
      )
    ) {
      return null;
    }
    try {
      var session = new URLSearchParams(window.location.search).get("session");
      if (!session) return null;
      var raw = localStorage.getItem("motionkit-preview-" + session);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function initLiveAnimations() {
    const source = loadFullPreviewData() || window.motionkitData || {};
    const allAnimations = source.all_animations || source.pageConfigs || [];
    const allSettings = source.all_settings || {
      deviceConfig: source.device_config || source.deviceConfig,
      globalSettings: source.global_settings || source.globalSettings,
      currentPageSettings: source.currentPageSettings,
    };
    resolveAndDispatch(allAnimations, allSettings);
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initLiveAnimations);
    window.addEventListener("load", initLiveAnimations, { once: true });
  } else {
    initLiveAnimations();
  }
})();
