<template>
  <div class="page">
    <h1>对账</h1>
    <p class="desc">按用户核对数据库余额与 ledger 汇总是否一致。</p>
    <form @submit.prevent="run" class="form">
      <label>
        用户
        <select v-model.number="userId" required>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.username }} (#{{ u.id }})</option>
        </select>
      </label>
      <button type="submit" :disabled="loading">对账</button>
    </form>
    <div v-if="result" class="result" :class="{ match: result.balanceMatch, mismatch: !result.balanceMatch }">
      <p><strong>数据库余额</strong> {{ result.databaseBalance.toFixed(2) }}</p>
      <p><strong>Ledger 汇总</strong> {{ result.ledgerBalance.toFixed(2) }}</p>
      <p><strong>一致</strong> {{ result.balanceMatch ? "是" : "否" }}</p>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loadError" class="error">{{ loadError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getUsers, reconcile } from "@/api";

const users = ref<{ id: number; username: string; balance: number }[]>([]);
const userId = ref(1);
const loading = ref(false);
const result = ref<{
  databaseBalance: number;
  ledgerBalance: number;
  balanceMatch: boolean;
} | null>(null);
const error = ref("");
const loadError = ref("");

onMounted(async () => {
  try {
    users.value = await getUsers();
    if (users.value.length) userId.value = users.value[0].id;
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  }
});

async function run() {
  result.value = null;
  error.value = "";
  loading.value = true;
  try {
    result.value = await reconcile(userId.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
  .page { padding: 0.5rem 0; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  .desc { color: #a1a1aa; font-size: 0.9rem; margin-bottom: 1rem; }
  .form { display: flex; align-items: flex-end; gap: 1rem; }
  .form label { display: flex; flex-direction: column; gap: 0.25rem; }
  .form select {
    padding: 0.5rem; border: 1px solid #3f3f46; border-radius: 6px;
    background: #18181b; color: #e4e4e7; min-width: 10rem;
  }
  .form button {
    padding: 0.5rem 1rem; background: #3b82f6; color: #fff; border: none; border-radius: 6px;
    cursor: pointer;
  }
  .form button:disabled { opacity: 0.6; cursor: not-allowed; }
  .result { margin-top: 1.5rem; padding: 1rem; border-radius: 8px; border: 1px solid #3f3f46; }
  .result.match { border-color: #22c55e; background: rgba(34, 197, 94, 0.1); }
  .result.mismatch { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
  .result p { margin: 0.25rem 0; }
  .error { color: #f87171; margin-top: 1rem; }
</style>
