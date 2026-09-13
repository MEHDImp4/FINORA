export const glass = {
  tabBar: {
    backgroundColor: "rgba(18, 18, 26, 0.76)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderHighlight: "rgba(255, 255, 255, 0.28)",
    activePillBackground: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 16
  },
  pill: {
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    activeBackground: "rgba(255, 255, 255, 0.18)",
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 8
  },
  panel: {
    backgroundColor: "rgba(20, 20, 28, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.09)",
    borderTopColor: "rgba(255, 255, 255, 0.16)"
  },
  card: {
    backgroundColor: "rgba(24, 24, 34, 0.68)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.22)",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 12
  }
} as const;
