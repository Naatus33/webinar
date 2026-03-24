export type WebinarConfig = {
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
  capturePage?: {
    logoPosition: "left" | "center";
    logoSize: "sm" | "md" | "lg";
    overlayOpacity: number; // 0–0.8
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
  };
  chat: { enabled: boolean; mode: "live" | "replay"; readonly: boolean };
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
  branding: { logo: "", primaryColor: "#7C3AED", secondaryColor: "#EC4899" },
  capturePage: {
    logoPosition: "left",
    logoSize: "md",
    overlayOpacity: 0.5,
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
    message: "Vagas limitadas!",
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
  },
  chat: { enabled: true, mode: "live", readonly: false },
  participants: { enabled: true, min: 100, max: 500, autoVariation: true },
  layout: { 
    chatPosition: "right", 
    playerSize: "large", 
    bgColor: "#0F172A",
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
};

export const webinarTemplates: WebinarTemplate[] = [
  {
    id: "blank",
    name: "Em branco",
    niche: "Geral",
    description: "Comece do zero com configurações neutras.",
    previewBg: "#1e293b",
    config: defaultConfig,
  },
  {
    id: "infoproduto-dark",
    name: "Infoproduto Dark",
    niche: "Infoproduto",
    description: "Layout escuro e impactante com paleta roxo + dourado.",
    previewBg: "#1a0533",
    config: {
      ...defaultConfig,
      branding: { logo: "", primaryColor: "#7C3AED", secondaryColor: "#F59E0B" },
      content: {
        title: "A Fórmula Secreta para [Resultado Desejado]",
        subtitle: "Webinar exclusivo e gratuito",
        description: "Descubra como alcançar [resultado] em [prazo] mesmo que você [objeção].",
      },
      layout: { ...defaultConfig.layout, chatPosition: "right", playerSize: "large", bgColor: "#0D0514" },
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
      branding: { logo: "", primaryColor: "#16A34A", secondaryColor: "#0EA5E9" },
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
      branding: { logo: "", primaryColor: "#2563EB", secondaryColor: "#EA580C" },
      content: {
        title: "Domine [Habilidade] em tempo recorde",
        subtitle: "Aula inaugural gratuita",
        description: "Conteúdo prático e direto ao ponto para quem quer resultados reais.",
      },
      layout: { ...defaultConfig.layout, chatPosition: "right", playerSize: "large", bgColor: "#0f172a" },
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
      branding: { logo: "", primaryColor: "#06B6D4", secondaryColor: "#8B5CF6" },
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
