import { NextRequest } from "next/server";

import { runAuthMiddleware } from "@/middleware/authMiddleware";

export function proxy(request: NextRequest) {
  return runAuthMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/projects/:path*",
    "/tasks/:path*",
    "/users/:path*",
    "/messages/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
