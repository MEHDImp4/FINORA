---
quick_id: 261013-pvt
slug: fix-apk-signing-unify-release-keystore-s
task: 261013-pvt
date: 2026-10-13
status: complete
subsystem: ci
tags: [github-actions, apksigner, android, release-signing, composite-action, keystore, certificate-pinning]

requires:
  - provides: "Existing build-apk.yml pipeline (quality/classify/preview/beta/stable jobs) and the ANDROID_KEYSTORE_* repository secrets that signed stable v1.0.0"
provides:
  - "Composite action .github/actions/sign-release-apk (fail-closed secret gate + pinned cert assert + v1/v2/v3 signing)"
  - "All three channels (preview/beta/stable) signing through the same composite action"
affects: [android-release, ci, install-compatibility]

actuals:
  tokens: 3666
  tasks: 2
  commits: 2

tech-stack:
  added: [GitHub Actions composite action]
  patterns: [fail-closed signing gates, certificate SHA-256 pinning, secrets-via-step-env for composite actions]

key-files:
  created: [".github/actions/sign-release-apk/action.yml"]
  modified: [".github/workflows/build-apk.yml"]

key-decisions:
  - "Single composite action owns decode/sign/verify — workflow files never touch the keystore again (only 'base64 -d' inside the action)"
  - "Secrets reach the composite action only via step-level env mapping (secrets context unavailable in composite actions); fail-closed gates both at job level and inside the action"
  - "Pinned cert SHA-256 5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7 is the regression guard; rotation procedure documented in the action header"

requirements-completed: []
---

# Summary: 261013-pvt — Unify release-keystore APK signing across all channels

**All three APK channels (preview, beta, stable) now sign through one fail-closed composite action that pins the FINORA release certificate digest, ending debug-signed preview/beta builds and INSTALL_FAILED_UPDATE_INCOMPATIBLE.**

## What was done

The pipeline previously signed only the stable channel with the release keystore; `build-preview` and `build-beta` published the Gradle `assembleRelease` output directly, and Expo prebuild (CNG) signs release builds with the **debug keystore** when no keystore is configured. Released `v1.0.0-beta.9` was debug-signed (`CN=Android Debug`), so installing stable over it (or the reverse — same `versionCode 1000000`) failed with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` on devices such as Samsung.

1. **Task 1 — Composite signing action** (`.github/actions/sign-release-apk/action.yml`, new):
   - Inputs `apk_path` (file or directory, resolved to the single `*.apk`) and `output_name` (signed APK written to workspace root); output `apk_path`.
   - Step-level `env:` maps the four secrets from the caller (the `secrets` context is unavailable inside composite actions).
   - Fail-closed gate: any empty `KEYSTORE_BASE64` / `KEYSTORE_PASSWORD` / `KEY_ALIAS` / `KEY_PASSWORD` → `::error::` + exit 1.
   - Newest `apksigner` under `$ANDROID_HOME`/`$ANDROID_SDK_ROOT` build-tools; keystore decoded to `$RUNNER_TEMP/finora-release.keystore` (never the workspace) and shredded immediately after signing.
   - Explicit `--v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true`.
   - Verify: `apksigner verify --verbose --print-certs` teed to `apksigner-verify.txt` (workspace root, stable still publishes it); refuses `CN=Android Debug`; asserts `Signer #1 certificate SHA-256 digest: 5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7`.
   - Header comment documents the cert (`CN=Diouri Mehdi`, RSA 4096, signer of stable v1.0.0) and the one-commit rotation procedure.

