---
quick_id: 261013-pvt
slug: fix-apk-signing-unify-release-keystore-s
description: "Fix APK signing: unify release keystore signing across preview/beta/stable channels (fail-closed) with cert fingerprint pinning"
date: 2026-10-13
status: ready
mode: quick
must_haves:
  truths:
    - "Every channel (preview, beta, stable) publishes an APK whose signer certificate SHA-256 digest equals the pinned FINORA release certificate 5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7; a fingerprint mismatch or a CN=Android Debug signer fails the job before publication."
    - "If any of the four ANDROID_KEYSTORE_* signing secrets is missing, the preview and beta jobs fail loudly before building (and the composite action re-checks fail-closed); no channel can ever publish a debug-signed APK."
    - "Installing a stable APK over a previously installed preview/beta APK (or vice versa) no longer fails with INSTALL_FAILED_UPDATE_INCOMPATIBLE, because all channels ship the same signer certificate."
    - "The .sha256 checksum published for each channel hashes the release-signed APK bytes, not the Gradle debug-signed intermediate."
    - "Stable keeps publishing apksigner-verify.txt and apk-inspection.txt as release assets, unchanged."
  artifacts:
    - ".github/actions/sign-release-apk/action.yml (new) — composite sign+verify action with pinned certificate constant"
    - ".github/workflows/build-apk.yml — preview, beta, and release jobs all wired through the composite action"
  key_links:
    - "build-preview/build-beta/build-release -> uses: ./.github/actions/sign-release-apk with the four ANDROID_KEYSTORE_* secrets passed via step-level env"
    - "composite action -> newest apksigner under $ANDROID_HOME/$ANDROID_SDK_ROOT build-tools (same find | sort -V | tail -n1 pattern the stable job already uses)"
    - "composite action verify step -> PINNED_CERT_SHA256 constant (regression guard against debug signing ever shipping again)"
---

# Quick Task 261013-pvt: Unify release-keystore APK signing across all channels

**Date:** 2026-10-13
**Slug:** fix-apk-signing-unify-release-keystore-s

## Problem

