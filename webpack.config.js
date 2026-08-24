const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const { getWebpackEntryPoints } = require("@wordpress/scripts/utils/config");
const glob = require("glob");
const path = require("path");
const webpack = require("webpack");
const { copyToEditor } = require("./scripts/copy-to-editor");

function getPresetEntries({ folder, outPrefix }) {
  const files = glob.sync(`${folder}/*.js`);
  return files.reduce((entries, file) => {
    const name = outPrefix + path.basename(file, ".js");
    entries[name] = path.resolve(file);
    return entries;
  }, {});
}

// Webpack plugin that triggers copyToEditor on watch rebuilds
const copyPlugin = {
  apply: (compiler) => {
    compiler.hooks.afterEmit.tap("MotionKitCopyToEditorPlugin", () => {
      copyToEditor({ quiet: true });
    });
  },
};

module.exports = {
  ...defaultConfig,
  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...(defaultConfig.resolve ? defaultConfig.resolve.alias : {}),
      "@": path.resolve(__dirname, "src/modules/animation-builder"),
    },
  },
  entry: () => {
    return {
      ...getWebpackEntryPoints(),
      "modules/animation-builder/frontend":
        "./src/modules/animation-builder/frontend.js",
      "modules/animation-builder/editor-bridge":
        "./src/modules/animation-builder/editor-bridge.js",
      "modules/animation-builder/frontend/editor-reset":
        "./src/modules/animation-builder/frontend/editor-reset.js",
      "modules/animation-builder/frontend/customAnimation":
        "./src/modules/animation-builder/frontend/animation-type/customAnimation.js",
      ...getPresetEntries({
        folder:
          "./src/modules/animation-builder/frontend/animation-type/preset",
        outPrefix: "modules/animation-builder/frontend/presets/",
      }),
      ...getPresetEntries({
        folder: "./src/modules/animation-builder/frontend/preloader",
        outPrefix: "modules/animation-builder/frontend/preloader/",
      }),
    };
  },
  output: {
    path: path.resolve(__dirname, "assets/build"),
    filename: "[name].js",
  },
  plugins: [
    ...defaultConfig.plugins,
    new webpack.DefinePlugin({
      __MOTIONKIT_DEVTOOLS__: JSON.stringify(false),
    }),
    copyPlugin,
  ],
};
