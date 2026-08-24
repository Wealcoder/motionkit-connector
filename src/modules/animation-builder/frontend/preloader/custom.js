import { runPreloader } from "../preloaderEngine/index.js";
import { buildCustom, playIntro } from "../preloaderEngine/custom.js";

// Entry: engine core + the custom builder only — no preset ships in this bundle.
// The intro animation is custom-mode-only, so it is applied here rather than living as a
// mode check inside the shared runner.
runPreloader((ctx, cfg) => {
  const visual = buildCustom(ctx, cfg);
  playIntro(ctx.content, cfg);
  return visual;
});