`.github/workflows/build-apk.yml` signs only the **stable** channel with the release
keystore. `build-preview` and `build-beta` publish the Gradle `assembleRelease` output
directly, and Expo prebuild (CNG) signs release builds with the **debug keystore** when no
keystore is configured. Verified on released `v1.0.0-beta.9`: signer DN = `CN=Android Debug`
(SHA-256 `fac61745…`), while stable `v1.0.0` is signed `CN=Diouri Mehdi` (SHA-256
`5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7`, RSA 4096). All channels
share `versionCode 1000000`, so installing a stable APK over any preview/beta install (or the
reverse) fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` — the bare « Application non
installée » toast on Samsung devices.

## Locked decisions (from user — non-negotiable)

1. **CI pipeline only.** No docs changes, no ABI splits, no versionCode scheme change.
2. **Fail-closed everywhere:** if signing secrets are missing, preview (and beta, and stable)
   fail loudly — never a debug-signed fallback.
3. **Cert fingerprint pinning:** the signed APK's signer cert SHA-256 must equal the pinned
   constant `5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7` — the regression
   guard that prevents debug-signing from ever shipping again.

## Task 1 — Create the composite signing action

**files**
- `.github/actions/sign-release-apk/action.yml` (new)

**action**

1. Create the composite action with this exact contract:
   - `inputs.apk_path` — Gradle-built release APK file, **or** the directory containing it
     (callers pass `android/app/build/outputs/apk/release`; the action resolves a directory
     to the single `*.apk` inside via `find … -name '*.apk' | head -n 1`, preserving the
     existing "APK not found" error behavior). Mark `required: true`.
   - `inputs.output_name` — published APK filename; the signed APK is written to the
     workspace root under this name (matches the current stable behavior so the publish and
     checksum steps keep working). `required: true`.
   - `outputs.apk_path` — `value: ${{ steps.sign.outputs.apk_path }}`, where the sign step
     writes `apk_path=$OUTPUT_NAME` to `$GITHUB_OUTPUT`.
   - `runs.using: composite`; every step declares `shell: bash`.
2. Add a **top-of-file YAML comment block** (before `name:`) that: names the pinned
   fingerprint constant as the SHA-256 of the FINORA release signing certificate
   (`CN=Diouri Mehdi`, RSA 4096 — the cert that signed stable v1.0.0), states that ANY
   mismatch fails every channel build on purpose, and documents the rotation procedure:
   sign once with the new keystore, read the new digest from
   `apksigner verify --verbose --print-certs <apk>`, then update the constant in the SAME
   commit that rotates the `ANDROID_KEYSTORE_*` repository secrets.
3. Single step `id: sign`, `name: Sign and verify (fail-closed)`, with a step-level `env:`
   block that explicitly maps (composite sub-steps do not inherit the caller's env
   automatically; `${{ env.* }}` resolves against the calling step's env):
   - `INPUT_APK_PATH: ${{ inputs.apk_path }}`, `INPUT_OUTPUT_NAME: ${{ inputs.output_name }}`
   - `KEYSTORE_BASE64: ${{ env.KEYSTORE_BASE64 }}`, `KEYSTORE_PASSWORD: ${{ env.KEYSTORE_PASSWORD }}`,
     `KEY_ALIAS: ${{ env.KEY_ALIAS }}`, `KEY_PASSWORD: ${{ env.KEY_PASSWORD }}`
   Secrets reach the action ONLY through these env mappings (the `secrets` context is
   unavailable inside composite actions); callers set them on the `uses:` step's `env:`.
   The shell reads them as quoted variables and never echoes their values.
4. The step's script (`set -euo pipefail`), in order:
   a. Define `PINNED_CERT_SHA256="5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7"`
      with a short comment pointing to the header rotation procedure.
   b. **Fail-closed secret gate:** if any of `${KEYSTORE_BASE64:-}` / `${KEYSTORE_PASSWORD:-}` /
      `${KEY_ALIAS:-}` / `${KEY_PASSWORD:-}` is empty → `::error::` naming the four secret
      names and `exit 1`. Use the `:-` default form so an unset variable fails closed with
      the clear message instead of a `set -u` abort.
   c. Resolve `INPUT_APK_PATH` (directory → single `*.apk`; fail if none).
   d. Locate apksigner: `find "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}/build-tools" -name apksigner | sort -V | tail -n 1`; fail if not found.
   e. Decode the keystore with `printf '%s' "$KEYSTORE_BASE64" | base64 -d > "$RUNNER_TEMP/finora-release.keystore"`
      (temp file lives under `$RUNNER_TEMP`, never the workspace, so it can never ride along
      in an artifact).
   f. Sign:
      `"$APKSIGNER" sign --ks "$KEYSTORE_FILE" --ks-key-alias "$KEY_ALIAS" --ks-pass "pass:$KEYSTORE_PASSWORD" --key-pass "pass:$KEY_PASSWORD" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$INPUT_OUTPUT_NAME" "$RELEASE_APK"`
      (explicit v1+v2+v3 — deterministic regardless of apksigner defaults for minSdk 24).
   g. Destroy the temp keystore: `shred -u "$KEYSTORE_FILE" 2>/dev/null || rm -f "$KEYSTORE_FILE"`.
   h. `"$APKSIGNER" verify --verbose --print-certs "$INPUT_OUTPUT_NAME" | tee apksigner-verify.txt`
      (non-zero exit with pipefail fails the job on an invalid signature; the file is written
      to the workspace root because stable publishes it as a release asset).
   i. Refuse a debug cert: `grep -qiE 'CN=Android Debug' apksigner-verify.txt` → `::error::` + `exit 1`
      (belt-and-braces; keeps the stable job's existing refusal behavior inside the action).
   j. Assert the pin: the verify output must contain
      `Signer #1 certificate SHA-256 digest: $PINNED_CERT_SHA256` (case-insensitive grep);
      otherwise `::error::` stating the actual signer does not match the pinned release
      certificate and pointing to the rotation procedure, then `exit 1`.
   k. Write `apk_path=$INPUT_OUTPUT_NAME` to `$GITHUB_OUTPUT`.
5. No other files, no third-party actions, no package installs — the action runs only bash
   plus the runner's preinstalled SDK tools.

**verify**
- `python3 -c "import yaml; a=yaml.safe_load(open('.github/actions/sign-release-apk/action.yml')); assert a['runs']['using']=='composite'; assert set(a['inputs'])=={'apk_path','output_name'}; assert 'apk_path' in a['outputs']; print('action ok')" && grep -q '5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7' .github/actions/sign-release-apk/action.yml && grep -q 'CN=Android Debug' .github/actions/sign-release-apk/action.yml && grep -q 'base64 -d' .github/actions/sign-release-apk/action.yml`

**done**
- The action exists, parses as YAML, declares the two inputs and the `apk_path` output,
  pins the release certificate digest, refuses the debug cert, and fails closed on missing
  secrets.

## Task 2 — Wire all three channel jobs through the action

**files**
- `.github/workflows/build-apk.yml`

**action**

1. **`build-preview` and `build-beta` (identical edits in both jobs):**
   a. Insert a fail-closed step named `Require release signing secrets` immediately AFTER the
      existing `Resolve release metadata` step (same early placement as the stable job, so a
      missing-secrets run fails before the expensive Gradle build). Comment it
      `# FAIL-CLOSED: preview/beta must never fall back to debug/default signing.`
      Copy the stable job's existing step verbatim: step-level `env:` mapping the four
      `${{ secrets.ANDROID_KEYSTORE_* }}` values, `set -euo pipefail`, and a guard that
      `::error::`s and exits 1 when any of the four is empty.
   b. REPLACE the existing `Prepare artifact & checksum` step (which currently `find`s and
      copies the Gradle output) with TWO steps placed after the Build step:
      - `Sign APK with release keystore` — `uses: ./.github/actions/sign-release-apk` with
        step-level `env:` carrying the same four secrets and
        `with: apk_path: android/app/build/outputs/apk/release`,
        `output_name: ${{ steps.meta.outputs.apk_name }}`.
      - `Prepare artifact & checksum` (same name, slimmed): assert
        `[ -f "$APK_NAME" ]` (the action produced the signed file), then
        `sha256sum "$APK_NAME" > "$APK_NAME.sha256"` and `cat` it — the checksum now hashes
        the release-signed bytes.
   c. Leave the publish steps and step-summary steps untouched (they already reference
      `steps.meta.outputs.apk_name`).
2. **`build-release`:** REPLACE the inline `Sign APK with release keystore` and
   `Verify APK signature (fail on debug certificate)` steps with ONE step
   `Sign and verify APK with release keystore` calling
   `uses: ./.github/actions/sign-release-apk` — same `env:` secrets map, same
   `apk_path`/`output_name` wiring as the preview/beta call. Everything else stays: the
   early `Require release signing secrets` step, `Inspect APK manifest and permissions`,
   `Compute checksum`, and the publish step's `files:` list (which keeps working because
   the action still writes `apksigner-verify.txt` and the signed `APK_NAME` to the
   workspace root).