2. **Task 2 — Wire all three jobs** (`.github/workflows/build-apk.yml`):
   - `build-preview` / `build-beta`: `Require release signing secrets` fail-closed step inserted right after `Resolve release metadata` (same early placement as stable, so a missing-secrets run dies before the expensive Gradle build); the old `Prepare artifact & checksum` (which copied the raw Gradle output) is replaced by `Sign APK with release keystore` (`uses: ./.github/actions/sign-release-apk`, secrets via step `env:`) plus a slimmed `Prepare artifact & checksum` that now checksums the **release-signed** bytes.
   - `build-release`: the inline `Sign APK with release keystore` + `Verify APK signature` steps are replaced by one `Sign and verify APK with release keystore` step calling the same action; `Require release signing secrets`, `Inspect APK manifest and permissions`, `Compute checksum`, and the publish `files:` list (APK, `.sha256`, `apk-inspection.txt`, `apksigner-verify.txt`) are unchanged.
   - `quality` / `classify` jobs, `version.js`, and publish/prerelease flags untouched.

## Task Commits

1. **Task 1: Create the composite signing action** — `70a8734` (ci) `ci: add composite release-keystore APK signing action`
2. **Task 2: Wire all three channel jobs through the action** — `345ce8c` (ci) `ci: sign all APK channels with release keystore, pin cert fingerprint`

## Files Created/Modified

| File | Change |
|------|--------|
| `.github/actions/sign-release-apk/action.yml` | New composite action: fail-closed secret gate, keystore decode to `$RUNNER_TEMP` + shred, v1+v2+v3 sign, verify, debug-cert refusal, pinned SHA-256 assert |
| `.github/workflows/build-apk.yml` | Preview/beta: secrets gate + composite signing before checksum; stable: inline sign/verify replaced by the composite action |

## Verification

Both plan `<verify>` commands re-run after the final commit, all green:

```
$ python3 -c "import yaml; a=yaml.safe_load(open('.github/actions/sign-release-apk/action.yml')); assert a['runs']['using']=='composite'; assert set(a['inputs'])=={'apk_path','output_name'}; assert 'apk_path' in a['outputs']; print('action ok')" && grep -q '5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7' .github/actions/sign-release-apk/action.yml && grep -q 'CN=Android Debug' .github/actions/sign-release-apk/action.yml && grep -q 'base64 -d' .github/actions/sign-release-apk/action.yml
action ok

$ python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build-apk.yml')); print('workflow ok')" && [ "$(grep -v '^[[:space:]]*#' .github/workflows/build-apk.yml | grep -c 'uses: ./.github/actions/sign-release-apk')" -eq 3 ] && [ "$(grep -c 'Require release signing secrets' .github/workflows/build-apk.yml)" -eq 3 ] && [ "$(grep -c 'base64 --decode' .github/workflows/build-apk.yml)" -eq 0 ] && npm run version:check
workflow ok
uses: 3 (expect 3) | gates: 3 (expect 3) | base64 --decode: 0 (expect 0)
[version] OK — version 1.0.0, versionCode 1000000.
```

Done criteria confirmed: action exists, parses as YAML, declares the two inputs and `apk_path` output, pins the release certificate digest, refuses the debug cert, fails closed on missing secrets; all three jobs call the action exactly once; each job has the fail-closed secrets gate; keystore decode/sign/verify logic exists only in the action; workflow parses and `version:check` passes.

## Deviations from Plan

None — plan executed exactly as written.

(Note: `branching_strategy: "none"` in `.planning/config.json` means this project commits directly to `master`, per GSD docs "all work commits to current branch" and recent history — both code commits landed there by design.)

## Known Stubs

None. No placeholder values, TODOs, or unwired data in either file.

## Threat Flags

None — all new security-relevant surface (keystore secrets, signing, publish trust anchor) was already covered by the plan's threat register (T-261013-01/02/03/SC).

## User Setup Required

None — no external service configuration required. (The four `ANDROID_KEYSTORE_*` repository secrets must already exist; the pipeline now fails loudly instead of publishing if any is missing.)

## Next Phase Readiness

Manual follow-up (not an automated gate): after merge, dispatch a **preview** build (`workflow_dispatch`, target `preview`) and confirm the job completes with signer `CN=Diouri Mehdi` and SHA-256 digest `5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7`, then confirm a stable APK installs over a previously installed preview/beta APK without `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

---
*Quick task: 261013-pvt*
*Completed: 2026-10-13*
