export type WebinarConfig = {
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
  capturePage?: {
    logoPosition: "left" | "center";
    logoSize: "sm" | "md" | "lg";
    /** Intensidade do véu escuro sobre a foto de capa (0.1–1). */
    overlayOpacity: number;
    /** Cor do véu em degradê sobre a imagem (hex). */
    overlayTintColor?: string;
    /** Texto abaixo do título do formulário (coluna direita). */
    formSubtitle?: string;
    /**
     * Ponto do fundo em percentuais (0..1) para renderizar `backgroundPosition`.
     * (0.5, 0.5) = central.
     */
    backgroundPosition?: { x: number; y: number };
    cardStyle: "solid" | "glass";
  };
  content: {
    title: string;
    subtitle: string;
    description: string;
  };
  video: {
    autoplay: boolean;
    hideControls: boolean;
  };
  offer: {
    active: boolean;
    position: string;
    url: string;
    colorTimer: {
      enabled: boolean;
      showCountdown: boolean;
      phases: {
        green: { seconds: number; text: string };
        yellow: { seconds: number; text: string };
        orange: { seconds: number; text: string };
        red: { seconds: number; text: string };
      };
    };
  };
  scarcity: {
    enabled: boolean;
    message: string;
    count: number;
    timer: {
      enabled: boolean;
      totalSeconds: number;
      thresholds: {
        green: { from: number; to: number };
        yellow: { from: number; to: number };
        orange: { from: number; to: number };
        red: { from: number; to: number };
      };
    };
    /** Urgência na sala: vagas exibidas que diminuem no tempo (sincronizado por `startedAt`). */
    urgency: {
      decreaseEnabled: boolean;
      startCount: number;
      endCount: number;
      durationSeconds: number;
      startedAt: string | null;
    };
  };
  chat: { enabled: boolean; mode: "live" | "replay"; readonly: boolean; adminOnly: boolean };
  participants: { enabled: boolean; min: number; max: number; autoVariation: boolean };
  layout: { 
    chatPosition: "right" | "left"; 
    playerSize: "large" | "medium"; 
    bgColor: string;
    ambilight: boolean; // NOVO: Controle de Ambilight
  };
  reactions: {
    enabled: boolean; // NOVO: Controle de Reações
    allowUserReactions: boolean;
  };
  countdown: { enabled: boolean; message: string; showOnCapture: boolean; showOnWatch: boolean };
  offerPopup: {
    enabled: boolean;
    delayMinutes: number;
    image: string;
    title: string;
    text: string;
    buttonText: string;
    buttonUrl: string;
    autoCloseSeconds: number;
  };
  finished: { message: string; showOfferButton: boolean; offerText: string; offerUrl: string };
  socialProof: {
    enabled: boolean;
    mode: "real" | "fake";
    frequency: number;
    duration: number;
    position: string;
    fakeNames: string[];
    fakeCities: string[]; // NOVO: Customização de cidades
  };
  captureCounter: { enabled: boolean; mode: "real" | "fake"; fakeBase: number };
  adminAvatar: { logoUrl: string; displayName: string };
  scarcityButton: {
    enabled: boolean;
    color: "green" | "yellow" | "orange" | "red";
    label: string;
    autoTimer: boolean;
    /** Legado: usado como fallback quando `phaseSeconds` não existe no JSON salvo. */
    timerSeconds: number;
    /** Duração em segundos de cada cor no ciclo automático (semáforo). */
    phaseSeconds: {
      green: number;
      yellow: number;
      orange: number;
      red: number;
    };
    /** Exibe contagem regressiva da fase atual no botão (sala pública). */
    showTimer: boolean;
    /** ISO 8601 — início da cor atual; atualizado ao mudar cor ou ligar o botão. */
    currentPhaseStartedAt: string | null;
  };
};

export type WebinarTemplate = {
  id: string;
  name: string;
  niche: string;
  description: string;
  previewBg: string;
  config: WebinarConfig;
};