3. Do not touch the `quality` or `classify` jobs, the `version.js` invocation, or any
   publish/prerelease flags.

**verify**
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build-apk.yml')); print('workflow ok')" && [ "$(grep -v '^[[:space:]]*#' .github/workflows/build-apk.yml | grep -c 'uses: ./.github/actions/sign-release-apk')" -eq 3 ] && [ "$(grep -c 'Require release signing secrets' .github/workflows/build-apk.yml)" -eq 3 ] && [ "$(grep -c 'base64 --decode' .github/workflows/build-apk.yml)" -eq 0 ] && npm run version:check`

**done**
- All three jobs call the composite action exactly once; each job has the fail-closed
  secrets gate; the keystore decode/sign/verify logic exists only inside the composite
  action; the workflow still parses and `version:check` still passes.

## Threat model

### Trust boundaries

| Boundary | Description |
|----------|-------------|
| GitHub repo secrets → CI step env | `ANDROID_KEYSTORE_*` secrets cross into runner memory; masked in logs, must never be echoed |
| Expo prebuild/Gradle output → signing step | The Gradle-built APK is debug-signed and untrusted until re-signed and verified |
| Signed APK + checksum → release consumers | End users sideload these APKs; signature identity is the only install-time trust anchor |

### STRIDE threat register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261013-01 | Tampering / Spoofing | build-preview, build-beta published APKs | high | mitigate | Every channel re-signs through the composite action; fail-closed secret gates; pinned cert digest assert + `CN=Android Debug` refusal make publishing a debug-signed APK impossible — the job dies first |
| T-261013-02 | Information Disclosure | keystore handling in CI | medium | mitigate | Secrets enter only via step-level `env` (GitHub masks values in all logs); keystore decoded to `$RUNNER_TEMP` (never the workspace, never an artifact) and shredded immediately after signing; scripts read secrets as quoted shell variables and never print them |
| T-261013-03 | Denial of Service (availability) | pinned fingerprint constant | low | accept | A stale pin after keystore rotation fails every channel build loudly instead of shipping a wrongly signed APK — fail-closed is the locked intent; the in-file rotation procedure keeps the failure recoverable in one commit |
| T-261013-SC | Tampering (supply chain) | composite action dependencies | high | mitigate | The action introduces no third-party `uses:` and no package-manager installs; it runs only bash plus the runner's preinstalled `apksigner` |

## Validation (overall)

- Task 1 and Task 2 `<verify>` commands above (YAML parse + structural greps + `version:check`).
- `npm run version:check` confirmed green at plan time (`[version] OK — version 1.0.0, versionCode 1000000`); it is a regression sanity check only — this change does not touch `scripts/version.js`.

## Manual follow-up (not an automated gate)

After merge, dispatch a **preview** build (workflow_dispatch, target `preview`) and verify
end-to-end: the job completes, and the published APK's signer is `CN=Diouri Mehdi` with
SHA-256 digest `5380f4293f2c1cba309cd152dfd064790da80b36bb016d0eaef04a151e7dc8e7`
(`apksigner verify --verbose --print-certs FINORA-v*-preview-*.apk`). Then confirm a stable
APK installs over a previously installed preview/beta APK without
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

## Commit

Conventional style per repo history (`ci:`): `ci: sign all APK channels with release keystore, pin cert fingerprint`.
