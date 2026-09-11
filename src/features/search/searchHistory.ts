import AsyncStorage from "@react-native-async-storage/async-storage";

export const SEARCH_HISTORY_STORAGE_KEY = "@finora_search_history";
export const MAX_SEARCH_HISTORY_ITEMS = 10;

/**
 * Service to manage local search history with deduplication and size capping.
 */
export const searchHistoryService = {
  /**
   * Retrieves the current search history list.
   */
  async getRecentSearches(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
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
   * Adds a search term to history:
   * - Trims whitespace
   * - Ignores empty strings
   * - Case-insensitively deduplicates (moves term to top)
   * - Caps list to MAX_SEARCH_HISTORY_ITEMS
   */
  async addSearchTerm(term: string): Promise<string[]> {
    const trimmed = term ? term.trim() : "";
    if (!trimmed) {
      return this.getRecentSearches();
    }

    try {
      const current = await this.getRecentSearches();
      // Remove any case-insensitive duplicates
      const filtered = current.filter(
        (existing) => existing.toLowerCase() !== trimmed.toLowerCase()
      );
      // Prepend the new term
      const updated = [trimmed, ...filtered].slice(0, MAX_SEARCH_HISTORY_ITEMS);
      await AsyncStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [trimmed];
    }
  },

  /**
   * Removes a specific search term from history.
   */
  async removeSearchTerm(term: string): Promise<string[]> {
    const trimmed = term ? term.trim() : "";
    if (!trimmed) {
      return this.getRecentSearches();
    }

    try {
      const current = await this.getRecentSearches();
      const updated = current.filter(
        (existing) => existing.toLowerCase() !== trimmed.toLowerCase()
      );
      await AsyncStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  /**
   * Clears the entire search history.
   */
  async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    } catch {
      // Ignore clear errors
    }
  }
};
