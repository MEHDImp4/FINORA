const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

/**
 * Adds Picture-in-Picture support to the Android manifest and iOS Info.plist.
 *
 * Android: sets android:supportsPictureInPicture="true" on MainActivity and
 *          android:configChanges to include screenLayout|smallestScreenSize
 *          so the activity doesn't restart when entering/exiting PiP.
 *
 * iOS:     sets AVPictureInPictureEnabled to true (required for PiP on iOS 14+).
 */
module.exports = function withPiP(config) {
  // Android manifest
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app?.activity) return config;

    const mainActivity = app.activity.find(
      (a) => a.$?.["android:name"] === ".MainActivity"
    );

    if (mainActivity) {
      // Enable PiP support
      mainActivity.$["android:supportsPictureInPicture"] = "true";
      mainActivity.$["android:resizeableActivity"] = "true";

      // Ensure configChanges includes PiP-required values so activity is not recreated
      const existing = mainActivity.$["android:configChanges"] || "";
      const required = ["screenSize", "smallestScreenSize", "screenLayout", "orientation"];
      const parts = existing.split("|").map((s) => s.trim()).filter(Boolean);
      for (const val of required) {
        if (!parts.includes(val)) {
          parts.push(val);
        }
      }
      mainActivity.$["android:configChanges"] = parts.join("|");
    }

    return config;
  });

  // iOS Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults["AVPictureInPictureEnabled"] = true;
    return config;
  });

  return config;
};
