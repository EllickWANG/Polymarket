import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { placeBet } from "@/lib/betService";
import { UserNotFoundError, InsufficientBalanceError } from "@/lib/userService";

export async function GET(request: NextRequest) {
  const userIdParam = request.nextUrl.searchParams.get("userId");
  const where = userIdParam
    ? { userId: parseInt(userIdParam, 10) }
    : {};
  if (userIdParam && Number.isNaN(parseInt(userIdParam, 10))) {
    return NextResponse.json({ error: "userId must be a number" }, { status: 400 });
  }
  const bets = await prisma.bet.findMany({
    where,
    orderBy: { id: "desc" },
    include: { user: { select: { username: true } } },
  });
  return NextResponse.json(bets);
}

export async function POST(request: NextRequest) {
  try {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey || idempotencyKey.trim() === "") {
      return NextResponse.json(
        { error: "Idempotency-Key header is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const userId =
      typeof body?.userId === "number"
        ? body.userId
        : typeof body?.userId === "string"
          ? parseInt(body.userId, 10)
          : undefined;
    const gameId =
      typeof body?.gameId === "string" ? body.gameId : undefined;
    const amount =
      typeof body?.amount === "number" ? body.amount : undefined;

    if (userId === undefined || Number.isNaN(userId) || !gameId || amount === undefined || amount <= 0) {
      return NextResponse.json(
        { error: "userId (number), gameId (string), and amount (positive number) are required" },
        { status: 400 }
      );
    }

    const result = await placeBet(userId, gameId, amount, idempotencyKey);

    if (result.kind === "success") {
      return NextResponse.json(
        { bet: result.bet, balance: result.balance },
        { status: 200 }
      );
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
    const err = e as Error;
    if (e instanceof UserNotFoundError || err?.name === "UserNotFoundError") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (e instanceof InsufficientBalanceError || err?.message === "Insufficient balance") {
      return NextResponse.json({ error: err.message ?? "Insufficient balance" }, { status: 422 });
    }
    throw e;
  }
}
