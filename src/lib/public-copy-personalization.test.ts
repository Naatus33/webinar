import { describe, expect, it } from "vitest";

import { applyMergeFields, parsePublicCopyOverridesFromPageSearchParams } from "./public-copy-personalization";

describe("applyMergeFields", () => {
  it("substitui nome e email", () => {
    expect(
      applyMergeFields("Olá {{nome}}, seu e-mail é {{email}}", {
        name: "Ana",
        email: "ana@x.com",
      }),
    ).toBe("Olá Ana, seu e-mail é ana@x.com");
  });

  it("usa fallback para nome vazio", () => {
    expect(applyMergeFields("{{Nome}}", {})).toBe("você");
  });
});

describe("parsePublicCopyOverridesFromPageSearchParams", () => {
  it("lê wp_headline e wp_desc", () => {
    const o = parsePublicCopyOverridesFromPageSearchParams({
      wp_headline: "Campanha X",
      wp_desc: "Descrição",
    });
    expect(o.headline).toBe("Campanha X");
    expect(o.description).toBe("Descrição");
    expect(o.subtitle).toBeNull();
  });
});
