import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { JWT_SECRET_FALLBACK, TOKEN_COOKIE_NAME } from "@/lib/constants";

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET ?? JWT_SECRET_FALLBACK);

const ALWAYS_PUBLIC_PREFIXES = ["/_next", "/favicon.ico", "/public"];
const PUBLIC_PATHS = new Set(["/", "/login", "/api/auth/login"]);
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/tasks",
  "/users",
  "/messages",
  "/settings",
  "/api",
];

function requiresAuth(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) {
    return false;
  }

  if (ALWAYS_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function unauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

async function verify(token: string) {
  try {
    const result = await jwtVerify(token, secretKey);
    return result.payload as { sub?: string; role?: string };
  } catch {
    return null;
  }
}

export async function runAuthMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return unauthorized(request);
  }

  const payload = await verify(token);
  if (!payload?.sub || !payload.role) {
    const response = unauthorized(request);
    response.cookies.set(TOKEN_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }

  if ((pathname.startsWith("/users") || pathname.startsWith("/api/users")) && payload.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
