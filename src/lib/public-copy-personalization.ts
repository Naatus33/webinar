/**
 * Merge fields no copy público (captura / sala) e overrides opcionais por query string.
 *
 * Query: wp_headline, wp_subtitle, wp_desc — sobrescrevem título do formulário, subtítulo e texto da coluna esquerda (captura).
 * Na sala: wp_headline / wp_subtitle afetam bloco de conteúdo principal quando usados.
 */

export type MergeFieldContext = {
  name?: string;
  email?: string;
};

export function applyMergeFields(text: string | undefined, ctx: MergeFieldContext): string {
  if (text == null || text === "") return text ?? "";
  const name = ctx.name?.trim() ?? "";
  const email = ctx.email?.trim() ?? "";
  return text
    .replace(/\{\{nome\}\}/gi, name || "você")
    .replace(/\{\{email\}\}/gi, email);
}

const MAX_OVERRIDE = 400;

function sanitizeOverride(raw: string | null): string | null {
  if (raw == null || raw === "") return null;
  const t = raw.trim().slice(0, MAX_OVERRIDE);
  return t.length ? t : null;
}

export type PublicCopyOverrides = {
  headline: string | null;
  subtitle: string | null;
  description: string | null;
};

export function parsePublicCopyOverridesFromSearchParams(
  params: URLSearchParams,
): PublicCopyOverrides {
  return {
    headline: sanitizeOverride(params.get("wp_headline")),
    subtitle: sanitizeOverride(params.get("wp_subtitle")),
    description: sanitizeOverride(params.get("wp_desc")),
  };
}

function pickSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return sanitizeOverride(s ?? null);
}

/** Para páginas server: `searchParams` do Next.js App Router */
export function parsePublicCopyOverridesFromPageSearchParams(
  sp: Record<string, string | string[] | undefined>,
): PublicCopyOverrides {
  return {
    headline: pickSearchParam(sp, "wp_headline"),
    subtitle: pickSearchParam(sp, "wp_subtitle"),
    description: pickSearchParam(sp, "wp_desc"),
  };
}
