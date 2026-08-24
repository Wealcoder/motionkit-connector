import { registerStandardMethods } from "./standard.js";
import { registerSplitTextMethod } from "./splitText.js";
import { registerDrawSVGMethod } from "./drawSVG.js";
import { registerScrollToMethod } from "./scrollTo.js";
import { registerFlipMethod } from "./flip.js";
import { registerMotionPathMethod } from "./motionPath.js";
import { registerMorphSVGMethod } from "./morphSVG.js";
import { registerPhysics2DMethod } from "./physics2D.js";
import { registerScrambleTextMethod } from "./scrambleText.js";
import { registerParallaxMethod } from "./parallax.js";

// Add future plugin registrations here. Each returns true if registered.
// Scaffolds to fill when editor wires them into step.method:
//   registerCustomEaseMethod   (window.CustomEase)
const EXTENSION_REGISTRARS = [
  registerSplitTextMethod,
  registerDrawSVGMethod,
  registerScrollToMethod,
  registerFlipMethod,
  registerMotionPathMethod,
  registerMorphSVGMethod,
  registerPhysics2DMethod,
  registerScrambleTextMethod,
  registerParallaxMethod,
];

// Registrars that reported their plugin missing, so a later attempt can pick them up.
let outstanding = null;

function attempt(registrars) {
  const missing = [];
  registrars.forEach((fn) => {
    try {
      if (!fn()) missing.push(fn);
    } catch (e) {
      console.warn("[customEngine] extension registration failed:", e);
    }
  });
  return missing;
}

// Plugins arrive through the asset loader's active-plugins broadcast, which can land after
// this module runs. Registration used to be one-shot, so anything that arrived late never
// registered at all — its vars were silently dropped by gsap, and scrambleText additionally
// left its snapshot machinery off, so teardown could not restore the rewritten innerHTML.
export function registerAllExtensions() {
  if (outstanding === null) {
    registerStandardMethods();
    outstanding = attempt(EXTENSION_REGISTRARS);
    return;
  }
  if (outstanding.length) outstanding = attempt(outstanding);
}
