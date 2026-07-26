<template>
  <div class="flex h-screen overflow-hidden">
    <div v-if="!isMobile || sidebarVisible"
      class="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0"
      :class="isMobile ? 'fixed inset-y-0 left-0 z-50 shadow-2xl' : ''">
      <div class="h-14 flex items-center px-4 border-b border-slate-200 gap-3">
        <i class="pi pi-box text-blue-600 text-xl" />
        <span class="font-semibold text-lg text-slate-800">WMS Gudang</span>
      </div>
      <nav class="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded text-sm no-underline transition-colors"
          :class="isActive(item.path)
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-slate-600 hover:bg-slate-100'"
        >
          <i :class="item.icon" class="text-lg" />
          {{ item.label }}
          <Badge v-if="item.path === '/' && lowStockCount > 0" :value="lowStockCount" severity="warn" class="ml-auto" />
        </router-link>
      </nav>
    </div>

    <div v-if="isMobile && sidebarVisible" class="fixed inset-0 bg-black/30 z-40"
      @click="sidebarVisible = false" />

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
        <div class="flex items-center gap-3">
          <Button
            icon="pi pi-bars"
            severity="secondary"
            text
            size="small"
            @click="toggleSidebar"
          />
          <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems">
            <template #item="{ item }">
              <router-link v-if="item.to" :to="item.to" class="text-sm text-slate-500 no-underline hover:text-blue-600">
                {{ item.label }}
              </router-link>
              <span v-else class="text-sm text-slate-400">{{ item.label }}</span>
            </template>
          </Breadcrumb>
        </div>
        <div class="flex items-center gap-3">
          <Tag :value="auth.user?.role" :severity="roleSeverity" />
          <div class="flex items-center gap-2">
            <Avatar :label="avatarLabel" shape="circle" size="small" />
            <span class="text-sm text-slate-600 hidden sm:inline">{{ auth.user?.full_name }}</span>
          </div>
          <Button
            icon="pi pi-sign-out"
            severity="secondary"
            text
            size="small"
            v-tooltip.bottom="'Logout'"
            @click="auth.logout()"
          />
        </div>
      </header>
      <main class="flex-1 overflow-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Badge from 'primevue/badge';
import Avatar from 'primevue/avatar';
import Breadcrumb from 'primevue/breadcrumb';
import api from '../lib/axios';

const route = useRoute();
const auth = useAuthStore();
const sidebarVisible = ref(false);
const isMobile = ref(false);
const lowStockCount = ref(0);

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) sidebarVisible.value = true;
}
onMounted(async () => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  try {
    const { data } = await api.get('/dashboard/summary');
    lowStockCount.value = data.data.low_stock_count;
  } catch {}
});
onUnmounted(() => window.removeEventListener('resize', checkMobile));

function toggleSidebar() { sidebarVisible.value = !sidebarVisible.value; }
function closeMobileSidebar() { if (isMobile.value) sidebarVisible.value = false; }

const allMenuItems = [
  { label: 'Dashboard', path: '/', icon: 'pi pi-home' },
  { label: 'Produk', path: '/products', icon: 'pi pi-box' },
  { label: 'Serial Numbers', path: '/serial-numbers', icon: 'pi pi-qrcode' },
  { label: 'Stok Masuk', path: '/goods-receipts', icon: 'pi pi-arrow-down-left' },
  { label: 'Stok Keluar', path: '/goods-issues', icon: 'pi pi-arrow-up-right' },
  { label: 'RMA / Retur', path: '/rmas', icon: 'pi pi-replay' },
  { label: 'Stock Opname', path: '/stock-opnames', icon: 'pi pi-list-check' },
  { label: 'Laporan', path: '/reports', icon: 'pi pi-chart-bar' },
  { label: 'Pengguna', path: '/users', icon: 'pi pi-users', admin: true },
];

const menuItems = computed(() =>
  allMenuItems.filter((item) => !item.admin || auth.user?.role === 'admin'),
);

const roleSeverity = computed(() => {
  const map: Record<string, string> = { admin: 'danger', staff: 'info', owner: 'warn' };
  return map[auth.user?.role ?? ''] ?? 'secondary';
});

const avatarLabel = computed(() =>
  auth.user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?',
);

const breadcrumbHome = { icon: 'pi pi-home', to: '/' };

const breadcrumbMap: Record<string, string> = {
  products: 'Produk',
  'serial-numbers': 'Serial Numbers',
  'goods-receipts': 'Stok Masuk',
  'goods-issues': 'Stok Keluar',
  rmas: 'RMA / Retur',
  'stock-opnames': 'Stock Opname',
  reports: 'Laporan',
  users: 'Pengguna',
};

const breadcrumbItems = computed(() => {
  const segments = route.path.split('/').filter(Boolean);
  if (segments.length === 0) return [];
  return [{ label: breadcrumbMap[segments[0]] ?? segments[0], to: `/${segments[0]}` }];
});

function isActive(path: string) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}
</script>
