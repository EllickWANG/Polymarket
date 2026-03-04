<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/">首页</router-link>
      <router-link to="/deposit">充值</router-link>
      <router-link to="/bets">投注</router-link>
      <router-link to="/reconcile">对账</router-link>
    </nav>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts"></script>

<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, "Segoe UI", sans-serif; background: #0f0f12; color: #e4e4e7; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .nav {
    display: flex; gap: 1rem; padding: 1rem 1.5rem; background: #18181b; border-bottom: 1px solid #27272a;
  }
  .nav a { color: #a1a1aa; text-decoration: none; }
  .nav a:hover, .nav a.router-link-active { color: #fafafa; }
  .main { flex: 1; padding: 1.5rem; max-width: 720px; margin: 0 auto; width: 100%; }
</style>
