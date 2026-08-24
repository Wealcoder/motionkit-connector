import { runPreloader } from "../preloaderEngine/index.js";
import build from "../preloaderEngine/presets/strokeFill.js";

// Entry: engine core + the "strokeFill" preset only. Frontend::enqueue_preloader() picks the
// file matching the selected Preloader Type, so no other preset is ever downloaded.
runPreloader(build);
