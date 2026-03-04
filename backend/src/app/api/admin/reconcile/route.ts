import { NextRequest, NextResponse } from "next/server";
import { reconcile } from "@/lib/reconcileService";

export async function GET(request: NextRequest) {
  const userIdParam = request.nextUrl.searchParams.get("userId");
  if (!userIdParam) {
    return NextResponse.json(
      { error: "Query parameter userId is required" },
      { status: 400 }
    );
  }
  const userId = parseInt(userIdParam, 10);
  if (Number.isNaN(userId)) {
    return NextResponse.json(
      { error: "userId must be a number" },
      { status: 400 }
    );
  }

  const result = await reconcile(userId);
  if (result === null) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(result, { status: 200 });
}
