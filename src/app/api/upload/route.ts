import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userCanManageWebinar } from "@/lib/webinar-access";
import { isObjectStorageConfigured, uploadPublicObject } from "@/lib/object-storage";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function safeFolderSegment(raw: string, fallback: string): string {
  const s = raw.trim();
  if (s.length > 0 && s.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(s)) return s;
  return fallback;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const rawWebinarId = (formData.get("webinarId") as string | null) ?? "";

  if (!file) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Use JPEG, PNG ou WebP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 5MB." },
      { status: 400 },
    );
  }

  let folderKey: string;
  if (!rawWebinarId || rawWebinarId === "global") {
    folderKey = safeFolderSegment(`user-${user.id}`, `user-${user.id}`);
  } else {
    const webinar = await prisma.webinar.findUnique({
      where: { id: rawWebinarId },
      select: { userId: true },
    });
    if (!webinar) {
      return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
    }
    if (!(await userCanManageWebinar(user, webinar.userId))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    folderKey = safeFolderSegment(rawWebinarId, `user-${user.id}`);
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";

  if (isObjectStorageConfigured()) {
    const key = `uploads/${folderKey}/${filename}`;
    const { url } = await uploadPublicObject(key, buffer, contentType);
    return NextResponse.json({ url }, { status: 201 });
  }

  const uploadDir = join(process.cwd(), "public", "uploads", folderKey);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);
  const url = `/uploads/${folderKey}/${filename}`;

  return NextResponse.json({ url }, { status: 201 });
}
