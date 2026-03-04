<template>
  <div class="page">
    <h1>用户与余额</h1>
    <p v-if="loading">加载中…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <ul v-else class="user-list">
      <li v-for="u in users" :key="u.id" class="user-item">
        <span class="name">{{ u.username }}</span>
        <span class="id">#{{ u.id }}</span>
        <span class="balance">¥ {{ u.balance.toFixed(2) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getUsers } from "@/api";

const users = ref<{ id: number; username: string; balance: number }[]>([]);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    users.value = await getUsers();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
  .page { padding: 0.5rem 0; }
  h1 { font-size: 1.25rem; margin-bottom: 1rem; }
  .error { color: #f87171; }
  .user-list { list-style: none; padding: 0; margin: 0; }
  .user-item {
    display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0;
    border-bottom: 1px solid #27272a;
  }
  .name { font-weight: 600; min-width: 6rem; }
  .id { color: #71717a; font-size: 0.9rem; }
  .balance { margin-left: auto; color: #a3e635; }
</style>
