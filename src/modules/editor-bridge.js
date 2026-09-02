/**
 * MotionKit Editor Bridge
 *
 * PostMessage bridge between the SaaS editor (motionkit.io) and the WordPress site.
 * Loaded only when ?action=motionkit-editor is present.
 *
 * Receives animation configs from the parent editor iframe,
 * processes them through gsap.matchMedia / CSS matchMedia,
 * and dispatches CustomEvents for preset scripts to consume.
 */

/**
 * Allowed editor origins that can communicate with this bridge.
 * In production only editor.motionkit.io is allowed.
 * In development localhost origins are also permitted.
 */
const ALLOWED_ORIGINS = [
  "https://editor.motionkit.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "*",
];

/**
 * Validate that a message event comes from an allowed editor origin.
 */
function isAllowedOrigin(origin) {
  if (!origin || origin === "*" || origin === "null") return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.endsWith(".motionkit.io")
  ) {
    return true;
  }
  return false;
}

/**
 * Get the validated parent origin for sending messages back.
 * Falls back to wildcard '*' to prevent origin mismatch drops.
 */
function getParentOrigin() {
  try {
    if (document.referrer) {
      const url = new URL(document.referrer);
      const origin = url.origin;
      if (isAllowedOrigin(origin)) return origin;
    }
  } catch (e) {
    // ignore invalid referrer
  }
  return "*";
}

/**
 * Build a full REST API URL.
 * motionkitData.rest_url is pre-built by PHP and handles both pretty
 * (/wp-json/motionkit/v1/) and plain (?rest_route=/motionkit/v1/) forms.
 */
function restUrl(endpoint) {
  return (motionkitData.rest_url || "") + endpoint;
}

/**
 * Build a REST URL with query params.
 *
 * The separator has to be chosen per call, not hardcoded: rest_url() is
 * `/wp-json/motionkit/v1/` under pretty permalinks (no query string at all)
 * and `?rest_route=/motionkit/v1/` under plain ones. Appending "&s=..." to
 * the pretty form makes the whole thing a single path segment, so the
 * request 404s with rest_no_route — and since fetch() does not reject on
 * 404 and the error body parses as JSON, it fails silently.
 *
 * Params that are undefined, null or "" are omitted.
 */
function restUrlWithQuery(endpoint, params) {
  const url = restUrl(endpoint);
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) =>
        encodeURIComponent(key) + "=" + encodeURIComponent(value),
    )
    .join("&");
  if (!query) return url;
  return url + (url.includes("?") ? "&" : "?") + query;
}

/**
 * Extract the motionkit_token (JWT) for editor authentication.
 *
 * Priority:
 * 1. motionkitData.motionkit_token — set by PHP (already validated server-side, most reliable)
 * 2. URL query param ?motionkit_token — fallback for cases where localized data is unavailable
 */
function getMotionKitToken() {
  try {
    if (typeof motionkitData !== "undefined" && motionkitData.motionkit_token) {
      return motionkitData.motionkit_token;
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("motionkit_token") || "";
  } catch (e) {
    return "";
  }
}

/**
 * Bridge endpoint names → simple-dispatcher action names.
 */
const ENDPOINT_TO_ACTION = {
  "global-settings": "save_global_settings",
  "global-animation": "save_global_animation",
  "current-page-settings": "save_current_page_settings",
  "current-page-animation": "save_current_page_animation",
  "animation-folders": "save_animation_folders",
  "favourite-cloud-animation": "save_favourite_cloud_animation",
};

/**
 * Share-link operations → simple-dispatcher action names. Kept separate from
 * ENDPOINT_TO_ACTION because these return a body the editor reads, rather
 * than a fire-and-forget save ack.
 */
const SHARE_OP_TO_ACTION = {
  create: "create_share_link",
  revoke: "revoke_share_link",
  list: "list_share_links",
};

/**
 * No-op retained for call-site compatibility — we no longer use custom
 * auth headers (they'd trigger a CORS preflight).
 */
function getAuthHeaders() {
  return {};
}

/**
 * POST to /motionkit/v1/save as a CORS "simple request":
 *   - Content-Type: text/plain
 *   - No Authorization header, no X-WP-Nonce
 *   - JWT travels in the JSON body
 *
 * Simple requests skip the OPTIONS preflight entirely, so no server
 * config, .htaccess, WAF, or host policy can 405 us.
 */
function saveViaRest(endpoint, body, _headers, onSuccess, saveId) {
  const action = ENDPOINT_TO_ACTION[endpoint];
  if (!action) return;

  const payload = JSON.stringify({
    token: getMotionKitToken(),
    action,
    payload: body,
  });

  const ack = (ok, extra = {}) => {
    try {
      window.parent.postMessage(
        {
          type: ok ? "motionkit-save-success" : "motionkit-save-error",
          data: { endpoint, action, saveId, ...extra },
        },
        parentOrigin || "*",
      );
    } catch (e) {
      /* postMessage failed */
    }
  };

  fetch(restUrl("save"), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: payload,
  })
    .then((r) => {
      if (!r.ok) {
        return r
          .json()
          .catch(() => ({ message: `HTTP ${r.status}` }))
          .then((respBody) => {
            ack(false, {
              error: respBody?.message || respBody?.error || `HTTP ${r.status}`,
              code: respBody?.code || "save_failed",
              status: r.status,
            });
            return null;
          });
      }
      return r.json();
    })
    .then((res) => {
      if (res?.success) {
        ack(true);
        onSuccess(res);
      } else if (res !== null) {
        ack(false, { error: res?.error || "unknown_error" });
      }
    })
    .catch((err) => {
      ack(false, { error: String(err?.message || err || "network_error") });
    });
}

