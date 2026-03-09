import { NextResponse } from "next/server";

import { authCookieOptions } from "@/lib/auth";
import { TOKEN_COOKIE_NAME } from "@/lib/constants";

export async function POST() {
  const response = NextResponse.json({ message: "Deconnexion reussie." });
  response.cookies.set(TOKEN_COOKIE_NAME, "", {
    ...authCookieOptions,
    maxAge: 0,
  });

  return response;
}
