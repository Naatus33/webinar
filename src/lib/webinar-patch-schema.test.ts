import { describe, expect, it } from "vitest";

import { webinarPatchSchema } from "./webinar-patch-schema";

describe("webinarPatchSchema", () => {
  it("rejeita campos não listados (strict)", () => {
    expect(webinarPatchSchema.safeParse({ foo: 1 }).success).toBe(false);
  });

  it("aceita customScripts opaco", () => {
    const r = webinarPatchSchema.safeParse({ customScripts: { capture: { head: "" } } });
    expect(r.success).toBe(true);
  });

  it("aceita patch vazio", () => {
    expect(webinarPatchSchema.safeParse({}).success).toBe(true);
  });
});