/**
 * Build the standard motionkit-response payload,
 * merging optional overrides over the cached motionkitData values.
 */
function buildResponsePayload(overrides = {}) {
  const data = typeof motionkitData !== "undefined" ? motionkitData : {};
  const payload = {
    platform: data.platform || "wordpress",
    globalSettings: overrides.globalSettings ?? data.global_settings ?? {},
    pageType: data.pageTypeConfigs ?? {},
    currentPageSettings:
      overrides.currentPageSettings ?? data.currentPageSettings ?? {},
    globalAnimation: overrides.globalAnimation ?? data.global_animation ?? [],
    pageAnimation: overrides.pageAnimation ?? data.page_animation ?? [],
    favouriteCloudAnimation:
      overrides.favouriteCloudAnimation ?? data.favourite_cloud_animation ?? [],
    animationFolders:
      overrides.animationFolders ?? data.animation_folders ?? [],
    deviceConfig: data.device_config ?? [],
    base_domain: data.base_domain ?? window.location.origin,
    rest_url: data.rest_url ?? "",
  };
  return payload;
}

let parentOrigin = getParentOrigin();

function sendToParent(message, targetOrigin) {
  try {
    if (window.parent && window.parent !== window) {
      const origin = targetOrigin || parentOrigin || "*";
      window.parent.postMessage(message, origin);
    }
  } catch (err) {
    console.error("MotionKit: sendToParent failed", err);
  }
}

function broadcastReady() {
  const data = typeof motionkitData !== "undefined" ? motionkitData : {};
  sendToParent({
    type: "motionkit-ready",
    data: {
      platform: data.platform || "wordpress",
      base_domain: data.base_domain || window.location.origin,
      rest_url: data.rest_url || "",
    },
  }, parentOrigin || "*");
}

