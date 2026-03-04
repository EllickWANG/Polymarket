import { NextRequest, NextResponse } from "next/server";
import { deposit, UserNotFoundError } from "@/lib/userService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid user id" },
        { status: 400 }
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey || idempotencyKey.trim() === "") {
      return NextResponse.json(
        { error: "Idempotency-Key header is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const amount = typeof body?.amount === "number" ? body.amount : undefined;
    if (amount === undefined || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    const result = await deposit(userId, amount, idempotencyKey);

    if (result.kind === "success") {
      return NextResponse.json({ balance: result.balance }, { status: 200 });
    }
    if (result.kind === "idempotent") {
      return NextResponse.json(result.responseBody, {
        status: result.responseStatus,
      });
    }
    return NextResponse.json(
      { error: "Idempotency key conflict: same key with different request body" },
      { status: 409 }
    );
  } catch (e) {
    if (e instanceof UserNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}
