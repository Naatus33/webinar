export const theme = {
  colors: {
    vermelho: "#E63946",
    pretoElevado: "#1E1E1E",
    cinzaClaro: "#2C2C2C",
    branco: "#FFFFFF",
    verde: "#27AE60",
    textoSecundario: "#B0B0B0",
    borda: "#3A3A3A",
  },
  semantic: {
    bgPage: "#1E1E1E",
    bgCard: "#1E1E1E",
    bgCardAlt: "#2C2C2C",
    borderDefault: "#3A3A3A",
    textPrimary: "#FFFFFF",
    textSecondary: "#B0B0B0",
    accent: "#E63946",
    positive: "#27AE60",
  },
} as const;

export type AppTheme = typeof theme;
