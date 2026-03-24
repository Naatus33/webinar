import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { getDefaultConfig, type WebinarConfig } from "@/lib/webinar-templates";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface WebinarMeta {
  id: string;
  name: string;
  slug: string;
  code: string;
  status: string;
  videoUrl: string;
  startDate: string | null;
  startTime: string | null;
  useNativeStreaming: boolean;
  redirectEnabled: boolean;
  redirectUrl: string | null;
  passwordEnabled: boolean;
  /** Indica se existe senha de captura definida no servidor (nunca enviar o valor ao cliente). */
  hasCapturePassword: boolean;
  replayEnabled: boolean;
  lgpdEnabled: boolean;
  lgpdText: string | null;
  regBgImage: string | null;
  regLogoUrl: string | null;
  regDescription: string | null;
  regTitle: string | null;
  regCtaText: string | null;
  regSponsors: { name: string; logoUrl: string }[];
}

interface WebinarStoreState {
  webinarId: string | null;
  meta: WebinarMeta | null;
  config: WebinarConfig;
  saveStatus: SaveStatus;
  lastSavedSnapshot: string | null;

  loadFromServer: (webinarId: string, meta: WebinarMeta, config: WebinarConfig) => void;
  updateConfig: <K extends keyof WebinarConfig>(
    section: K,
    updates: Partial<WebinarConfig[K]>
  ) => void;
  setConfigField: (path: string[], value: unknown) => void;
  resetFromTemplate: (config: WebinarConfig) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useWebinarStore = create<WebinarStoreState>()(
  subscribeWithSelector((set) => ({
    webinarId: null,
    meta: null,
    config: getDefaultConfig(),
    saveStatus: "idle",
    lastSavedSnapshot: null,

    loadFromServer(webinarId, meta, config) {
      const snap = JSON.stringify(config);
      set({ webinarId, meta, config, lastSavedSnapshot: snap, saveStatus: "idle" });
    },

    updateConfig(section, updates) {
      set((state) => ({
        config: {
          ...state.config,
          [section]: { ...state.config[section], ...updates },
        },
      }));
    },

    setConfigField(path, value) {
      set((state) => {
        const config = JSON.parse(JSON.stringify(state.config)) as Record<string, unknown>;
        let curr = config as Record<string, unknown>;
        for (let i = 0; i < path.length - 1; i++) {
          if (typeof curr[path[i]] !== "object") curr[path[i]] = {};
          curr = curr[path[i]] as Record<string, unknown>;
        }
        curr[path[path.length - 1]] = value;
        return { config: config as WebinarConfig };
      });
    },

    resetFromTemplate(config) {
      set({ config, saveStatus: "idle" });
    },

    setSaveStatus(status) {
      set({ saveStatus: status });
    },
  }))
);

// Debounced auto-save
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

useWebinarStore.subscribe(
  (state) => state.config,
  async (config) => {
    const { webinarId, lastSavedSnapshot, setSaveStatus } = useWebinarStore.getState();

    if (!webinarId) return;

    const snapshot = JSON.stringify(config);
    if (snapshot === lastSavedSnapshot) return; // sem mudanças reais

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/webinars/${webinarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        });

        if (res.ok) {
          useWebinarStore.setState({ lastSavedSnapshot: snapshot, saveStatus: "saved" });
          // Volta para "idle" após 2s
          setTimeout(() => {
            const curr = useWebinarStore.getState();
            if (curr.saveStatus === "saved") curr.setSaveStatus("idle");
          }, 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }, 1000);
  }
);
