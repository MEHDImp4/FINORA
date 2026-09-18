#!/usr/bin/env node
/**
 * FINORA release versioning — single source of truth.
 *
 * `package.json` holds the base SemVer version (`X.Y.Z`). `app.json` must mirror
 * it as `expo.version`, and the Android `versionCode` / iOS `buildNumber` are
 * derived deterministically:
 *
 *   versionCode = major * 1_000_000 + minor * 1_000 + patch
 *
 * This is reproducible, strictly increasing for increasing SemVer, and never
 * depends on a mutable counter that could move backwards.
 *
 * Usage:
 *   node scripts/version.js --check                 # verify app.json is in sync
 *   node scripts/version.js --sync                  # rewrite app.json from package.json
 *   node scripts/version.js --tag=v1.2.3-beta.1     # validate a release tag + sync
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PKG_PATH = path.join(ROOT, "package.json");
const APP_PATH = path.join(ROOT, "app.json");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const TAG_STABLE = /^v(\d+\.\d+\.\d+)$/;
const TAG_BETA = /^v(\d+\.\d+\.\d+)-beta\.(\d+)$/;
const TAG_PREVIEW = /^v(\d+\.\d+\.\d+)-preview[-.]([A-Za-z0-9]+)$/;

function fail(message) {
  console.error(`[version] ERROR: ${message}`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function computeVersionCode(version) {
  const match = SEMVER.exec(version);
  if (!match) {
    fail(`package.json version "${version}" is not a valid X.Y.Z SemVer.`);
  }
  const [, majorRaw, minorRaw, patchRaw] = match;
  const major = Number(majorRaw);
  const minor = Number(minorRaw);
  const patch = Number(patchRaw);
  if (minor > 999 || patch > 999) {
    fail(`minor and patch must be <= 999 (got ${version}).`);
  }
  return major * 1_000_000 + minor * 1_000 + patch;
}

function classifyTag(tag) {
  if (TAG_STABLE.test(tag)) return { kind: "stable", base: TAG_STABLE.exec(tag)[1] };
  if (TAG_BETA.test(tag)) return { kind: "beta", base: TAG_BETA.exec(tag)[1] };
  if (TAG_PREVIEW.test(tag)) return { kind: "preview", base: TAG_PREVIEW.exec(tag)[1] };
  return null;
}

function validateTag(tag, version) {
  const classified = classifyTag(tag);
  if (!classified) {
    fail(
      `tag "${tag}" has an unsupported format. Expected vX.Y.Z, vX.Y.Z-beta.N or vX.Y.Z-preview-<sha>.`
    );
  }
  if (classified.base !== version) {
    fail(
      `tag "${tag}" targets version ${classified.base}, but package.json is ${version}. ` +
        `Bump package.json (and run "npm run version:sync") before tagging.`
    );
  }
  return classified.kind;
}

function readState() {
  const pkg = readJson(PKG_PATH);
  const app = readJson(APP_PATH);
  const version = pkg.version;
  const versionCode = computeVersionCode(version);
  return { pkg, app, version, versionCode };
}

function check() {
  const { app, version, versionCode } = readState();
  const errors = [];

  if (app.expo?.version !== version) {
    errors.push(`app.json expo.version is "${app.expo?.version}" but package.json is "${version}".`);
  }
  if (app.expo?.android?.versionCode !== versionCode) {
    errors.push(
      `app.json android.versionCode is "${app.expo?.android?.versionCode}" but expected ${versionCode}.`
    );
  }
  if (Number(app.expo?.ios?.buildNumber) !== versionCode) {
    errors.push(
      `app.json ios.buildNumber is "${app.expo?.ios?.buildNumber}" but expected ${versionCode}.`
    );
  }

  if (errors.length > 0) {
    console.error("[version] app.json is out of sync with package.json:");
    for (const error of errors) console.error(`  - ${error}`);
    console.error('Run "npm run version:sync" to fix.');
    process.exit(1);
  }

  console.log(`[version] OK — version ${version}, versionCode ${versionCode}.`);
}

function sync() {
  const { app, version, versionCode } = readState();

  app.expo = app.expo || {};
  app.expo.version = version;
  app.expo.android = app.expo.android || {};
  app.expo.android.versionCode = versionCode;
  app.expo.ios = app.expo.ios || {};
  app.expo.ios.buildNumber = String(versionCode);

  fs.writeFileSync(APP_PATH, `${JSON.stringify(app, null, 2)}\n`, "utf8");
  console.log(`[version] app.json updated — version ${version}, versionCode ${versionCode}.`);
}

function main() {
  const args = process.argv.slice(2);
  const tagArg = args.find((arg) => arg.startsWith("--tag="));

  if (args.includes("--sync")) {
    sync();
    return;
  }

  if (tagArg) {
    const { version } = readState();
    const kind = validateTag(tagArg.slice("--tag=".length).trim(), version);
    check();
    console.log(`[version] tag OK — kind=${kind}, base=${version}.`);
    return;
  }

  // Default action is a consistency check.
  check();
}

main();
