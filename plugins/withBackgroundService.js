const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const LIB_NAME = "react-native-background-actions";
const PKG_IMPORT = "import com.asterinet.react.bgactions.BackgroundActionsPackage";
const PKG_INSTANCE = "BackgroundActionsPackage()";
const SVC_NAME = "com.asterinet.react.bgactions.RNBackgroundActionsTask";

module.exports = function withBackgroundService(config) {
  // 1. AndroidManifest: permissions + service
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const perms = manifest.manifest["uses-permission"];
    for (const name of ["android.permission.FOREGROUND_SERVICE", "android.permission.FOREGROUND_SERVICE_DATA_SYNC"]) {
      if (!perms.some((p) => p.$?.["android:name"] === name)) {
        perms.push({ $: { "android:name": name } });
      }
    }
    const app = manifest.manifest.application?.[0];
    if (app) {
      if (!app.service) app.service = [];
      const existing = app.service.find((s) => s.$?.["android:name"] === SVC_NAME);
      if (existing) {
        existing.$["android:foregroundServiceType"] = "dataSync";
        existing.$["android:exported"] = "false";
      } else {
        app.service.push({ $: { "android:name": SVC_NAME, "android:foregroundServiceType": "dataSync", "android:exported": "false" } });
      }
    }
    return config;
  });

  // 2. Gradle + MainApplication via dangerous mod (single pass)
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.platformProjectRoot;

      // settings.gradle
      const settingsPath = path.join(root, "settings.gradle");
      if (fs.existsSync(settingsPath)) {
        let s = fs.readFileSync(settingsPath, "utf-8");
        if (!s.includes(LIB_NAME)) {
          s += `\ninclude ':${LIB_NAME}'\nproject(':${LIB_NAME}').projectDir = new File(rootProject.projectDir, '../node_modules/${LIB_NAME}/android')\n`;
          fs.writeFileSync(settingsPath, s);
        }
      }

      // app/build.gradle
      const appGradle = path.join(root, "app/build.gradle");
      if (fs.existsSync(appGradle)) {
        let g = fs.readFileSync(appGradle, "utf-8");
        if (!g.includes(LIB_NAME)) {
          g = g.replace(/dependencies\s*\{/, `dependencies {\n    implementation project(':${LIB_NAME}')`);
          fs.writeFileSync(appGradle, g);
        }
      }

      // MainApplication.kt
      const mainApp = path.join(root, "app/src/main/java/com/finora/app/MainApplication.kt");
      if (fs.existsSync(mainApp)) {
        let m = fs.readFileSync(mainApp, "utf-8");
        if (!m.includes(PKG_IMPORT)) {
          m = m.replace(/import expo\.modules\.ApplicationLifecycleDispatcher/, `${PKG_IMPORT}\nimport expo.modules.ApplicationLifecycleDispatcher`);
        }
        if (!m.includes(PKG_INSTANCE)) {
          m = m.replace(
            /\/\/ Packages that cannot be autolinked yet can be added manually here.*\n/,
            `$&        add(${PKG_INSTANCE})\n`
          );
        }
        fs.writeFileSync(mainApp, m);
      }

      return config;
    }
  ]);

  return config;
};
