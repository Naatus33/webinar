/** Paleta WebinarPro (SaaS) — alinhada a globals.css */
export const theme = {
  colors: {
    bgDeep: "#2D3250",
    surface: "#424769",
    muted: "#676F9D",
    accent: "#F9B17A",
    white: "#FFFFFF",
    positive: "#27AE60",
    /** @deprecated use accent — mantido para gráficos legados */
    vermelho: "#F9B17A",
    pretoElevado: "#424769",
    cinzaClaro: "#424769",
    branco: "#FFFFFF",
    verde: "#27AE60",
    textoSecundario: "#676F9D",
    borda: "#676F9D",
  },
  semantic: {
    bgPage: "#2D3250",
    bgCard: "#424769",
    bgCardAlt: "#424769",
    borderDefault: "#676F9D",
    textPrimary: "#FFFFFF",
    textSecondary: "#676F9D",
    accent: "#F9B17A",
    positive: "#27AE60",
  },
} as const;

export type AppTheme = typeof theme;
