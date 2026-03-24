import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { userCanManageWebinar, webinarWhereForUser } from "./webinar-access";

describe("webinarWhereForUser", () => {
  it("ADMIN não aplica filtro", () => {
    expect(webinarWhereForUser({ id: "u1", role: "ADMIN" })).toEqual({});
  });

  it("VENDEDOR filtra por userId", () => {
    expect(webinarWhereForUser({ id: "u1", role: "VENDEDOR" })).toEqual({ userId: "u1" });
  });

  it("GERENTE inclui próprios e equipe", () => {
    expect(webinarWhereForUser({ id: "g1", role: "GERENTE" })).toEqual({
      OR: [{ userId: "g1" }, { user: { managerId: "g1" } }],
    });
  });
});

describe("userCanManageWebinar", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  it("ADMIN sempre pode", async () => {
    await expect(
      userCanManageWebinar({ id: "a", role: "ADMIN" }, "qualquer"),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("dono pode", async () => {
    await expect(
      userCanManageWebinar({ id: "u1", role: "VENDEDOR" }, "u1"),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("outro vendedor não pode", async () => {
    await expect(
      userCanManageWebinar({ id: "u1", role: "VENDEDOR" }, "u2"),
    ).resolves.toBe(false);
  });

  it("GERENTE pode gerir webinar do vendedor vinculado", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ managerId: "g1" });
    await expect(
      userCanManageWebinar({ id: "g1", role: "GERENTE" }, "v1"),
    ).resolves.toBe(true);
  });

  it("GERENTE não pode gerir vendedor de outro gestor", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ managerId: "g2" });
    await expect(
      userCanManageWebinar({ id: "g1", role: "GERENTE" }, "v1"),
    ).resolves.toBe(false);
  });
});
