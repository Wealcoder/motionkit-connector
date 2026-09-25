// Builds the installable Connector zip: `npm run release` packages the current version, `npm run release -- 1.0.2` bumps every version string first.
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'motionkit-with-gsap';
const OUT_DIR = path.join(ROOT, 'dist');

const MAIN_FILE = path.join(ROOT, `${SLUG}.php`);
const PLUGIN_CLASS = path.join(ROOT, 'includes', 'Plugin.php');
const PACKAGE_JSON = path.join(ROOT, 'package.json');

/*
  Every place the version lives. WordPress compares the header against the store's version, so a mismatch
  ships a plugin that reports an update to itself forever.
    header      motionkit-connector.php   " * Version: x.y.z"
    constant    motionkit-connector.php   define( 'MOTIONKIT_CONNECTOR_VERSION', 'x.y.z' );
    class       includes/Plugin.php       public const VERSION = 'x.y.z';
    npm         package.json              "version": "x.y.z"
*/
const VERSION_SITES = [
  // Every pattern has exactly three groups (before, version, after) — with only two, String.replace hands the match offset to the callback as the third argument and it lands in the file.
  { name: 'plugin header', file: MAIN_FILE, re: /^(\s*\*\s*Version:\s*)(\S+)()/m },
  { name: 'MOTIONKIT_CONNECTOR_VERSION', file: MAIN_FILE, re: /(define\(\s*'MOTIONKIT_CONNECTOR_VERSION',\s*')([^']+)(')/ },
  { name: 'Plugin::VERSION', file: PLUGIN_CLASS, re: /(public const VERSION = ')([^']+)(')/ },
  { name: 'package.json', file: PACKAGE_JSON, re: /("version":\s*")([^"]+)(")/ },
];

// The engine is vendored from the editor repo and never built here, so a release without it plays nothing.
const REQUIRED_FILES = [
  'assets/build/engine/animationEngine.js',
  'assets/build/engine/customAnimation.js',
  'assets/build/engine/engine-build.json',
  'assets/build/modules/editor-bridge.js',
  'assets/build/lib/engine-wrapper.js',
  'assets/vendor/gsap/gsap.min.js',
  'includes/Setup/PluginUpdater.php',
];

const SEMVER = /^\d+\.\d+\.\d+$/;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function step(message) {
  console.log(`\n▸ ${message}`);
}

function readVersions() {
  return VERSION_SITES.map((site) => {
    const match = fs.readFileSync(site.file, 'utf8').match(site.re);
    if (!match) fail(`Could not find the version in ${site.name} (${path.relative(ROOT, site.file)}).`);
    return { ...site, version: match[2] };
  });
}

function bumpVersions(next) {
  for (const site of VERSION_SITES) {
    const source = fs.readFileSync(site.file, 'utf8');
    const updated = source.replace(site.re, (_, before, _old, after) => `${before}${next}${after}`);
    fs.writeFileSync(site.file, updated);
  }
}

// Minimal .distignore reader with gitignore semantics: a leading slash anchors to the root, a bare name matches at any depth, `*` stays inside one segment.
function loadIgnoreRules() {
  const file = path.join(ROOT, '.distignore');
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const patterns = lines.map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));

  // dist/ holds the zips this script writes, and must never end up inside the next one.
  patterns.push('/dist');

  return patterns.map((pattern) => {
    const anchored = pattern.startsWith('/') || pattern.replace(/\/$/, '').includes('/');
    const body = pattern.replace(/^\//, '').replace(/\/$/, '');
    const source = body
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('[^/]*');
    return { anchored, re: new RegExp(`^${source}$`) };
  });
}

function isIgnored(relPath, rules) {
  const base = relPath.split('/').pop();
  return rules.some((rule) => (rule.anchored ? rule.re.test(relPath) : rule.re.test(base)));
}

function collectFiles(rules, dir = ROOT, rel = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (isIgnored(relPath, rules)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(rules, full, relPath));
    else if (entry.isFile()) files.push(relPath);
  }
  return files;
}

// A syntax error in any PHP file takes down the customer's whole site on update, so every file is linted when a php binary is available.
function lintPhp(files) {
  // No shell: php is a real executable, and a Windows shell would split "Local Sites" in every file path into two arguments.
  const probe = spawnSync('php', ['-v'], { encoding: 'utf8' });
  if (probe.status !== 0) {
    console.log('  php not on PATH — skipped (run `php -l` yourself before uploading).');
    return;
  }
  const phpFiles = files.filter((file) => file.endsWith('.php'));
  for (const file of phpFiles) {
    const result = spawnSync('php', ['-n', '-l', path.join(ROOT, file)], { encoding: 'utf8' });
    if (result.status !== 0) fail(`PHP syntax error in ${file}:\n${result.stdout}${result.stderr}`);
  }
  console.log(`  ${phpFiles.length} PHP files OK`);
}

const requested = process.argv[2];

step('Checking versions');
if (requested) {
  if (!SEMVER.test(requested)) fail(`"${requested}" is not a version like 1.0.2.`);
  bumpVersions(requested);
  console.log(`  bumped to ${requested}`);
}

const versions = readVersions();
for (const site of versions) console.log(`  ${site.name.padEnd(28)} ${site.version}`);
const distinct = [...new Set(versions.map((site) => site.version))];
if (distinct.length !== 1) fail('The version strings disagree. Run `npm run release -- <version>` to set them all at once.');
const version = distinct[0];

step('Checking the working tree');
try {
  const dirty = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
  console.log(dirty ? `  uncommitted changes — the zip will include them:\n${dirty.replace(/^/gm, '    ')}` : '  clean');
} catch {
  console.log('  not a git checkout — skipped');
}

step('Building the bridge and engine wrapper');
// One command string rather than an args array: npm is npm.cmd on Windows and needs a shell, and Node deprecates passing an args array alongside shell.
const build = spawnSync('npm run build', { cwd: ROOT, stdio: 'inherit', shell: true });
if (build.status !== 0) fail('npm run build failed.');

step('Checking required files');
for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(ROOT, file))) fail(`Missing ${file}. The engine is copied in by the editor repo's \`npm run copy:connector\`.`);
}
console.log(`  ${REQUIRED_FILES.length} required files present`);

step('Collecting files from .distignore');
const files = collectFiles(loadIgnoreRules());
console.log(`  ${files.length} files`);

step('Linting PHP');
lintPhp(files);

step('Writing the zip');
fs.mkdirSync(OUT_DIR, { recursive: true });
const zipPath = path.join(OUT_DIR, `${SLUG}-${version}.zip`);
const zip = new AdmZip();
// adm-zip writes forward-slash entry names, which a Linux host needs; a Windows-built zip with backslashes extracts as flat files named "includes\Plugin.php".
for (const file of files) zip.addFile(`${SLUG}/${file}`, fs.readFileSync(path.join(ROOT, file)));
zip.writeZip(zipPath);

const written = new AdmZip(zipPath).getEntries();
if (!written.some((entry) => entry.entryName === `${SLUG}/${SLUG}.php`)) fail('The zip has no main plugin file at the expected path.');

const sizeKb = (fs.statSync(zipPath).size / 1024).toFixed(0);
console.log(`\n✔ ${path.relative(ROOT, zipPath)}  (${written.length} files, ${sizeKb} KB, version ${version})`);
console.log('\nNext: upload it to Download 17 on my.motionkit.io, select it as the Update File, set Version Number to ' + version + ' and fill in the changelog.\n');
