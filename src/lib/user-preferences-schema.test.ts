import { describe, expect, it } from "vitest";

import { getDefaultConfig } from "@/lib/webinar-templates";

import {
  mergeWebinarConfigWithUserDefaults,
  parseUserPreferences,
} from "./user-preferences-schema";

describe("parseUserPreferences", () => {
  it("aplica defaults quando JSON inválido", () => {
    const p = parseUserPreferences({ foo: 1 });
    expect(p.theme).toBe("system");
    expect(p.version).toBe(1);
  });

  it("aceita tema válido", () => {
    const p = parseUserPreferences({ theme: "dark", version: 1 });
    expect(p.theme).toBe("dark");
  });
});

describe("mergeWebinarConfigWithUserDefaults", () => {
  it("sobrepõe branding do utilizador", () => {
    const base = getDefaultConfig();
    const merged = mergeWebinarConfigWithUserDefaults(base, {
      version: 1,
      theme: "system",
      uiDensity: "comfortable",
      defaultWebinarBranding: {
        primaryColor: "#FF0000",
        logo: "https://example.com/logo.png",
      },
    });
    expect(merged.branding.primaryColor).toBe("#FF0000");
    expect(merged.branding.logo).toBe("https://example.com/logo.png");
  });
});
