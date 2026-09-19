const { withAndroidManifest, withInfoPlist, withMainActivity } = require("expo/config-plugins");

const FINORA_PIP_FALLBACK_MARKER = "FINORA_LEGACY_AUTO_PIP_FALLBACK";

function injectLegacyAndroidPiPFallback(contents) {
  if (contents.includes(FINORA_PIP_FALLBACK_MARKER)) return contents;

  const classAnchor = "class MainActivity : ReactActivity() {";
  if (!contents.includes(classAnchor)) {
    throw new Error("[withPiP] Unable to locate Kotlin MainActivity class for legacy PiP fallback.");
  }

  const requiredImports = [
    "import android.os.Build",
    "import android.view.View",
    "import android.view.ViewGroup"
  ].filter((line) => !contents.includes(line));

  if (requiredImports.length > 0) {
    const packageMatch = contents.match(/^package[^\n]*\n/m);
    if (!packageMatch) {
      throw new Error("[withPiP] Unable to locate MainActivity package declaration.");
    }
    contents = contents.replace(
      packageMatch[0],
      `${packageMatch[0]}\n${requiredImports.join("\n")}\n`
    );
  }

  const fallback = `
  // ${FINORA_PIP_FALLBACK_MARKER}
  // expo-video's automatic Home-gesture PiP uses Android 12+ auto-enter.
  // Android 8-11 require an onUserLeaveHint fallback. FINORA only mounts an
  // Expo VideoView on the player route, so detecting that native view prevents
  // unrelated screens from entering PiP.
  private fun findVisibleFinoraVideo(view: View?): View? {
    if (view == null || !view.isShown) return null

    val className = view.javaClass.name
    if (
      className == "expo.modules.video.VideoView" ||
      className == "expo.modules.video.SurfaceVideoView" ||
      className == "expo.modules.video.TextureVideoView"
    ) {
      return view
    }

    if (view is ViewGroup) {
      for (index in 0 until view.childCount) {
        val match = findVisibleFinoraVideo(view.getChildAt(index))
        if (match != null) return match
      }
    }

    return null
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()

    // Android 12+ is handled by expo-video's startsPictureInPictureAutomatically
    // via PictureInPictureParams.setAutoEnterEnabled(true).
    if (
      Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    ) {
      return
    }

    val videoView = findVisibleFinoraVideo(window?.decorView) ?: return

    try {
      // Call the public expo-video View method through reflection so this config
      // plugin stays decoupled from expo-video's internal Kotlin class names.
      videoView.javaClass.methods
        .firstOrNull { it.name == "enterPictureInPicture" && it.parameterCount == 0 }
        ?.invoke(videoView)
    } catch (_: Exception) {
      // PiP is best-effort on OEM builds. Manual PiP remains available.
    }
  }

`;

  return contents.replace(classAnchor, `${classAnchor}${fallback}`);
}

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

  // Android 8-11: Home gesture/button requires onUserLeaveHint().
  // Android 12+ remains on expo-video's smoother setAutoEnterEnabled path.
  config = withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      throw new Error("[withPiP] FINORA expects a Kotlin MainActivity.");
    }
    config.modResults.contents = injectLegacyAndroidPiPFallback(
      config.modResults.contents
    );
    return config;
  });

  // iOS Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults["AVPictureInPictureEnabled"] = true;
    return config;
  });

  return config;
};


module.exports.injectLegacyAndroidPiPFallback = injectLegacyAndroidPiPFallback;
