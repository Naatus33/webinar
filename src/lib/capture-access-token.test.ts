import { beforeEach, describe, expect, it, vi } from "vitest";

describe("capture-access-token", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret-for-vitest");
  });

  it("valida token assinado para o webinar correto", async () => {
    const { signCaptureAccessToken, verifyCaptureAccessToken } = await import(
      "./capture-access-token"
    );
    const token = signCaptureAccessToken("webinar-id-1");
    expect(verifyCaptureAccessToken(token, "webinar-id-1")).toBe(true);
    expect(verifyCaptureAccessToken(token, "outro-id")).toBe(false);
  });

  it("rejeita token inválido", async () => {
    const { verifyCaptureAccessToken } = await import("./capture-access-token");
    expect(verifyCaptureAccessToken(undefined, "x")).toBe(false);
    expect(verifyCaptureAccessToken("não-é-token", "x")).toBe(false);
  });
});
