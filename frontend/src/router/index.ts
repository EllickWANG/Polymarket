import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "Home", component: () => import("@/views/Home.vue"), meta: { title: "首页" } },
    { path: "/deposit", name: "Deposit", component: () => import("@/views/Deposit.vue"), meta: { title: "充值" } },
    { path: "/bets", name: "Bets", component: () => import("@/views/Bets.vue"), meta: { title: "投注" } },
    { path: "/reconcile", name: "Reconcile", component: () => import("@/views/Reconcile.vue"), meta: { title: "对账" } },
  ],
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - Test001` : "Test001";
});

export default router;
