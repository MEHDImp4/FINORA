export type LibrarySortBy = "SortName" | "PremiereDate" | "CommunityRating" | "DateCreated";
export type LibrarySortOrder = "Ascending" | "Descending";

export interface SortOption {
  id: string;
  label: string;
  sortBy: LibrarySortBy;
  sortOrder: LibrarySortOrder;
}

export const AVAILABLE_SORT_OPTIONS: SortOption[] = [
  {
    id: "title-asc",
    label: "Title (A to Z)",
    sortBy: "SortName",
    sortOrder: "Ascending"
  },
  {
    id: "title-desc",
    label: "Title (Z to A)",
    sortBy: "SortName",
    sortOrder: "Descending"
  },
  {
    id: "date-desc",
    label: "Release Date (Newest first)",
    sortBy: "PremiereDate",
    sortOrder: "Descending"
  },
  {
    id: "date-asc",
    label: "Release Date (Oldest first)",
    sortBy: "PremiereDate",
    sortOrder: "Ascending"
  },
  {
    id: "rating-desc",
    label: "Rating (Highest first)",
    sortBy: "CommunityRating",
    sortOrder: "Descending"
  },
  {
    id: "added-desc",
    label: "Date Added (Recently added)",
    sortBy: "DateCreated",
    sortOrder: "Descending"
  }
];
