import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { apiError, parseDate } from "@/lib/api";
import { getNotificationCountsForUser } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const seenAt = {
    projects: parseDate(request.nextUrl.searchParams.get("projectsSince")) ?? undefined,
    tasks: parseDate(request.nextUrl.searchParams.get("tasksSince")) ?? undefined,
    messages: parseDate(request.nextUrl.searchParams.get("messagesSince")) ?? undefined,
    users: parseDate(request.nextUrl.searchParams.get("usersSince")) ?? undefined,
  };

  const counts = await getNotificationCountsForUser({
    id: user.id,
    role: user.role,
  }, seenAt);

  return NextResponse.json({ counts });
}
