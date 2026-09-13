import { Platform } from "react-native";
import { getDefaultDeviceProfile } from "../deviceProfile";

describe("deviceProfile", () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    (Platform as any).OS = originalPlatformOS;
  });

  it("returns iOS profile when platform is explicitly 'ios'", () => {
    const profile = getDefaultDeviceProfile("ios");
    expect(profile.supportedContainers).toContain("mov");
    expect(profile.supportedContainers).not.toContain("mkv");
    expect(profile.supportedContainers).not.toContain("webm");
    expect(profile.supportedVideoCodecs).not.toContain("vp9");
    expect(profile.supportedAudioCodecs).not.toContain("opus");
    expect(profile.supportedAudioCodecs).toContain("alac");
    expect(profile.maxBitrate).toBe(80000000);
  });

  it("returns Android profile when platform is explicitly 'android'", () => {
    const profile = getDefaultDeviceProfile("android");
    expect(profile.supportedContainers).toContain("mkv");
    expect(profile.supportedContainers).toContain("webm");
    expect(profile.supportedVideoCodecs).toContain("vp9");
    expect(profile.supportedAudioCodecs).toContain("opus");
    expect(profile.maxBitrate).toBe(100000000);
  });

  it("resolves default platform using Platform.OS", () => {
    (Platform as any).OS = "ios";
    const iosProfile = getDefaultDeviceProfile();
    expect(iosProfile.supportedContainers).not.toContain("mkv");

    (Platform as any).OS = "android";
    const androidProfile = getDefaultDeviceProfile();
    expect(androidProfile.supportedContainers).toContain("mkv");
  });

  it("falls back to Platform.OS when platform argument is 'default'", () => {
    (Platform as any).OS = "ios";
    const iosProfile = getDefaultDeviceProfile("default");
    expect(iosProfile.supportedContainers).not.toContain("mkv");

    (Platform as any).OS = "android";
    const androidProfile = getDefaultDeviceProfile("default");
    expect(androidProfile.supportedContainers).toContain("mkv");
  });
});
