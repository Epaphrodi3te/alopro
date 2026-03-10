import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (user.role !== "admin") {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;

  const message = await prisma.message.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!message) {
    return apiError("Message introuvable.", 404);
  }

  await prisma.message.delete({ where: { id } });

  return NextResponse.json({ message: "Message supprime." });
}
