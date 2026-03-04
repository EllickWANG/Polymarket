<template>
  <div class="page">
    <h1>投注</h1>

    <section class="section">
      <h2>下单</h2>
      <form @submit.prevent="place" class="form">
        <label>
          用户
          <select v-model.number="placeUserId" required>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.username }} (#{{ u.id }})</option>
          </select>
        </label>
        <label>
          游戏 ID
          <input v-model.trim="gameId" type="text" placeholder="e.g. game-1" required />
        </label>
        <label>
          金额
          <input v-model.number="placeAmount" type="number" step="0.01" min="0.01" required />
        </label>
        <button type="submit" :disabled="placeLoading">下单</button>
      </form>
      <p v-if="placeMsg" :class="placeOk ? 'msg ok' : 'msg err'">{{ placeMsg }}</p>
    </section>

    <section class="section">
      <h2>订单列表</h2>
      <label class="filter">
        按用户筛选
        <select v-model="filterUserId">
          <option :value="undefined">全部</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.username }}</option>
        </select>
      </label>
      <p v-if="listLoading">加载中…</p>
      <p v-else-if="listError" class="error">{{ listError }}</p>
      <ul v-else class="bet-list">
        <li v-for="b in bets" :key="b.id" class="bet-item">
          <span class="id">#{{ b.id }}</span>
          <span class="user">{{ b.user?.username ?? b.userId }}</span>
          <span class="game">{{ b.gameId }}</span>
          <span class="amount">¥ {{ b.amount.toFixed(2) }}</span>
          <span class="status" :class="b.status">{{ b.status }}</span>
          <span v-if="b.status === 'PLACED'" class="actions">
            <button type="button" class="btn small" @click="settle(b.id, 'WIN')">结算 WIN</button>
            <button type="button" class="btn small" @click="settle(b.id, 'LOSE')">结算 LOSE</button>
            <button type="button" class="btn small danger" @click="cancel(b.id)">取消</button>
          </span>
        </li>
      </ul>
      <p v-if="!listLoading && !listError && bets.length === 0" class="muted">暂无订单</p>
    </section>

    <p v-if="loadError" class="error">{{ loadError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { getUsers, getBets, placeBet, settleBet, cancelBet } from "@/api";
import type { Bet } from "@/api";

const users = ref<{ id: number; username: string; balance: number }[]>([]);
const bets = ref<Bet[]>([]);
const placeUserId = ref(1);
const gameId = ref("game-1");
const placeAmount = ref(10);
const filterUserId = ref<number | undefined>(undefined);
const placeLoading = ref(false);
const placeMsg = ref("");
const placeOk = ref(false);
const listLoading = ref(false);
const listError = ref("");
const loadError = ref("");

async function loadUsers() {
  try {
    users.value = await getUsers();
    if (users.value.length) placeUserId.value = users.value[0].id;
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  }
}

async function loadBets() {
  listLoading.value = true;
  listError.value = "";
  try {
    bets.value = await getBets(filterUserId.value);
  } catch (e) {
    listError.value = e instanceof Error ? e.message : String(e);
  } finally {
    listLoading.value = false;
  }
}

onMounted(() => {
  loadUsers().then(loadBets);
});
watch(filterUserId, loadBets);

async function place() {
  placeMsg.value = "";
  placeLoading.value = true;
  try {
    const res = await placeBet(placeUserId.value, gameId.value, placeAmount.value);
    placeOk.value = true;
    placeMsg.value = `下单成功 #${res.bet.id}，余额：¥ ${res.balance.toFixed(2)}`;
    await loadBets();
    const u = users.value.find((x) => x.id === placeUserId.value);
    if (u) u.balance = res.balance;
  } catch (e) {
    placeOk.value = false;
    placeMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    placeLoading.value = false;
  }
}

async function settle(betId: number, result: "WIN" | "LOSE") {
  try {
    await settleBet(betId, result);
    await loadBets();
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e));
  }
}

async function cancel(betId: number) {
  try {
    await cancelBet(betId);
    await loadBets();
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e));
  }
}
</script>

<style scoped>
  .page { padding: 0.5rem 0; }
  h1 { font-size: 1.25rem; margin-bottom: 1rem; }
  .section { margin-bottom: 2rem; }
  .section h2 { font-size: 1rem; margin-bottom: 0.75rem; color: #a1a1aa; }
  .form { display: flex; flex-direction: column; gap: 1rem; max-width: 20rem; }
  .form label { display: flex; flex-direction: column; gap: 0.25rem; }
  .form select, .form input {
    padding: 0.5rem; border: 1px solid #3f3f46; border-radius: 6px;
    background: #18181b; color: #e4e4e7;
  }
  .form button {
    padding: 0.5rem 1rem; background: #3b82f6; color: #fff; border: none; border-radius: 6px;
    cursor: pointer;
  }
  .form button:disabled { opacity: 0.6; cursor: not-allowed; }
  .filter { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
  .filter select { padding: 0.35rem 0.5rem; width: auto; }
  .bet-list { list-style: none; padding: 0; margin: 0; }
  .bet-item {
    display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; padding: 0.5rem 0;
    border-bottom: 1px solid #27272a;
  }
  .bet-item .id { color: #71717a; }
  .bet-item .status.PLACED { color: #fbbf24; }
  .bet-item .status.SETTLED { color: #a3e635; }
  .bet-item .status.CANCELLED { color: #71717a; }
  .bet-item .actions { display: flex; gap: 0.25rem; margin-left: auto; }
  .btn.small { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
  .btn.danger { background: #dc2626; }
  .msg.ok { color: #a3e635; }
  .msg.err { color: #f87171; }
  .error, .muted { color: #71717a; }
  .error { color: #f87171; }
</style>
