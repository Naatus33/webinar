import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const excludeId = searchParams.get("excludeId");

  if (!slug) {
    return NextResponse.json(
      { error: "Parâmetro slug é obrigatório" },
      { status: 400 }
    );
  }

  const existing = await prisma.webinar.findFirst({
    where: {
      slug,
      ...(excludeId
        ? {
            NOT: { id: excludeId },
          }
        : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}

