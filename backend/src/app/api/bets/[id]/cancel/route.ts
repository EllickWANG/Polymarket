import { NextRequest, NextResponse } from "next/server";
import { cancel, BetNotFoundError } from "@/lib/betService";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const betId = parseInt(id, 10);
    if (Number.isNaN(betId)) {
      return NextResponse.json({ error: "Invalid bet id" }, { status: 400 });
    }

    const cancelResult = await cancel(betId);

    if (cancelResult.kind === "success") {
      return NextResponse.json(
        { balance: cancelResult.balance, status: "CANCELLED" },
        { status: 200 }
      );
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
