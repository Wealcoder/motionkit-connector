/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

// The WordPress side of the engine contract. This file is the plugin's own source and is compiled by the plugin's own webpack; the engine it drives is a vendored artifact built in the editor repo and dropped into assets/build/engine/.
// It lives here rather than in the editor because everything it does is adapter work: knowing that the animations arrive on `window.motionkitData`, that Frontend.php emits nine values under both a snake_case and a camelCase name, and that a visitor page dispatches exactly once. The engine knows none of that and must not.
// It reaches the engine through `window.MotionKitEngine`, the API assets/build/engine/animationEngine.js installs. Every decision about what the data MEANS — which device bucket wins, which records are playable, how a per-device bag flattens onto `vars` — stays behind that call, because a wrapper that reimplemented any of it would drift from the editor and the same animation would behave differently in the two places.

/**
 * Reads the settings bag the engine's resolver expects.
 *
 * Frontend.php emits both naming conventions because two different JS readers
 * disagreed and neither half could be dropped without moving both in lockstep.
 * Accepting both here is what lets an older plugin build keep working against a
 * newer engine.
 *
 * @param {object} source window.motionkitData
 * @returns {object} settings bag
 */
function readSettings(source) {
  if (source.all_settings) return source.all_settings;
  return {
    deviceConfig: source.device_config || source.deviceConfig,
    globalSettings: source.global_settings || source.globalSettings,
    currentPageSettings: source.currentPageSettings,
  };
}

// `pageConfigs` is the older key name for the same list; both are still emitted.
function readAnimations(source) {
  return source.all_animations || source.pageConfigs || [];
}

function run() {
  const engine = window.MotionKitEngine;
  // A missing engine means the vendored artifact was not enqueued or 404'd. Saying so once beats an animated page that silently does nothing, which is how a stale or absent engine used to present.
  if (!engine || typeof engine.run !== 'function') {
    console.warn(
      '[motionkit] engine runtime not found — animations will not run. Expected window.MotionKitEngine from assets/build/engine/animationEngine.js.',
    );
    return;
  }

  const source = window.motionkitData || {};
  engine.run({
    animations: readAnimations(source),
    settings: readSettings(source),
  });
}

// Guarded because this used to be registered on DOMContentLoaded WITHOUT `once` alongside a `once` load listener, and the engine scripts are footer-enqueued so readyState is 'loading' and both fired: every preset handler and every custom timeline was built twice on a cold page load.
let dispatched = false;

function runOnce() {
  if (dispatched) return;
  dispatched = true;
  run();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', runOnce, { once: true });
  window.addEventListener('load', runOnce, { once: true });
} else {
  runOnce();
}
