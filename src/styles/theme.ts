/** Paleta Coal / Crimson / Gravel / Snow — alinhada a globals.css */
export const theme = {
  colors: {
    coal: "#000000",
    crimson: "#8B0000",
    gravel: "#808080",
    snow: "#FFFFFF",
    bgDeep: "#242424",
    surface: "#2F2F2F",
    surfaceElevated: "#383838",
    muted: "#B3B3B3",
    accent: "#8B0000",
    white: "#FFFFFF",
    positive: "#15803D",
    /** @deprecated use accent — mantido para gráficos legados */
    vermelho: "#8B0000",
    pretoElevado: "#333333",
    cinzaClaro: "#404040",
    branco: "#FAFAFA",
    verde: "#15803D",
    textoSecundario: "#808080",
    borda: "#A3A3A3",
  },
  semantic: {
    bgPage: "#242424",
    bgCard: "#2F2F2F",
    bgCardAlt: "#383838",
    borderDefault: "#909090",
    textPrimary: "#FAFAFA",
    textSecondary: "#B3B3B3",
    accent: "#8B0000",
    positive: "#15803D",
  },
} as const;

export type AppTheme = typeof theme;
