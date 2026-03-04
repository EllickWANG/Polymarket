import { NextRequest, NextResponse } from "next/server";
import { settle, BetNotFoundError } from "@/lib/betService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const betId = parseInt(id, 10);
    if (Number.isNaN(betId)) {
      return NextResponse.json({ error: "Invalid bet id" }, { status: 400 });
    }

    const body = await request.json();
    const result =
      body?.result === "WIN" || body?.result === "LOSE" ? body.result : undefined;
    if (!result) {
      return NextResponse.json(
        { error: "body.result must be 'WIN' or 'LOSE'" },
        { status: 400 }
      );
    }

    const settleResult = await settle(betId, result);

    if (settleResult.kind === "success") {
      return NextResponse.json({ balance: settleResult.balance }, { status: 200 });
    }
    return NextResponse.json(
      { error: "Bet is not in PLACED state or already settled/cancelled" },
      { status: 409 }
    );
  } catch (e) {
    if (e instanceof BetNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}
