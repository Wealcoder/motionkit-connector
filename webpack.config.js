const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const { getWebpackEntryPoints } = require("@wordpress/scripts/utils/config");
const path = require("path");

// This repo no longer builds the animation engine. The engine's source lives in the editor repo at `src/lib/motionkit-engine/`, and its `scripts/copy-to-connector.mjs` drops the built bundles into `assets/build/modules/animation-builder/` as vendored artifacts — so the only entry left here is `editor-bridge.js`.
// One source tree used to emit two different builds (instrumented for the editor, stripped for the plugin), managed by the `__MOTIONKIT_DEVTOOLS__` DefinePlugin flag; when the flag was read the wrong way the editor's DevTools silently found nothing to drive. The editor builds both variants now, so the flag, the DefinePlugin, and the copy-to-editor hook are all gone.

// wp-scripts' CleanWebpackPlugin wipes all of `assets/build`, so leaving it in place meant every connector build deleted the 36 engine bundles copied in from the editor and shipped a broken plugin. Webpack's own `output.clean` with a keep pattern is used instead: webpack still clears its own stale output but never touches the vendored engine paths.
const KEEP_VENDORED_ENGINE = /^modules[\\/]animation-builder[\\/]frontend/;

module.exports = {
  ...defaultConfig,
  plugins: (defaultConfig.plugins || []).filter(
    (plugin) => plugin.constructor.name !== "CleanWebpackPlugin",
  ),
  entry: () => {
    return {
      ...getWebpackEntryPoints(),
      "modules/animation-builder/editor-bridge":
        "./src/modules/animation-builder/editor-bridge.js",
    };
  },
  output: {
    path: path.resolve(__dirname, "assets/build"),
    filename: "[name].js",
    clean: { keep: (asset) => KEEP_VENDORED_ENGINE.test(asset) },
  },
};
