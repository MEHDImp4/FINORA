export const colors = {
  background: "#0A0A0C",
  card: "#14141A",
  surface: "#1E1E28",
  border: "#2A2A38",
  borderSubtle: "#1C1C26",
  primary: "#E50914",
  primaryHover: "#F40612",
  accent: "#FFB800",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0B2",
  textMuted: "#76768B",
  error: "#FF3B30",
  success: "#34C759"
} as const;

export type ColorToken = keyof typeof colors;