function receivePageConfig() {
  parentOrigin = getParentOrigin();
  const headers = getAuthHeaders();
  window.addEventListener(
    "message",
    (event) => {
      if (!event.data) return;
      if (!isAllowedOrigin(event.origin)) return;

      // Track active parent origin from real postMessages
      if (event.origin && event.origin !== "null" && event.origin !== "*") {
        parentOrigin = event.origin;
      }

      if (event.data?.type === "motionkit-settings") {
        // Receive global + current page settings from the editor
        const {
          globalSettings,
          currentPageSettings,
          globalAnimation,
          pageAnimation,
        } = event.data.data || {};
        // Editor-assigned id so ack postMessages can match the toast.
        const saveId = event.data.saveId || null;

        if (globalSettings) {
          saveViaRest(
            "global-settings",
            { animationConfigs: globalSettings },
            headers,
            () => {
              motionkitData.global_settings = globalSettings;
            },
            saveId,
          );
        }

        if (currentPageSettings) {
          saveViaRest(
            "current-page-settings",
            {
              pageTypeConfigs: motionkitData.pageTypeConfigs,
              animationConfigs: currentPageSettings,
            },
            headers,
            () => {
              motionkitData.currentPageSettings = currentPageSettings;
            },
            saveId,
          );
        }

        if (globalAnimation) {
          saveViaRest(
            "global-animation",
            // The page descriptor rides along even though global animations are not page-scoped: share links live on the page they were made for, and publishing a global animation has to be able to retire the link that was previewing it.
            {
              pageTypeConfigs: motionkitData.pageTypeConfigs,
              animationConfigs: globalAnimation,
            },
            headers,
            () => {
              motionkitData.global_animation = globalAnimation;
            },
            saveId,
          );
        }

        if (pageAnimation) {
          saveViaRest(
            "current-page-animation",
            {
              pageTypeConfigs: motionkitData.pageTypeConfigs,
              animationConfigs: pageAnimation,
            },
            headers,
            () => {
              motionkitData.page_animation = pageAnimation;
            },
            saveId,
          );
        }

        document.dispatchEvent(
          new CustomEvent("motionkit-settings-update", {
            detail: {
              globalSettings,
              currentPageSettings,
              globalAnimation,
              pageAnimation,
            },
            bubbles: true,
            cancelable: true,
          }),
        );
      }

      // Handle page search from the SaaS editor
      if (event.data?.type === "motionkit-page-search") {
        const query = event.data.query || "";
        const page = event.data.page || 1;
        const perPage = event.data.per_page || 10;
        const token = getMotionKitToken();
        // Token in query param — keeps the request as a CORS simple GET
        // (no Authorization header, no preflight).
        const searchUrl = restUrlWithQuery("pages", {
          s: query,
          page,
          per_page: perPage,
          token,
        });

        fetch(searchUrl)
          .then((r) => {
            // fetch() only rejects on network failure, so without this a 404
            // or 401 flows into the success branch, `res.data` is not an
            // array, and the editor just shows "No pages available".
            if (!r.ok) {
              throw new Error("page search failed: HTTP " + r.status);
            }
            return r.json();
          })
          .then((res) => {
            window.parent.postMessage(
              {
                type: "motionkit-page-search-result",
                data: res?.data || [],
                query,
                page: res?.page || page,
                has_more: res?.has_more || false,
                total: res?.total || 0,
              },
              parentOrigin,
            );
          })
          .catch((err) => {
            console.error("MotionKit: page search failed", err);
            window.parent.postMessage(
              {
                type: "motionkit-page-search-result",
                data: [],
                query,
                page,
                has_more: false,
                total: 0,
              },
              parentOrigin,
            );
          });
      }

      // Persist the user's favourited cloud-animation ids. A dedicated message
      // (not part of motionkit-settings) so it stays a lightweight background
      // write with no save-toast on the editor side.
      if (event.data?.type === "motionkit-favourite-cloud-animation") {
        const favourite = event.data.data?.favourite || [];
        const saveId = event.data.saveId || null;
        saveViaRest(
          "favourite-cloud-animation",
          { favourite },
          headers,
          () => {
            motionkitData.favourite_cloud_animation = favourite;
          },
          saveId,
        );
      }

      // Persist the animation folder definitions. A dedicated message (not part
      // of motionkit-settings) so folders no longer ride inside the global
      // settings blob.
      if (event.data?.type === "motionkit-animation-folders") {
        const animationFolders = event.data.data?.animationFolders || [];
        const saveId = event.data.saveId || null;
        saveViaRest(
          "animation-folders",
          { animationFolders },
          headers,
          () => {
            motionkitData.animation_folders = animationFolders;
          },
          saveId,
        );
      }


      // Share links. Unlike the save messages above, the editor needs the
      // response body back (the minted token), so this posts a dedicated
      // result message rather than a save ack. `requestId` lets the editor
      // pair a result with the call that asked for it.
      if (event.data?.type === "motionkit-share-link") {
        const { op, animationIds, sharedVersion, animationId } =
          event.data.data || {};
        const requestId = event.data.requestId || null;
        // Reply to whoever asked, not to the remembered parent origin — the iframe is same-origin under proxy-snapshot but loads directly on some setups, and a mismatched target silently drops the reply.
        const replyOrigin = event.origin || parentOrigin || "*";

        const reply = (data, error) =>
          sendToParent(
            { type: "motionkit-share-link-result", requestId, data, error },
            replyOrigin,
          );

        const action = SHARE_OP_TO_ACTION[op];
        if (!action) {
          reply(null, "unknown_share_op");
          return;
        }

        fetch(restUrl("save"), {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: JSON.stringify({
            token: getMotionKitToken(),
            action,
            payload: {
              pageTypeConfigs: motionkitData.pageTypeConfigs,
              animationIds,
              sharedVersion,
              animationId,
            },
          }),
        })
          .then((r) => r.json().catch(() => null))
          .then((res) => {
            if (res?.success) reply(res.data || {}, null);
            else reply(null, res?.error || "share_link_failed");
          })
          .catch((err) => {
            reply(null, String(err?.message || err || "network_error"));
          });
      }

      // Respond to data requests from the SaaS editor
      if (
        event.data?.type === "motionkit-request" &&
        event.data?.request === "get-data"
      ) {
        sendToParent(
          { type: "motionkit-response", data: buildResponsePayload() },
          event.origin || parentOrigin || "*",
        );
      }
    },
    false,
  );

  // Notify parent (SaaS editor) that the iframe is ready as early as possible
  broadcastReady();
  setTimeout(broadcastReady, 300);
  setTimeout(broadcastReady, 800);
  setTimeout(broadcastReady, 1500);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", broadcastReady);
    window.addEventListener("load", broadcastReady);
  }
}

// Initialize message listener as early as possible (not on window.load) so
// we don't miss any motionkit-request from the editor while WP assets are
// still loading.
receivePageConfig();

