export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const }
} as const;

export type TypographyVariant = keyof typeof typography;