const defaultConfig: WebinarConfig = {
  branding: { logo: "", primaryColor: "#8B0000", secondaryColor: "#808080" },
  capturePage: {
    logoPosition: "left",
    logoSize: "md",
    overlayOpacity: 0.5,
    overlayTintColor: "#000000",
    formSubtitle: "Preencha os dados para acessar a transmissão.",
    backgroundPosition: { x: 0.5, y: 0.5 },
    cardStyle: "glass",
  },
  content: { title: "", subtitle: "", description: "" },
  video: { autoplay: false, hideControls: false },
  offer: {
    active: false,
    position: "bottom",
    url: "",
    colorTimer: {
      enabled: false,
      showCountdown: false,
      phases: {
        green: { seconds: 300, text: "Quero participar!" },
        yellow: { seconds: 180, text: "Poucas vagas!" },
        orange: { seconds: 90, text: "Últimas vagas!" },
        red: { seconds: 30, text: "Esgotando agora!" },
      },
    },
  },
  scarcity: {
    enabled: false,
    message: "Últimas vagas disponíveis!",
    count: 50,
    timer: {
      enabled: true,
      totalSeconds: 600,
      thresholds: {
        green: { from: 600, to: 301 },
        yellow: { from: 300, to: 121 },
        orange: { from: 120, to: 31 },
        red: { from: 30, to: 0 },
      },
    },
    urgency: {
      decreaseEnabled: true,
      startCount: 10,
      endCount: 1,
      durationSeconds: 600,
      startedAt: null,
    },
  },
  chat: { enabled: true, mode: "live", readonly: false, adminOnly: false },
  participants: { enabled: true, min: 100, max: 500, autoVariation: true },
  layout: { 
    chatPosition: "right", 
    playerSize: "large", 
    bgColor: "#FAFAFA",
    ambilight: true 
  },
  reactions: {
    enabled: true,
    allowUserReactions: true
  },
  countdown: { enabled: true, message: "O webinar começa em:", showOnCapture: true, showOnWatch: true },
  offerPopup: { enabled: false, delayMinutes: 15, image: "", title: "", text: "", buttonText: "", buttonUrl: "", autoCloseSeconds: 0 },
  finished: { message: "Obrigado por participar!", showOfferButton: true, offerText: "Aproveite a oferta!", offerUrl: "" },
  socialProof: { 
    enabled: false, 
    mode: "fake", 
    frequency: 30, 
    duration: 5, 
    position: "bottom-left", 
    fakeNames: ["Maria S.", "João P.", "Ana R.", "Carlos M.", "Fernanda L."],
    fakeCities: ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre"]
  },
  captureCounter: { enabled: true, mode: "fake", fakeBase: 1200 },
  adminAvatar: { logoUrl: "", displayName: "Administrador" },
  scarcityButton: {
    enabled: false,
    color: "green",
    label: "Garanta sua vaga!",
    autoTimer: false,
    timerSeconds: 60,
    phaseSeconds: { green: 60, yellow: 60, orange: 60, red: 60 },
    showTimer: true,
    currentPhaseStartedAt: null,
  },
};

export const webinarTemplates: WebinarTemplate[] = [
  {
    id: "blank",
    name: "Em branco",
    niche: "Geral",
    description: "Comece do zero com configurações neutras.",
    previewBg: "#fafafa",
    config: defaultConfig,
  },
  {
    id: "infoproduto-dark",
    name: "Infoproduto Dark",
    niche: "Infoproduto",
    description: "Layout escuro e impactante com paleta roxo + dourado.",
    previewBg: "#0a0a0a",
    config: {
      ...defaultConfig,
      branding: { logo: "", primaryColor: "#8B0000", secondaryColor: "#808080" },
      content: {
        title: "A Fórmula Secreta para [Resultado Desejado]",
        subtitle: "Webinar exclusivo e gratuito",
        description: "Descubra como alcançar [resultado] em [prazo] mesmo que você [objeção].",
      },
      layout: { ...defaultConfig.layout, chatPosition: "right", playerSize: "large", bgColor: "#0a0a0a" },
      offer: {
        ...defaultConfig.offer,
        active: true,
        colorTimer: { ...defaultConfig.offer.colorTimer, enabled: true },
      },
      scarcity: { ...defaultConfig.scarcity, enabled: true, message: "Vagas se esgotando! Garanta a sua agora." },
      socialProof: { ...defaultConfig.socialProof, enabled: true },
    },
  },
  {
    id: "saude-clean",
    name: "Saúde Clean",
    niche: "Saúde",
    description: "Design limpo e confiável com cores verdes e brancas.",
    previewBg: "#f0fdf4",
    config: {
      ...defaultConfig,
      branding: { logo: "", primaryColor: "#15803D", secondaryColor: "#8B0000" },
      content: {
        title: "Como melhorar sua saúde em 30 dias",
        subtitle: "Webinar gratuito com especialista",
        description: "Aprenda métodos comprovados pela ciência para transformar sua saúde.",
      },
      layout: { ...defaultConfig.layout, chatPosition: "right", playerSize: "large", bgColor: "#f0fdf4" },
      chat: { ...defaultConfig.chat, enabled: true },
    },
  },
  {
    id: "educacao-azul",
    name: "Educação Azul",
    niche: "Educação",
    description: "Visual profissional azul + laranja para cursos e treinamentos.",
    previewBg: "#0f172a",
    config: {
      ...defaultConfig,
      branding: { logo: "", primaryColor: "#8B0000", secondaryColor: "#525252" },
      content: {
        title: "Domine [Habilidade] em tempo recorde",
        subtitle: "Aula inaugural gratuita",
        description: "Conteúdo prático e direto ao ponto para quem quer resultados reais.",
      },
      layout: { ...defaultConfig.layout, chatPosition: "right", playerSize: "large", bgColor: "#000000" },
      countdown: { ...defaultConfig.countdown, enabled: true },
    },
  },
  {
    id: "tech-minimal",
    name: "Tech Minimal",
    niche: "Tecnologia",
    description: "Design minimalista preto + ciano para produtos de tecnologia.",
    previewBg: "#000000",
    config: {
      ...defaultConfig,
      branding: { logo: "", primaryColor: "#8B0000", secondaryColor: "#808080" },
      content: {
        title: "O futuro de [tecnologia] está aqui",
        subtitle: "Demo ao vivo exclusiva",
        description: "Veja em primeira mão como esta tecnologia vai mudar sua empresa.",
      },
      layout: { ...defaultConfig.layout, chatPosition: "right", playerSize: "large", bgColor: "#000000" },
      chat: { ...defaultConfig.chat, mode: "live" },
    },
  },
];

