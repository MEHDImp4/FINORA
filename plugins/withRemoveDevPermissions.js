const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Removes development-only Android permissions from the generated manifest.
 *
 * `expo prebuild` seeds the app manifest from the Expo/React Native template,
 * which includes `SYSTEM_ALERT_WINDOW` (used by the React Native development
 * menu to draw overlays). FINORA does not use system overlays in production, so
 * the permission is stripped from the main manifest. The React Native `debug`
 * variant manifest re-declares it for development builds, so dev tooling is not
 * affected while release artifacts no longer request "Draw over other apps".
 */
const DEV_ONLY_PERMISSIONS = ["android.permission.SYSTEM_ALERT_WINDOW"];

module.exports = function withRemoveDevPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = manifest.manifest["uses-permission"];

    if (Array.isArray(permissions)) {
      manifest.manifest["uses-permission"] = permissions.filter((permission) => {
        const name = permission?.$?.["android:name"];
        return !DEV_ONLY_PERMISSIONS.includes(name);
      });
    }

    return config;
  });
};
