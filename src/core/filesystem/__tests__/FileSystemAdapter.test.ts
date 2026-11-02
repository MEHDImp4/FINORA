import * as ExpoLegacyFileSystem from "expo-file-system/legacy";
import { ExpoLegacyFileSystemAdapter } from "../FileSystemAdapter";

describe("ExpoLegacyFileSystemAdapter", () => {
  it("delegates filesystem operations through the FINORA boundary", async () => {
    const adapter = new ExpoLegacyFileSystemAdapter();
    await adapter.getInfoAsync("file:///mock-documents/test.mp4");
    expect(ExpoLegacyFileSystem.getInfoAsync).toHaveBeenCalledWith(
      "file:///mock-documents/test.mp4"
    );
  });
});
