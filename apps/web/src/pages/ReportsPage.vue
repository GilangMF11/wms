<template>
  <div class="space-y-6">
    <h1 class="page-title">Laporan</h1>

    <Card>
      <template #title><span class="card-title">Garansi Aktif & Kedaluwarsa</span></template>
      <template #content>
        <Skeleton v-if="loading" width="100%" height="20rem" />
        <div v-else-if="warranties.length === 0" class="empty-state">
          <i class="pi pi-shield" />
          <p>Belum ada data garansi</p>
        </div>
        <DataTable v-else :value="warranties" size="small" stripedRows responsiveLayout="scroll" paginator :rows="20">
          <Column field="serial_number" header="Serial Number" class="font-mono" />
          <Column field="product_name" header="Produk" />
          <Column header="Status">
            <template #body="{ data }">
              <Tag :value="data.status === 'active' ? 'Aktif' : data.status === 'expired' ? 'Kedaluwarsa' : 'Belum Terjual'"
                :severity="data.status === 'active' ? 'success' : data.status === 'expired' ? 'danger' : 'info'" />
            </template>
          </Column>
          <Column field="days_remaining" header="Sisa Hari">
            <template #body="{ data }">
              <span :class="data.days_remaining <= 0 ? 'text-red-600' : ''">
                {{ data.days_remaining?.toString() ?? '-' }}
              </span>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Card>
      <template #title><span class="card-title">Ringkasan RMA</span></template>
      <template #content>
        <Skeleton v-if="loadingRma" width="100%" height="15rem" />
        <div v-else-if="rmaList.length === 0" class="empty-state">
          <i class="pi pi-replay" />
          <p>Belum ada data RMA</p>
        </div>
        <DataTable v-else :value="rmaList" size="small" stripedRows>
          <Column field="rmaNumber" header="No. RMA" class="font-mono" />
          <Column field="customerName" header="Pelanggan" />
          <Column header="Status">
            <template #body="{ data }">
              <span class="status-badge" :class="'status-' + data.status">{{ data.status }}</span>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../lib/axios';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';

const warranties = ref<any[]>([]);
const rmaList = ref<any[]>([]);
const loading = ref(false);
const loadingRma = ref(false);

onMounted(async () => {
  loading.value = true;
  loadingRma.value = true;
  const [w, r] = await Promise.all([
    api.get('/reports/warranty').catch(() => ({ data: { data: [] } })),
    api.get('/reports/rma').catch(() => ({ data: { data: [] } })),
  ]);
  warranties.value = w.data.data;
  rmaList.value = r.data.data;
  loading.value = false;
  loadingRma.value = false;
});
</script>
