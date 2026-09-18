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
    label: "Titre (A à Z)",
    sortBy: "SortName",
    sortOrder: "Ascending"
  },
  {
    id: "title-desc",
    label: "Titre (Z à A)",
    sortBy: "SortName",
    sortOrder: "Descending"
  },
  {
    id: "date-desc",
    label: "Date de sortie (plus récent)",
    sortBy: "PremiereDate",
    sortOrder: "Descending"
  },
  {
    id: "date-asc",
    label: "Date de sortie (plus ancien)",
    sortBy: "PremiereDate",
    sortOrder: "Ascending"
  },
  {
    id: "rating-desc",
    label: "Note (la plus élevée)",
    sortBy: "CommunityRating",
    sortOrder: "Descending"
  },
  {
    id: "added-desc",
    label: "Ajout récent",
    sortBy: "DateCreated",
    sortOrder: "Descending"
  }
];

export function getSortOptionLabel(id: string, t: (key: any) => string): string {
  switch (id) {
    case "title-asc":
      return t("library.sortTitleAsc");
    case "title-desc":
      return t("library.sortTitleDesc");
    case "date-desc":
      return t("library.sortDateDesc");
    case "date-asc":
      return t("library.sortDateAsc");
    case "rating-desc":
      return t("library.sortRatingDesc");
    case "added-desc":
      return t("library.sortAddedDesc");
    default:
      return id;
  }
}

