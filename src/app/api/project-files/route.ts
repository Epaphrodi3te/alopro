import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canUserViewProject } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";
import { buildProjectFileNames, writeProjectFile } from "@/lib/project-file-storage";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function canViewFilesMenu(role: Role) {
  return role === "admin";
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (!canViewFilesMenu(user.role)) {
    return apiError("Forbidden", 403);
  }

  const projectId = request.nextUrl.searchParams.get("projectId");

  const files = await prisma.projectFile.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ files });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  try {
    const formData = await request.formData();
    const projectIdValue = formData.get("projectId");
    const fileValue = formData.get("file");

    if (typeof projectIdValue !== "string" || !projectIdValue) {
      return apiError("Projet invalide.", 400);
    }

    if (!(fileValue instanceof File)) {
      return apiError("Fichier invalide.", 400);
    }

    if (fileValue.size <= 0) {
      return apiError("Le fichier est vide.", 400);
    }

    if (fileValue.size > MAX_FILE_SIZE_BYTES) {
      return apiError("Le fichier depasse 15 MB.", 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectIdValue },
      select: {
        id: true,
        title: true,
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
    });

    if (!project) {
      return apiError("Projet introuvable.", 404);
    }

    if (
      !canUserViewProject(
        { id: user.id, role: user.role },
        {
          createdById: project.createdById,
          assignedToId: project.assignedToId,
          assignedMemberIds: project.memberships.map((member) => member.userId),
          createdByRole: project.createdBy.role,
        },
      )
    ) {
      return apiError("Projet non accessible.", 403);
    }

    const names = buildProjectFileNames(project.title, fileValue.name);
    const bytes = new Uint8Array(await fileValue.arrayBuffer());
    await writeProjectFile(names.storedName, bytes);

    const created = await prisma.projectFile.create({
      data: {
        projectId: project.id,
        uploadedById: user.id,
        displayName: names.displayName,
        originalName: fileValue.name,
        storedName: names.storedName,
        mimeType: fileValue.type || "application/octet-stream",
        sizeBytes: fileValue.size,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ message: "Fichier soumis.", file: created }, { status: 201 });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
