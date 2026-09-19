const { injectLegacyAndroidPiPFallback } = require("../withPiP");

describe("withPiP legacy Android fallback", () => {
  it("injects Android 8-11 Home-gesture PiP without affecting Android 12+ auto-enter", () => {
    const input = `package com.finora.app

import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}
`;

    const output = injectLegacyAndroidPiPFallback(input);

    expect(output).toContain("FINORA_LEGACY_AUTO_PIP_FALLBACK");
    expect(output).toContain("override fun onUserLeaveHint()");
    expect(output).toContain("Build.VERSION.SDK_INT >= Build.VERSION_CODES.S");
    expect(output).toContain('it.name == "enterPictureInPicture"');
    expect(output).toContain("expo.modules.video.SurfaceVideoView");
  });

  it("is idempotent", () => {
    const input = `package com.finora.app

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
}
`;

    const once = injectLegacyAndroidPiPFallback(input);
    const twice = injectLegacyAndroidPiPFallback(once);

    expect(twice).toBe(once);
    expect((twice.match(/FINORA_LEGACY_AUTO_PIP_FALLBACK/g) || []).length).toBe(1);
  });
});
