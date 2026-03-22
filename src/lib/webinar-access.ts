import type { Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Filtro Prisma: webinars que o usuário pode listar/gerir. */
export function webinarWhereForUser(user: {
  id: string;
  role: Role;
}): Prisma.WebinarWhereInput {
  if (user.role === "ADMIN") {
    return {};
  }
  if (user.role === "GERENTE") {
    return {
      OR: [{ userId: user.id }, { user: { managerId: user.id } }],
    };
  }
  return { userId: user.id };
}

export async function userCanManageWebinar(
  user: { id: string; role: Role },
  webinarUserId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (webinarUserId === user.id) return true;
  if (user.role !== "GERENTE") return false;
  const owner = await prisma.user.findUnique({
    where: { id: webinarUserId },
    select: { managerId: true },
  });
  return owner?.managerId === user.id;
}

export async function assertWebinarManagedByUser(
  webinarId: string,
  user: { id: string; role: Role },
): Promise<{ ok: true; webinarUserId: string } | { ok: false; status: number }> {
  const w = await prisma.webinar.findUnique({
    where: { id: webinarId },
    select: { userId: true },
  });
  if (!w) return { ok: false, status: 404 };
  const allowed = await userCanManageWebinar(user, w.userId);
  if (!allowed) return { ok: false, status: 403 };
  return { ok: true, webinarUserId: w.userId };
}
