<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="page-title">Serial Numbers</h1>
    </div>

    <Toolbar class="mb-3">
      <template #start>
        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div class="flex gap-2 flex-1">
            <InputText v-model="search" placeholder="Cari serial number..." class="w-full sm:w-64 font-mono" size="small"
              @input="debouncedFetch" />
            <Button icon="pi pi-camera" severity="secondary" outlined size="small" v-tooltip.top="'Scan Barcode'"
              @click="showScanner = true" class="shrink-0" />
          </div>
          <Dropdown v-model="filterStatus" :options="statusOptions" optionLabel="label" optionValue="value"
            placeholder="Semua status" class="w-full sm:w-36" size="small" showClear @change="fetchSNs" />
        </div>
      </template>
    </Toolbar>

    <Skeleton v-if="loading" width="100%" height="20rem" />
    <div v-else-if="items.length === 0" class="empty-state">
      <i class="pi pi-qrcode" />
      <p>Belum ada serial number. Input melalui Stok Masuk.</p>
    </div>
    <DataTable v-else :value="items" paginator :rows="20" size="small" stripedRows responsiveLayout="scroll">
      <Column field="serialNumber" header="Serial Number" class="font-mono" />
      <Column header="Status">
        <template #body="{ data }">
          <span class="status-badge" :class="{ 'bg-green-100 text-green-700': data.status === 'in_stock', 'bg-blue-100 text-blue-700': data.status === 'sold', 'bg-yellow-100 text-yellow-700': data.status === 'returned', 'bg-red-100 text-red-700': data.status === 'rma' }">
            {{ data.status }}
          </span>
        </template>
      </Column>
      <Column field="condition" header="Kondisi" />
      <Column header="Aksi" style="width:80px">
        <template #body="{ data }">
          <Button icon="pi pi-shield" text size="small" severity="info"
            v-tooltip.top="'Cek Garansi'" @click.stop="checkWarranty(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="warrantyDialog" header="Info Garansi" :modal="true" class="w-full max-w-md">
      <Skeleton v-if="checking" width="100%" height="10rem" />
      <div v-else-if="warrantyData" class="space-y-2 text-sm">
        <div class="grid grid-cols-2 gap-y-2">
          <div class="text-slate-500">Serial</div>
          <div class="font-mono">{{ warrantyData.serial_number }}</div>
          <div class="text-slate-500">Produk</div>
          <div class="font-medium">{{ warrantyData.product_name }}</div>
          <div class="text-slate-500">Tanggal Jual</div>
          <div>{{ formatDate(warrantyData.sold_at) }}</div>
          <div class="text-slate-500">Garansi Berakhir</div>
          <div>{{ formatDate(warrantyData.warranty_expires_at) }}</div>
          <div class="text-slate-500">Sisa Hari</div>
          <div class="font-semibold" :class="warrantyData.days_remaining <= 0 ? 'text-red-600' : 'text-green-600'">
            {{ warrantyData.days_remaining <= 0 ? 'Kedaluwarsa' : warrantyData.days_remaining + ' hari' }}
          </div>
        </div>
        <Divider />
        <Tag :value="warrantyData.status === 'active' ? 'Aktif' : 'Kedaluwarsa'"
          :severity="warrantyData.status === 'active' ? 'success' : 'danger'" />
      </div>
      <div v-else class="empty-state">
        <p>Serial number tidak ditemukan</p>
      </div>
    </Dialog>

    <BarcodeScanner v-model:visible="showScanner" @scan="onScan" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../lib/axios';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import Divider from 'primevue/divider';
import Dropdown from 'primevue/dropdown';
import Toolbar from 'primevue/toolbar';
import BarcodeScanner from '../components/BarcodeScanner.vue';

const items = ref<any[]>([]);
const loading = ref(false);
const search = ref('');
const filterStatus = ref('');
const warrantyDialog = ref(false);
const warrantyData = ref<any>(null);
const checking = ref(false);
const showScanner = ref(false);

const statusOptions = [
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Sold', value: 'sold' },
  { label: 'Returned', value: 'returned' },
  { label: 'RMA', value: 'rma' },
];

let debounceTimer: any = null;

function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }

function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchSNs, 300);
}

async function fetchSNs() {
  loading.value = true;
  try {
    const params: any = {};
    if (search.value) params.serial_number = search.value;
    if (filterStatus.value) params.status = filterStatus.value;
    const { data } = await api.get('/serial-numbers', { params });
    items.value = data.data;
  } finally { loading.value = false; }
}

async function checkWarranty(sn: any) {
  warrantyData.value = null;
  warrantyDialog.value = true;
  checking.value = true;
  try {
    const { data } = await api.get(`/serial-numbers/${sn.id}/warranty`);
    warrantyData.value = data.data;
  } finally { checking.value = false; }
}

function onScan(code: string) {
  search.value = code;
  fetchSNs();
}

onMounted(fetchSNs);
</script>
