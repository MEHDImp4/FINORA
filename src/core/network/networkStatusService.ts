import { useState, useEffect, useCallback, useRef } from "react";

export type NetworkFailureType = "no_internet" | "server_unreachable" | "unknown";

export interface NetworkDiagnosticResult {
  hasInternet: boolean;
  isServerReachable: boolean;
  failureType: NetworkFailureType;
}

const CONNECTIVITY_TEST_URLS = [
  "https://clients3.google.com/generate_204",
  "https://1.1.1.1"
];

/**
 * Checks if the device has actual internet access by probing public lightweight endpoints.
 */
export async function checkInternetReachability(timeoutMs: number = 2500): Promise<boolean> {
  for (const url of CONNECTIVITY_TEST_URLS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" }
      });
      clearTimeout(timer);

      if (response.status >= 200 && response.status < 400) {
        return true;
      }
    } catch {
      // Continue to fallback probe
    }
  }

  return false;
}

/**
 * Checks if the configured Jellyfin server is reachable.
 * Jellyfin exposes /System/Info/Public without authentication.
 */
export async function checkServerReachability(
  serverUrl: string,
  timeoutMs: number = 2500
): Promise<boolean> {
  if (!serverUrl || typeof serverUrl !== "string") {
    return false;
  }

  const cleanUrl = serverUrl.trim().replace(/\/+$/, "");
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    return false;
  }

  const endpoint = `${cleanUrl}/System/Info/Public`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json", "Cache-Control": "no-cache" }
    });
    clearTimeout(timer);

    // Any HTTP response (even 401/403/500) confirms the host and port are alive
    return response.status >= 200 && response.status < 600;
  } catch {
    return false;
  }
}

/**
 * Diagnoses whether a request failure was caused by device offline status
 * or by the Jellyfin server being stopped/unreachable.
 */
export async function diagnoseNetworkFailure(
  serverUrl?: string,
  timeoutMs: number = 2500
): Promise<NetworkFailureType> {
  const hasInternet = await checkInternetReachability(timeoutMs);
  if (!hasInternet) {
    return "no_internet";
  }

  if (serverUrl) {
    const isServerReachable = await checkServerReachability(serverUrl, timeoutMs);
    if (!isServerReachable) {
      return "server_unreachable";
    }
  }

  return "unknown";
}

/**
 * React hook that dynamically detects failure types when errors occur.
 */
export function useNetworkDiagnostic(serverUrl?: string, isError: boolean = false) {
  const [failureType, setFailureType] = useState<NetworkFailureType | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const activeCheckRef = useRef<number>(0);

  const runDiagnostic = useCallback(async (): Promise<NetworkFailureType> => {
    const checkId = ++activeCheckRef.current;
    setIsChecking(true);
    try {
      const result = await diagnoseNetworkFailure(serverUrl);
      if (activeCheckRef.current === checkId) {
        setFailureType(result);
      }
      return result;
    } catch {
      if (activeCheckRef.current === checkId) {
        setFailureType("unknown");
      }
      return "unknown";
    } finally {
      if (activeCheckRef.current === checkId) {
        setIsChecking(false);
      }
    }
  }, [serverUrl]);

  useEffect(() => {
    if (isError) {
      runDiagnostic();
    } else {
      setFailureType(null);
    }
  }, [isError, runDiagnostic]);

  return {
    failureType,
    isChecking,
    runDiagnostic
  };
}
