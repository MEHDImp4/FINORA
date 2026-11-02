import json
from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one occurrence, found {count}: {old[:120]!r}")
    return text.replace(old, new, 1)

# package scripts are deterministic; dependency versions are managed by npm/expo install in CI.
package_path = Path("package.json")
package = json.loads(package_path.read_text())
package["scripts"]["lint"] = "eslint ."
package["scripts"]["lint:fix"] = "eslint . --fix"
package_path.write_text(json.dumps(package, indent=2) + "\n")

Path("eslint.config.js").write_text(r'''const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const tseslint = require("typescript-eslint");

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "android/**",
      "ios/**",
      "coverage/**",
      "dist/**",
      ".planning/**"
    ]
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      eqeqeq: ["error", "always"],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
]);
''')

jest_path = Path("jest.config.js")
jest = jest_path.read_text()
if "coverageThreshold" not in jest:
    jest = replace_once(
        jest,
        '  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],',
        '''  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  coverageThreshold: {
    global: {
      statements: 79,
      branches: 65,
      functions: 69,
      lines: 80
    }
  },'''
    )
jest_path.write_text(jest)

Path(".planning/quick/20261101-hardening-offline-quality/NATIVE_COMPATIBILITY.md").write_text(r'''# FINORA native compatibility baseline

Measured on 2026-11-01 with Node 22, Expo SDK 57 and React Native 0.86.3.

## Why `legacy-peer-deps=true` remains

A clean `npm ls --all` currently reports peer/dependency conflicts outside the core Android runtime path, including:

- `@jellyfin/sdk@0.13.0` declares `axios@^1.12.0` but the SDK path used by FINORA does not install it itself.
- Radix/vaul web transitive packages declare `react-dom` peers while FINORA is primarily an Android React Native client.
- `react-native-drawer-layout` declares `react-native-gesture-handler` and `react-native-reanimated` peers through routing/navigation dependencies.
- The baseline also reported an Expo patch mismatch (`expo-linking`) and a transitive `ws` range conflict.

Removing `legacy-peer-deps=true` before those peer graphs are reconciled would make reproducible `npm ci` fail even though the current Android application builds. The setting is therefore retained deliberately, not treated as proof of compatibility.

## Expo SDK alignment

The hardening branch runs `expo install --fix` and then requires `expo-doctor` to pass in CI. Patch/minor versions are aligned to the installed SDK rather than suppressing Doctor globally.

## `react-native-background-actions`

FINORA keeps `react-native-background-actions` because the download subsystem relies on a foreground Android service to protect active downloads. `plugins/withBackgroundService.js` explicitly registers the native package/service and the required foreground-service permissions.

Risk: the package is not relied on as an Expo-managed compatibility guarantee and remains excluded from the React Native Directory advisory check. The meaningful compatibility gate is an Expo prebuild followed by `./gradlew assembleDebug` on every PR/master CI run.

Fallback: FINORA's foreground service wrapper treats native-service availability as best-effort; download persistence/resume metadata remains independent, so a missing background service must not corrupt the queue or persisted catalog.

## Tested stack

The CI native gate records compatibility by compiling the generated Android project for the exact dependency lockfile on each change. Any future Expo/RN/New Architecture upgrade must keep `expo-doctor`, TypeScript/tests, and the Android Gradle build green before merge.
''')

print("Phase 3 quality configuration patched; workflow files are updated separately through GitHub")
