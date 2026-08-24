import { runPreloader } from "../preloaderEngine/index.js";
import build from "../preloaderEngine/presets/circleFill.js";

// Entry: engine core + the "circleFill" preset only. Frontend::enqueue_preloader() picks the
// file matching the selected Preloader Type, so no other preset is ever downloaded.
runPreloader(build);
