import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteProjectFile } from "@/lib/project-file-storage";

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

  const target = await prisma.projectFile.findUnique({
    where: { id },
    select: {
      id: true,
      storedName: true,
    },
  });

  if (!target) {
    return apiError("Fichier introuvable.", 404);
  }

  await prisma.projectFile.delete({ where: { id } });
  await deleteProjectFile(target.storedName);

  return NextResponse.json({ message: "Fichier supprime." });
}