export const getTemplateById = (id: string): WebinarTemplate | undefined =>
  webinarTemplates.find((t) => t.id === id);

export const getDefaultConfig = (): WebinarConfig => defaultConfig;

/** Mescla JSON antigo (sem `urgency` ou campos parciais) com o padrão. */
export function mergeScarcityConfig(
  partial: Partial<WebinarConfig["scarcity"]> | undefined | null,
): WebinarConfig["scarcity"] {
  const d = getDefaultConfig().scarcity;
  const s = partial ?? {};
  return {
    ...d,
    ...s,
    timer: {
      ...d.timer,
      ...s.timer,
      thresholds: {
        ...d.timer.thresholds,
        ...s.timer?.thresholds,
        green: { ...d.timer.thresholds.green, ...s.timer?.thresholds?.green },
        yellow: { ...d.timer.thresholds.yellow, ...s.timer?.thresholds?.yellow },
        orange: { ...d.timer.thresholds.orange, ...s.timer?.thresholds?.orange },
        red: { ...d.timer.thresholds.red, ...s.timer?.thresholds?.red },
      },
    },
    urgency: { ...d.urgency, ...s.urgency },
  };
}

/** Número inteiro de vagas exibido na urgência (diminui com o tempo se `decreaseEnabled`). */
export function computeUrgencyDisplayCount(
  scarcity: WebinarConfig["scarcity"],
  nowMs: number = Date.now(),
): number {
  const s = mergeScarcityConfig(scarcity);
  const u = s.urgency;
  if (!u.decreaseEnabled) {
    return Math.max(0, Math.floor(s.count));
  }
  if (!u.startedAt) {
    return Math.max(0, Math.floor(u.startCount));
  }
  const start = Date.parse(u.startedAt);
  if (!Number.isFinite(start)) return Math.max(0, Math.floor(u.startCount));
  const hi = Math.max(u.startCount, u.endCount);
  const lo = Math.min(u.startCount, u.endCount);
  const duration = Math.max(1, u.durationSeconds);
  const elapsed = Math.max(0, (nowMs - start) / 1000);
  const progress = Math.min(1, elapsed / duration);
  const raw = hi - (hi - lo) * progress;
  return Math.max(lo, Math.ceil(raw));
}

export type ResolvedScarcityButton = {
  enabled: boolean;
  color: WebinarConfig["scarcityButton"]["color"];
  label: string;
  autoTimer: boolean;
  phaseSeconds: { green: number; yellow: number; orange: number; red: number };
  showTimer: boolean;
  currentPhaseStartedAt: string | null;
};

function scarcityFlagOn(v: unknown): boolean {
  return v === true || v === 1 || v === "true" || v === "1";
}

/** Normaliza JSON antigo (sem `phaseSeconds` / `showTimer`) para uso no painel e na sala pública. */
export function resolveScarcityButton(config: WebinarConfig): ResolvedScarcityButton {
  const sb = config.scarcityButton ?? defaultConfig.scarcityButton;
  const legacy =
    typeof sb.timerSeconds === "number" && Number.isFinite(sb.timerSeconds) && sb.timerSeconds > 0
      ? sb.timerSeconds
      : 60;
  const ps = sb.phaseSeconds;
  const clamp = (n: unknown) => {
    const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : legacy;
    return Math.max(5, Math.min(86400, v > 0 ? v : legacy));
  };
  const col = sb.color;
  const safeColor =
    col === "green" || col === "yellow" || col === "orange" || col === "red" ? col : "green";
  return {
    enabled: scarcityFlagOn(sb.enabled),
    color: safeColor,
    label: typeof sb.label === "string" && sb.label.trim() ? sb.label : "Garanta sua vaga!",
    autoTimer: scarcityFlagOn(sb.autoTimer),
    phaseSeconds: {
      green: clamp(ps?.green),
      yellow: clamp(ps?.yellow),
      orange: clamp(ps?.orange),
      red: clamp(ps?.red),
    },
    showTimer: sb.showTimer !== false,
    currentPhaseStartedAt:
      typeof sb.currentPhaseStartedAt === "string" && sb.currentPhaseStartedAt.length > 0
        ? sb.currentPhaseStartedAt
        : null,
  };
}
