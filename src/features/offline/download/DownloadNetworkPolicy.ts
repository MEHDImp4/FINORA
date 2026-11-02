import { isWifiConnected } from "../../../core/network/networkStatusService";

/** Centralized network gate for queued/restored/new downloads. */
export async function isDownloadNetworkAllowed(wifiOnly: boolean): Promise<boolean> {
  if (!wifiOnly) return true;
  return isWifiConnected();
}
