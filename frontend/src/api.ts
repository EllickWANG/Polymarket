/** 请求走 Vite 代理：/api -> http://localhost:3000，无需写完整后端地址 */
const base = "";

function idempotencyKey() {
  return `key-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getUsers(): Promise<{ id: number; username: string; balance: number }[]> {
  const r = await fetch(`${base}/api/users`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deposit(
  userId: number,
  amount: number,
  key?: string
): Promise<{ balance: number }> {
  const r = await fetch(`${base}/api/users/${userId}/deposit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key ?? idempotencyKey(),
    },
    body: JSON.stringify({ amount }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? String(data));
  return data;
}

export async function getBets(userId?: number): Promise<Bet[]> {
  const url = userId != null ? `${base}/api/bets?userId=${userId}` : `${base}/api/bets`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function placeBet(
  userId: number,
  gameId: string,
  amount: number,
  key?: string
): Promise<{ bet: Bet; balance: number }> {
  const r = await fetch(`${base}/api/bets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key ?? idempotencyKey(),
    },
    body: JSON.stringify({ userId, gameId, amount }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? String(data));
  return data;
}

export async function settleBet(betId: number, result: "WIN" | "LOSE"): Promise<{ balance: number }> {
  const r = await fetch(`${base}/api/bets/${betId}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? String(data));
  return data;
}

export async function cancelBet(betId: number): Promise<{ balance: number; status: string }> {
  const r = await fetch(`${base}/api/bets/${betId}/cancel`, { method: "POST" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? String(data));
  return data;
}

export async function reconcile(userId: number): Promise<{
  databaseBalance: number;
  ledgerBalance: number;
  balanceMatch: boolean;
}> {
  const r = await fetch(`${base}/api/admin/reconcile?userId=${userId}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? String(data));
  return data;
}

export interface Bet {
  id: number;
  userId: number;
  gameId: string;
  amount: number;
  status: string;
  createdAt: string;
  user?: { username: string };
}
