import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../pages/LoginPage.vue'),
    },
    {
      path: '/',
      component: () => import('../layouts/DashboardLayout.vue'),
      children: [
        { path: '', name: 'Dashboard', component: () => import('../pages/DashboardPage.vue') },
        { path: 'products', name: 'Products', component: () => import('../pages/ProductsPage.vue') },
        { path: 'serial-numbers', name: 'SerialNumbers', component: () => import('../pages/SerialNumbersPage.vue') },
        { path: 'goods-receipts', name: 'GoodsReceipts', meta: { roles: ['admin', 'staff'] }, component: () => import('../pages/GoodsReceiptsPage.vue') },
        { path: 'goods-issues', name: 'GoodsIssues', meta: { roles: ['admin', 'staff'] }, component: () => import('../pages/GoodsIssuesPage.vue') },
        { path: 'rmas', name: 'RMAs', meta: { roles: ['admin', 'staff'] }, component: () => import('../pages/RMAsPage.vue') },
        { path: 'stock-opnames', name: 'StockOpnames', meta: { roles: ['admin', 'staff'] }, component: () => import('../pages/StockOpnamesPage.vue') },
        { path: 'reports', name: 'Reports', component: () => import('../pages/ReportsPage.vue') },
        { path: 'users', name: 'Users', meta: { roles: ['admin'] }, component: () => import('../pages/UsersPage.vue') },
      ],
    },
    { path: '/unauthorized', name: 'Unauthorized', component: () => import('../pages/UnauthorizedPage.vue') },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.name !== 'Login' && !auth.isAuthenticated) {
    next({ name: 'Login' });
    return;
  }
  if (to.name === 'Login' && auth.isAuthenticated) {
    next({ name: 'Dashboard' });
    return;
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role ?? '')) {
    next({ name: 'Unauthorized' });
    return;
  }
  next();
});

export default router;
