import { prisma } from "./prisma";
import { appendLedger, getBalanceFromLedger, setUserBalance } from "./ledgerService";
import { findIdempotencyKey, saveIdempotencyKey, hashRequest } from "./idempotency";
import { UserNotFoundError, InsufficientBalanceError } from "./userService";

export class BetNotFoundError extends Error {
  constructor(betId: number) {
    super(`Bet not found: ${betId}`);
    this.name = "BetNotFoundError";
  }
}

export class InvalidBetStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBetStateError";
  }
}

export type PlaceBetResult =
  | { kind: "success"; bet: { id: number; userId: number; gameId: string; amount: number; status: string }; balance: number }
  | { kind: "idempotent"; responseStatus: number; responseBody: unknown }
  | { kind: "conflict" };

/** WIN payout: return stake + profit (e.g. 2x = double). */
const WIN_MULTIPLIER = 2;

export async function placeBet(
  userId: number,
  gameId: string,
  amount: number,
  idempotencyKey: string
): Promise<PlaceBetResult> {
  if (amount <= 0) throw new Error("Amount must be positive");

  const requestHash = hashRequest({ userId, gameId, amount });

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new UserNotFoundError(userId);

    const ledgerBalance = await getBalanceFromLedger(userId, tx);
    if (ledgerBalance < amount) throw new InsufficientBalanceError();

    const existing = await findIdempotencyKey(idempotencyKey, tx);
    if (existing) {
      if (existing.requestHash === requestHash) {
        return {
          kind: "idempotent",
          responseStatus: existing.responseStatus,
          responseBody: JSON.parse(existing.responseBody ?? "{}"),
        };
      }
      return { kind: "conflict" };
    }

    const bet = await tx.bet.create({
      data: {
        userId,
        gameId,
        amount,
        status: "PLACED",
      },
    });
    await appendLedger(
      {
        userId,
        type: "BET_DEBIT",
        amount,
        referenceType: "Bet",
        referenceId: String(bet.id),
      },
      tx
    );
    const newBalance = ledgerBalance - amount;
    await setUserBalance(userId, newBalance, tx);

    const responseBody = {
      bet: {
        id: bet.id,
        userId: bet.userId,
        gameId: bet.gameId,
        amount: bet.amount,
        status: bet.status,
      },
      balance: newBalance,
    };
    await saveIdempotencyKey(
      {
        key: idempotencyKey,
        userId,
        requestHash,
        responseStatus: 200,
        responseBody: JSON.stringify(responseBody),
      },
      tx
    );

    return {
      kind: "success",
      bet: {
        id: bet.id,
        userId: bet.userId,
        gameId: bet.gameId,
        amount: bet.amount,
        status: bet.status,
      },
      balance: newBalance,
    };
  });
}

export type SettleResult =
  | { kind: "success"; balance: number }
  | { kind: "invalid_state" };

export async function settle(betId: number, result: "WIN" | "LOSE"): Promise<SettleResult> {
  return prisma.$transaction(async (tx) => {
    const bet = await tx.bet.findUnique({ where: { id: betId } });
    if (!bet) throw new BetNotFoundError(betId);
    if (bet.status !== "PLACED") {
      return { kind: "invalid_state" };
    }

    const ledgerBalance = await getBalanceFromLedger(bet.userId, tx);
    let newBalance = ledgerBalance;

    if (result === "WIN") {
      const payout = bet.amount * WIN_MULTIPLIER;
      await appendLedger(
        {
          userId: bet.userId,
          type: "BET_CREDIT",
          amount: payout,
          referenceType: "Bet",
          referenceId: String(bet.id),
        },
        tx
      );
      newBalance = ledgerBalance + payout;
    }

    await tx.bet.update({
      where: { id: betId },
      data: { status: "SETTLED" },
    });
    await setUserBalance(bet.userId, newBalance, tx);

    return { kind: "success", balance: newBalance };
  });
}

export type CancelResult = { kind: "success"; balance: number } | { kind: "invalid_state" };

export async function cancel(betId: number): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    const bet = await tx.bet.findUnique({ where: { id: betId } });
    if (!bet) throw new BetNotFoundError(betId);
    if (bet.status !== "PLACED") {
      return { kind: "invalid_state" };
    }

    const ledgerBalance = await getBalanceFromLedger(bet.userId, tx);
    const newBalance = ledgerBalance + bet.amount;

    await appendLedger(
      {
        userId: bet.userId,
        type: "BET_REFUND",
        amount: bet.amount,
        referenceType: "Bet",
        referenceId: String(bet.id),
      },
      tx
    );
    await tx.bet.update({
      where: { id: betId },
      data: { status: "CANCELLED" },
    });
    await setUserBalance(bet.userId, newBalance, tx);

    return { kind: "success", balance: newBalance };
  });
}
