import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  return NextResponse.json({ user });
}
