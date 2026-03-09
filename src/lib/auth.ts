import { Prisma, Role, User } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { JWT_SECRET_FALLBACK, TOKEN_COOKIE_NAME } from "@/lib/constants";

const JWT_SECRET = process.env.JWT_SECRET ?? JWT_SECRET_FALLBACK;
const JWT_EXPIRES_IN = "7d";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production.");
}

export type SessionTokenPayload = {
  sub: string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
};

export const authUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(user: Pick<User, "id" | "role" | "email" | "firstName" | "lastName">) {
  const payload: SessionTokenPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAuthToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionTokenPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, authCookieOptions);
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, "", {
    ...authCookieOptions,
    maxAge: 0,
  });
}

export async function getAuthTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE_NAME)?.value ?? null;
}

export function getAuthTokenFromRequest(request: NextRequest) {
  return request.cookies.get(TOKEN_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAuthTokenFromCookie();
  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload?.sub) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: authUserSelect,
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireApiUser(request: NextRequest): Promise<AuthUser | null> {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload?.sub) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: authUserSelect,
  });
}
