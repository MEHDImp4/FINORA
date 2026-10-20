import { matchesDownloadIdentity } from "../downloadAuthContext";

describe("download identity across active transports", () => {
  it("keeps a download authorized when the same server switches from WAN to LAN", () => {
    expect(
      matchesDownloadIdentity(
        {
          serverId: "server-1",
          userId: "user-1",
          serverUrl: "https://jellyfin.example.com"
        },
        {
          serverId: "server-1",
          userId: "user-1",
          serverUrl: "http://192.168.1.50:8096"
        }
      )
    ).toBe(true);
  });

  it("still rejects another server or another user regardless of URL", () => {
    const stored = {
      serverId: "server-1",
      userId: "user-1",
      serverUrl: "https://jellyfin.example.com"
    };

    expect(
      matchesDownloadIdentity(stored, {
        serverId: "server-2",
        userId: "user-1",
        serverUrl: "https://jellyfin.example.com"
      })
    ).toBe(false);

    expect(
      matchesDownloadIdentity(stored, {
        serverId: "server-1",
        userId: "user-2",
        serverUrl: "https://jellyfin.example.com"
      })
    ).toBe(false);
  });
});
