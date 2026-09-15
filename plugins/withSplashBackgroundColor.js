const { withAndroidStyles, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SPLASH_BG_COLOR = "#0A0A0C";

/**
 * Fixes the white flash on Android by:
 * 1. Setting the AppTheme windowBackground to match the splash backgroundColor
 * 2. Setting the windowSplashScreenBackground on API 31+
 */
module.exports = function withSplashBackgroundColor(config) {
  // Modify styles.xml to set windowBackground on AppTheme
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;

    // Find the AppTheme style
    const appTheme = styles.resources?.style?.find(
      (s) => s.$?.["name"] === "AppTheme" || s.$?.["name"] === "Theme.AppCompat.NoActionBar"
    );

    if (appTheme) {
      // Remove existing windowBackground if any
      if (appTheme.item) {
        appTheme.item = appTheme.item.filter(
          (item) => item.$?.["name"] !== "android:windowBackground"
        );
      } else {
        appTheme.item = [];
      }

      // Add the correct windowBackground
      appTheme.item.push({
        $: { "name": "android:windowBackground" },
        _: SPLASH_BG_COLOR
      });
    }

    return config;
  });

  // Also patch the colors.xml to ensure splash screen background matches
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.platformProjectRoot;
      const colorsPath = path.join(root, "app/src/main/res/values/colors.xml");

      if (fs.existsSync(colorsPath)) {
        let colors = fs.readFileSync(colorsPath, "utf-8");

        // Ensure splash_screen_background is set to our dark color
        if (colors.includes("splash_screen_background")) {
          colors = colors.replace(
            /<color name="splash_screen_background">[^<]*<\/color>/,
            `<color name="splash_screen_background">${SPLASH_BG_COLOR}</color>`
          );
        }

        fs.writeFileSync(colorsPath, colors);
      }

      return config;
    }
  ]);

  return config;
};
