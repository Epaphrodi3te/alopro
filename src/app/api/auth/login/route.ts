import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authCookieOptions,
  signAuthToken,
  verifyPassword,
} from "@/lib/auth";
import { apiError } from "@/lib/api";
import prisma from "@/lib/prisma";
import { TOKEN_COOKIE_NAME } from "@/lib/constants";

const schema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return apiError("Email ou mot de passe invalide.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase().trim() },
    });

    if (!user) {
      return apiError("Identifiants invalides.", 401);
    }

    const isValidPassword = await verifyPassword(parsed.data.password, user.password);
    if (!isValidPassword) {
      return apiError("Identifiants invalides.", 401);
    }

    const token = signAuthToken(user);

    const response = NextResponse.json({
      message: "Connexion reussie.",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });

    response.cookies.set(TOKEN_COOKIE_NAME, token, authCookieOptions);

    return response;
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
