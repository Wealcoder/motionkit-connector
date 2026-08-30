#!/usr/bin/env node

// Copies compiled animation scripts from the WP connector build output into the MotionKit editor server's static dir.
// Source (connector) and destination (editor) roots are read from .env so the same script runs on Windows and Linux.
// Two entry points: CLI `node scripts/copy-to-editor.js` (after `npm run build`) and the webpack afterEmit hook (during `npm run start`) via require('./scripts/copy-to-editor').copyToEditor({ quiet: true }).

const fs = require("fs");
const path = require("path");

// Load .env from the connector root so MOTIONKIT_* keys are available via process.env without a dotenv dependency.
// Exported as well as self-invoked because webpack.config.js needs MOTIONKIT_DEVTOOLS before it builds the DefinePlugin; re-running is a no-op since existing process.env keys always win.
function loadDotEnv() {
  const envFile = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

// COPY_ITEMS — what gets synced from the connector build to the editor. Each entry is one of:
//   'rel/path'            → a file OR a folder at the same relative path on both sides (folders copy recursively)
//   ['fromRel', 'toRel']  → copy/rename to a different relative path on the destination (also works for folders)
// Paths are relative to SRC_DIR (source) and DEST_DIR (destination).
const COPY_ITEMS = [
  "frontend.js",
  "frontend/editor-reset.js",
  "frontend/customAnimation.js",
  "frontend/presets",
  "frontend/preloader",
];

// Connector root holds the build output; defaults to this repo when MOTIONKIT_CONNECTOR_PATH is unset.
const CONNECTOR_DIR = process.env.MOTIONKIT_CONNECTOR_PATH
  ? path.resolve(process.env.MOTIONKIT_CONNECTOR_PATH)
  : path.resolve(__dirname, "..");

// Editor root is required — no sensible default. Set MOTIONKIT_EDITOR_PATH in .env (use your OS-native absolute path).
const EDITOR_DIR = process.env.MOTIONKIT_EDITOR_PATH
  ? path.resolve(process.env.MOTIONKIT_EDITOR_PATH)
  : path.resolve("d:/motionkit AI development/motionkit-editor");

// Relative locations of the build output (under the connector) and the editor's static dir (under the editor root).
const candidateSrc1 = path.join(CONNECTOR_DIR, "assets", "build", "modules", "animation-builder");
const candidateSrc2 = path.join(CONNECTOR_DIR, "assets", "build", "animation-builder");
const SRC_DIR = fs.existsSync(candidateSrc1) ? candidateSrc1 : candidateSrc2;

const DEST_SUBDIR = path.join("server", "static", "animation-scripts");
const DEST_DIR = EDITOR_DIR ? path.join(EDITOR_DIR, DEST_SUBDIR) : null;

// Recursively copy a file or directory; returns the number of files written so callers can report a real count.
// Only JS bundles are synced — the editor serves static JS and never reads the WordPress .asset.php sidecars.
function copyPath(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    let count = 0;
    for (const name of fs.readdirSync(src)) {
      count += copyPath(path.join(src, name), path.join(dest, name));
    }
    return count;
  }
  if (!src.endsWith(".js")) return 0;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return 1;
}

function copyToEditor({ quiet = false } = {}) {
  const fail = (msg) => {
    if (!quiet) console.warn(`[copy-to-editor] ${msg}`);
    return { copied: 0, skipped: 0, dest: null };
  };

  if (!EDITOR_DIR) return fail("Set MOTIONKIT_EDITOR_PATH in .env to the motionkit-editor root.");
  if (!fs.existsSync(EDITOR_DIR)) return fail(`Editor root not found: ${EDITOR_DIR}`);
  if (!fs.existsSync(SRC_DIR)) return fail(`Build output not found (run \`npm run build\`): ${SRC_DIR}`);

  let copied = 0;
  let skipped = 0;

  for (const item of COPY_ITEMS) {
    const [fromRel, toRel] = Array.isArray(item) ? item : [item, item];
    const src = path.join(SRC_DIR, fromRel);
    const out = path.join(DEST_DIR, toRel);

    if (!fs.existsSync(src)) {
      skipped++;
      continue;
    }
    copied += copyPath(src, out);
  }

  if (!quiet) {
    console.log(`[copy-to-editor] Copied ${copied} file${copied === 1 ? "" : "s"}, skipped ${skipped} (not found in build).`);
    console.log(`[copy-to-editor] Destination: ${DEST_DIR}`);
  } else if (copied > 0) {
    console.log(`[copy-to-editor] Synced ${copied} file${copied === 1 ? "" : "s"} → editor.`);
  }

  return { copied, skipped, dest: DEST_DIR };
}

module.exports = { copyToEditor, loadDotEnv };

if (require.main === module) {
  copyToEditor({ quiet: false });
}
