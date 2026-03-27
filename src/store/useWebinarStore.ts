import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { getDefaultConfig, type WebinarConfig } from "@/lib/webinar-templates";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface WebinarMeta {
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

/** Campos persistidos no PATCH além de config/macros (página de login + agenda). */
export type WebinarMetaPersistPatch = Pick<
  WebinarMeta,
  | "regBgImage"
  | "regLogoUrl"
  | "regDescription"
  | "regTitle"
  | "regCtaText"
  | "regSponsors"
  | "startDate"
  | "startTime"
>;

function metaPersistSnapshot(meta: WebinarMeta): WebinarMetaPersistPatch {
  return {
    regBgImage: meta.regBgImage,
    regLogoUrl: meta.regLogoUrl,
    regDescription: meta.regDescription,
    regTitle: meta.regTitle,
    regCtaText: meta.regCtaText,
    regSponsors: meta.regSponsors,
    startDate: meta.startDate,
    startTime: meta.startTime,
  };
}

function emptyStrToNull(s: string | null | undefined): string | null {
  if (s === undefined || s === null || s === "") return null;
  return s;
}

function metaPersistToApiBody(m: WebinarMetaPersistPatch): Record<string, unknown> {
  return {
    regBgImage: emptyStrToNull(m.regBgImage),
    regLogoUrl: emptyStrToNull(m.regLogoUrl),
    regDescription: emptyStrToNull(m.regDescription),
    regTitle: emptyStrToNull(m.regTitle),
    regCtaText: emptyStrToNull(m.regCtaText),
    regSponsors: m.regSponsors,
    startDate: m.startDate === "" || m.startDate === undefined ? null : m.startDate,
    startTime: m.startTime === "" || m.startTime === undefined ? null : m.startTime,
  };
}

interface WebinarStoreState {
  webinarId: string | null;
  meta: WebinarMeta | null;
  config: WebinarConfig;
  macros: unknown[];
  saveStatus: SaveStatus;
  lastSavedSnapshot: string | null;

  loadFromServer: (
    webinarId: string,
    meta: WebinarMeta,
    config: WebinarConfig,
    macros?: unknown[],
  ) => void;
  updateConfig: <K extends keyof WebinarConfig>(
    section: K,
    updates: Partial<WebinarConfig[K]>
  ) => void;
  updateMeta: (updates: Partial<WebinarMetaPersistPatch>) => void;
  updateWebinar: (patch: Partial<{ config: WebinarConfig; macros: unknown[] }>) => void;
  setConfigField: (path: string[], value: unknown) => void;
  resetFromTemplate: (config: WebinarConfig) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useWebinarStore = create<WebinarStoreState>()(
  subscribeWithSelector((set) => ({
    webinarId: null,
    meta: null,
    config: getDefaultConfig(),
    macros: [],
    saveStatus: "idle",
    lastSavedSnapshot: null,

    loadFromServer(webinarId, meta, config, macros = []) {
      const snap = JSON.stringify({
        config,
        macros,
        metaPersist: metaPersistSnapshot(meta),
      });
      set({ webinarId, meta, config, macros, lastSavedSnapshot: snap, saveStatus: "idle" });
    },

    updateConfig(section, updates) {
      set((state) => ({
        config: {
          ...state.config,
          [section]: { ...state.config[section], ...updates },
        },
      }));
    },

    updateMeta(updates) {
      set((state) => {
        if (!state.meta) return state;
        return {
          meta: { ...state.meta, ...updates },
        };
      });
    },

    updateWebinar(patch) {
      set((state) => ({
        ...state,
        ...patch
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
  (state) => ({
    config: state.config,
    macros: state.macros,
    metaPersist: state.meta ? metaPersistSnapshot(state.meta) : null,
  }),
  async ({ config, macros, metaPersist }) => {
    const { webinarId, lastSavedSnapshot, setSaveStatus } = useWebinarStore.getState();

    if (!webinarId) return;

    const snapshot = JSON.stringify({ config, macros, metaPersist });
    if (snapshot === lastSavedSnapshot) return;

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const body: Record<string, unknown> = { config, macros };
        if (metaPersist) Object.assign(body, metaPersistToApiBody(metaPersist));

        const res = await fetch(`/api/webinars/${webinarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          useWebinarStore.setState({ lastSavedSnapshot: snapshot, saveStatus: "saved" });
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
