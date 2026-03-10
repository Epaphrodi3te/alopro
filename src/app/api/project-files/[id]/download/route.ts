import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canUserViewProject } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";
import { getProjectFileAbsolutePath } from "@/lib/project-file-storage";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;

  const file = await prisma.projectFile.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          createdById: true,
          assignedToId: true,
          memberships: {
            select: {
              userId: true,
            },
          },
          createdBy: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!file) {
    return apiError("Fichier introuvable.", 404);
  }

  if (
    !canUserViewProject(
      { id: user.id, role: user.role },
      {
        createdById: file.project.createdById,
        assignedToId: file.project.assignedToId,
        assignedMemberIds: file.project.memberships.map((member) => member.userId),
        createdByRole: file.project.createdBy.role,
      },
    )
  ) {
    return apiError("Projet non accessible.", 403);
  }

  try {
    const bytes = await readFile(getProjectFileAbsolutePath(file.storedName));
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.displayName)}"`,
      },
    });
  } catch {
    return apiError("Le fichier n'est plus disponible.", 404);
  }
}
