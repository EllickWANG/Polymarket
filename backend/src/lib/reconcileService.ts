import { prisma } from "./prisma";
import { getBalanceFromLedger } from "./ledgerService";

export type ReconcileResult = {
  userId: number;
  databaseBalance: number;
  ledgerBalance: number;
  balanceMatch: boolean;
  betCountByStatus: { PLACED: number; SETTLED: number; CANCELLED: number };
  anomalies: string[];
};

export async function reconcile(userId: number): Promise<ReconcileResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, balance: true },
  });
  if (!user) return null;

  const ledgerBalance = await getBalanceFromLedger(userId);
  const databaseBalance = user.balance;
  const balanceMatch = Math.abs(databaseBalance - ledgerBalance) < 1e-9;

  const bets = await prisma.bet.findMany({
    where: { userId },
    select: { id: true, status: true, amount: true },
  });
  const betCountByStatus = {
    PLACED: bets.filter((b) => b.status === "PLACED").length,
    SETTLED: bets.filter((b) => b.status === "SETTLED").length,
    CANCELLED: bets.filter((b) => b.status === "CANCELLED").length,
  };

  const ledgerEntries = await prisma.ledger.findMany({
    where: { userId },
    select: { type: true, referenceType: true, referenceId: true },
  });

  const anomalies: string[] = [];
  if (!balanceMatch) {
    anomalies.push(
      `Balance mismatch: database=${databaseBalance}, ledger-derived=${ledgerBalance}`
    );
  }

  for (const bet of bets) {
    const betIdStr = String(bet.id);
    const debitCount = ledgerEntries.filter(
      (e) => e.referenceId === betIdStr && e.type === "BET_DEBIT"
    ).length;
    const creditCount = ledgerEntries.filter(
      (e) => e.referenceId === betIdStr && e.type === "BET_CREDIT"
    ).length;
    const refundCount = ledgerEntries.filter(
      (e) => e.referenceId === betIdStr && e.type === "BET_REFUND"
    ).length;

    if (debitCount === 0) {
      anomalies.push(`Bet ${bet.id}: missing BET_DEBIT ledger entry`);
    }
    if (bet.status === "SETTLED") {
      if (creditCount > 1) {
        anomalies.push(`Bet ${bet.id}: duplicate BET_CREDIT (possible double settle)`);
      }
    }
    if (bet.status === "CANCELLED" && refundCount === 0) {
      anomalies.push(`Bet ${bet.id}: CANCELLED but missing BET_REFUND`);
    }
  }

  return {
    userId: user.id,
    databaseBalance,
    ledgerBalance,
    balanceMatch,
    betCountByStatus,
    anomalies,
  };
}
