import { useState, useEffect, useCallback, useRef } from "react";

export type NetworkFailureType = "no_internet" | "server_unreachable" | "unknown";

export interface NetworkDiagnosticResult {
  hasInternet: boolean;
  isServerReachable: boolean;
  failureType: NetworkFailureType;
}

const CONNECTIVITY_TEST_URLS = [
  "https://clients3.google.com/generate_204",
  "https://www.google.com/generate_204",
  "https://cloudflare.com/cdn-cgi/trace"
];

/**
 * Checks if the device has actual internet access by probing public lightweight endpoints.
 */
export async function checkInternetReachability(timeoutMs: number = 2000): Promise<boolean> {
  for (const url of CONNECTIVITY_TEST_URLS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "GET",
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

    // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout, 404 or 5xx: backend container is stopped
    if (response.status >= 500 || response.status === 404 || response.status < 200 || response.status >= 400) {
      return false;
    }

    // Validate that the response is actual Jellyfin JSON, not an HTML error page from Nginx/OpenResty
    try {
      const data = await response.json();
      return Boolean(data && (data.ServerName || data.Version || data.Id));
    } catch {
      return false;
    }
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

export interface UseNetworkDiagnosticOptions {
  isError?: boolean;
  autoCheck?: boolean;
}

/**
 * React hook that dynamically detects failure types when errors occur or on demand.
 */
export function useNetworkDiagnostic(
  serverUrl?: string,
  triggerOrOptions: boolean | UseNetworkDiagnosticOptions = false
) {
  const isError =
    typeof triggerOrOptions === "boolean"
      ? triggerOrOptions
      : Boolean(triggerOrOptions?.isError);

  const autoCheck =
    typeof triggerOrOptions === "object"
      ? Boolean(triggerOrOptions?.autoCheck)
      : false;

  const [failureType, setFailureType] = useState<NetworkFailureType | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const activeCheckRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runDiagnostic = useCallback(async (): Promise<NetworkFailureType> => {
    const checkId = ++activeCheckRef.current;
    if (isMountedRef.current) {
      setIsChecking(true);
    }
    try {
      const result = await diagnoseNetworkFailure(serverUrl);
      if (isMountedRef.current && activeCheckRef.current === checkId) {
        setFailureType(result);
      }
      return result;
    } catch {
      if (isMountedRef.current && activeCheckRef.current === checkId) {
        setFailureType("unknown");
      }
      return "unknown";
    } finally {
      if (isMountedRef.current && activeCheckRef.current === checkId) {
        setIsChecking(false);
      }
    }
  }, [serverUrl]);

  useEffect(() => {
    if (isError || autoCheck) {
      runDiagnostic();
    } else {
      if (isMountedRef.current) {
        setFailureType(null);
      }
    }
  }, [isError, autoCheck, runDiagnostic]);

  return {
    failureType,
    isChecking,
    runDiagnostic
  };
}
