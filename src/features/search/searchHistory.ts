import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../stores/authStore";

export const SEARCH_HISTORY_BASE_KEY = "@finora_search_history";
export const SEARCH_HISTORY_STORAGE_KEY = SEARCH_HISTORY_BASE_KEY;
export const MAX_SEARCH_HISTORY_ITEMS = 10;

export interface SearchHistoryScope {
  serverId?: string;
  userId?: string;
}

/**
 * Returns an account-scoped storage key for search history.
 * Format: @finora_search_history:{serverId}:{userId}
 * Falls back to @finora_search_history:unauthenticated when no active account exists.
 */
export function getSearchHistoryStorageKey(scope?: SearchHistoryScope): string {
  const serverId = scope?.serverId ?? useAuthStore.getState().session?.serverId;
  const userId = scope?.userId ?? useAuthStore.getState().session?.userId;

  if (serverId && userId) {
    return `${SEARCH_HISTORY_BASE_KEY}:${serverId}:${userId}`;
  }
  return `${SEARCH_HISTORY_BASE_KEY}:unauthenticated`;
}

/**
 * Service to manage local search history with deduplication, account-scoping, and size capping.
 */
export const searchHistoryService = {
  /**
   * Retrieves the current search history list for the active or provided account.
   */
  async getRecentSearches(scope?: SearchHistoryScope): Promise<string[]> {
    const key = getSearchHistoryStorageKey(scope);
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Adds a search term to history for the active or provided account:
   * - Trims whitespace
   * - Ignores empty strings
   * - Case-insensitively deduplicates (moves term to top)
   * - Caps list to MAX_SEARCH_HISTORY_ITEMS
   */
  async addSearchTerm(term: string, scope?: SearchHistoryScope): Promise<string[]> {
    const trimmed = term ? term.trim() : "";
    if (!trimmed) {
      return this.getRecentSearches(scope);
    }

    const key = getSearchHistoryStorageKey(scope);
    try {
      const current = await this.getRecentSearches(scope);
      // Remove any case-insensitive duplicates
      const filtered = current.filter(
        (existing) => existing.toLowerCase() !== trimmed.toLowerCase()
      );
      // Prepend the new term
      const updated = [trimmed, ...filtered].slice(0, MAX_SEARCH_HISTORY_ITEMS);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated;
    } catch {
      return [trimmed];
    }
  },

  /**
   * Removes a specific search term from history for the active or provided account.
   */
  async removeSearchTerm(term: string, scope?: SearchHistoryScope): Promise<string[]> {
    const trimmed = term ? term.trim() : "";
    if (!trimmed) {
      return this.getRecentSearches(scope);
    }

    const key = getSearchHistoryStorageKey(scope);
    try {
      const current = await this.getRecentSearches(scope);
      const updated = current.filter(
        (existing) => existing.toLowerCase() !== trimmed.toLowerCase()
      );
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  /**
   * Clears the search history for the active or provided account.
   */
  async clearSearchHistory(scope?: SearchHistoryScope): Promise<void> {
    const key = getSearchHistoryStorageKey(scope);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore clear errors
    }
  }
};
