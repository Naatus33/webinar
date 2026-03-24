import { z } from "zod";

import type { WebinarConfig } from "@/lib/webinar-templates";

export const defaultWebinarBrandingSchema = z.object({
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

export const userPreferencesSchema = z.object({
  version: z.literal(1).default(1),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  uiDensity: z.enum(["comfortable", "compact"]).default("comfortable"),
  defaultWebinarBranding: defaultWebinarBrandingSchema.optional(),
  lastWebinarTemplateId: z.string().nullable().optional(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  version: 1,
  theme: "system",
  uiDensity: "comfortable",
  defaultWebinarBranding: undefined,
  lastWebinarTemplateId: undefined,
};

export function parseUserPreferences(raw: unknown): UserPreferences {
  const parsed = userPreferencesSchema.safeParse(raw ?? {});
  if (parsed.success) {
    return parsed.data;
  }
  return DEFAULT_USER_PREFERENCES;
}

const patchSchema = userPreferencesSchema.partial().omit({ version: true });

export function parseUserPreferencesPatch(raw: unknown): Partial<UserPreferences> {
  const parsed = patchSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export function mergeUserPreferences(
  prev: UserPreferences,
  patch: Partial<UserPreferences>,
): UserPreferences {
  const { defaultWebinarBranding: bPatch, ...rest } = patch;
  const next: UserPreferences = {
    ...prev,
    ...rest,
    version: 1,
  };
  if (bPatch !== undefined) {
    next.defaultWebinarBranding = {
      ...prev.defaultWebinarBranding,
      ...bPatch,
    };
  }
  return parseUserPreferences(next);
}

export function mergeWebinarConfigWithUserDefaults(
  config: WebinarConfig,
  prefs: UserPreferences,
): WebinarConfig {
  const b = prefs.defaultWebinarBranding;
  if (!b) return config;
  const hasAny = b.logo != null || b.primaryColor != null || b.secondaryColor != null;
  if (!hasAny) return config;
  return {
    ...config,
    branding: {
      ...config.branding,
      ...(b.logo !== undefined ? { logo: b.logo } : {}),
      ...(b.primaryColor !== undefined ? { primaryColor: b.primaryColor } : {}),
      ...(b.secondaryColor !== undefined ? { secondaryColor: b.secondaryColor } : {}),
    },
  };
}
