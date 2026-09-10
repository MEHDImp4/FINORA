import "react-native-url-polyfill/auto";

/**
 * Validates and ensures that runtime polyfills for Jellyfin SDK are installed.
 */
export function ensurePolyfills(): void {
  if (typeof globalThis.URL !== "function" || typeof globalThis.URLSearchParams !== "function") {
    throw new Error("FINORA Polyfill Error: URL or URLSearchParams is not defined globally.");
  }
}

// Auto-run on import
ensurePolyfills();
