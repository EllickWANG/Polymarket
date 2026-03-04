<template>
  <div class="page">
    <h1>充值</h1>
    <form @submit.prevent="submit" class="form">
      <label>
        用户
        <select v-model.number="userId" required>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.username }} (#{{ u.id }})</option>
        </select>
      </label>
      <label>
        金额
        <input v-model.number="amount" type="number" step="0.01" min="0.01" required />
      </label>
      <button type="submit" :disabled="loading">充值</button>
    </form>
    <p v-if="message" :class="messageOk ? 'msg ok' : 'msg err'">{{ message }}</p>
    <p v-if="loadError" class="error">{{ loadError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getUsers, deposit } from "@/api";

const users = ref<{ id: number; username: string; balance: number }[]>([]);
const userId = ref(1);
const amount = ref(50);
const loading = ref(false);
const message = ref("");
const messageOk = ref(false);
const loadError = ref("");

onMounted(async () => {
  try {
    users.value = await getUsers();
    if (users.value.length) userId.value = users.value[0].id;
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  }
});

async function submit() {
  message.value = "";
  loading.value = true;
  try {
    const res = await deposit(userId.value, amount.value);
    messageOk.value = true;
    message.value = `充值成功，当前余额：¥ ${res.balance.toFixed(2)}`;
    const u = users.value.find((x) => x.id === userId.value);
    if (u) u.balance = res.balance;
  } catch (e) {
    messageOk.value = false;
    message.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
  .page { padding: 0.5rem 0; }
  h1 { font-size: 1.25rem; margin-bottom: 1rem; }
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
  .msg { margin-top: 1rem; }
  .msg.ok { color: #a3e635; }
  .msg.err { color: #f87171; }
  .error { color: #f87171; }
</style>
