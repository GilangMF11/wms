<template>
  <div class="space-y-6">
    <h1 class="page-title">Dashboard</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card v-for="c in cards" :key="c.label">
        <template #content>
          <Skeleton v-if="loading" width="60%" height="1.5rem" class="mb-2" />
          <div v-else class="text-slate-500 text-sm">{{ c.label }}</div>
          <Skeleton v-if="loading" width="40%" height="2rem" class="mt-1" />
          <div v-else class="text-2xl font-semibold mt-1" :class="c.color">{{ c.value(summary) }}</div>
        </template>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <template #title><span class="card-title">Stok Per Kategori</span></template>
        <template #content>
          <div v-if="loading" class="flex justify-center p-6">
            <Skeleton width="16rem" height="16rem" borderRadius="50%" />
          </div>
          <div v-else-if="summary.by_category.length === 0" class="empty-state">
            <i class="pi pi-chart-pie" />
            <p>Belum ada data stok</p>
          </div>
          <Pie v-else :data="pieData" :options="pieOptions" class="max-h-64" />
        </template>
      </Card>
      <Card>
        <template #title><span class="card-title">Produk Stok Rendah (&le;5)</span></template>
        <template #content>
          <Skeleton v-if="loading" width="100%" height="8rem" />
          <div v-else-if="lowStock.length === 0" class="empty-state">
            <i class="pi pi-check-circle text-green-500" />
            <p>Semua stok aman</p>
          </div>
          <DataTable v-else :value="lowStock" size="small" stripedRows responsiveLayout="scroll">
            <Column field="name" header="Nama Produk" />
            <Column field="sku" header="SKU" />
            <Column header="Unit">
              <template #body="{ data }">
                <Tag :value="data.units_in_stock" :severity="data.units_in_stock <= 1 ? 'danger' : 'warn'" />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '../lib/axios';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const loading = ref(true);
const summary = ref({ total_products: 0, total_units_in_stock: 0, inventory_value: 0, by_category: [] as any[], low_stock_count: 0 });
const lowStock = ref<any[]>([]);

const cards = [
  { label: 'Total Produk', value: (d: any) => d.total_products, color: 'text-blue-600' },
  { label: 'Unit Tersedia', value: (d: any) => d.total_units_in_stock, color: 'text-green-600' },
  { label: 'Nilai Inventori', value: (d: any) => 'Rp ' + d.inventory_value.toLocaleString('id-ID'), color: 'text-slate-800' },
  { label: 'Low Stock Alert', value: (d: any) => d.low_stock_count, color: 'text-amber-600' },
];

const pieData = computed(() => ({
  labels: summary.value.by_category.map((c: any) => c.category),
  datasets: [{
    data: summary.value.by_category.map((c: any) => c.units),
    backgroundColor: ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316'],
  }],
}));

const pieOptions = {
  responsive: true,
  plugins: { legend: { position: 'bottom' as const } },
};

onMounted(async () => {
  loading.value = true;
  const [s, l] = await Promise.all([
    api.get('/dashboard/summary'),
    api.get('/dashboard/low-stock'),
  ]);
  summary.value = s.data.data;
  lowStock.value = l.data.data;
  loading.value = false;
});
</script>
