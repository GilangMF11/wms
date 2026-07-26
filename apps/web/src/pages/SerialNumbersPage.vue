<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="page-title">Serial Numbers</h1>
      <Button v-if="auth.user?.role !== 'owner'" label="Tambah SN" icon="pi pi-plus" size="small"
        @click="openBulkDialog()" />
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
          <Select v-model="filterStatus" :options="statusOptions" optionLabel="label" optionValue="value"
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

    <Dialog v-model:visible="bulkDialog" header="Tambah Serial Number" :modal="true" class="w-full max-w-lg">
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">Produk *</label>
          <Select v-model="bulkForm.product_id" :options="products" optionLabel="name" optionValue="id"
            placeholder="Pilih produk" class="w-full" filter size="small" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Kondisi</label>
          <Select v-model="bulkForm.condition" :options="conditionOptions" optionLabel="label" optionValue="value"
            class="w-full" size="small" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Jumlah SN</label>
          <InputNumber v-model="bulkForm.quantity" class="w-full" :min="1" :max="500" size="small" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Serial Numbers ({{ bulkForm.quantity }} field)</label>
          <div class="flex gap-2 mb-2">
            <Button label="Auto-Generate" icon="pi pi-cog" size="small" severity="secondary" outlined
              @click="autoGenerate" />
            <Button icon="pi pi-camera" size="small" severity="info" outlined v-tooltip.top="'Scan SN satu per satu'"
              @click="scanBulkSn = true" />
          </div>
          <div class="max-h-48 overflow-y-auto space-y-1">
            <div v-for="(_, i) in bulkForm.quantity" :key="i" class="flex gap-2 items-center">
              <span class="text-xs text-slate-400 w-8">{{ i + 1 }}.</span>
              <InputText v-model="bulkForm.serial_numbers[i]" class="flex-1 font-mono" size="small"
                :placeholder="'SN-' + (i + 1)" />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button label="Batal" severity="secondary" outlined @click="bulkDialog = false" />
          <Button label="Simpan" icon="pi pi-check" :loading="bulkSaving" @click="saveBulkSn" />
        </div>
      </div>
    </Dialog>

    <BarcodeScanner v-model:visible="showScanner" @scan="onScan" />
    <BarcodeScanner v-model:visible="scanBulkSn" @scan="onBulkScan" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../lib/axios';
import { useAuthStore } from '../stores/auth';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import Divider from 'primevue/divider';
import Select from 'primevue/select';
import Toolbar from 'primevue/toolbar';
import BarcodeScanner from '../components/BarcodeScanner.vue';

const auth = useAuthStore();
const items = ref<any[]>([]);
const loading = ref(false);
const search = ref('');
const filterStatus = ref('');
const warrantyDialog = ref(false);
const warrantyData = ref<any>(null);
const checking = ref(false);
const showScanner = ref(false);
const bulkDialog = ref(false);
const bulkSaving = ref(false);
const scanBulkSn = ref(false);
const products = ref<any[]>([]);

const bulkForm = ref({
  product_id: '',
  condition: 'new',
  quantity: 1,
  serial_numbers: [] as string[],
});

const conditionOptions = [
  { label: 'Baru', value: 'new' },
  { label: 'Refurbished', value: 'refurbished' },
  { label: 'Display Unit', value: 'display' },
  { label: 'Rusak', value: 'damaged' },
];

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

function openBulkDialog() {
  bulkForm.value = { product_id: '', condition: 'new', quantity: 1, serial_numbers: [''] };
  bulkDialog.value = true;
}

function autoGenerate() {
  const prefix = products.value.find(p => p.id === bulkForm.value.product_id)?.sku?.slice(0, 4) || 'SN';
  bulkForm.value.serial_numbers = Array.from({ length: bulkForm.value.quantity }, (_, i) =>
    `${prefix}-${Date.now()}-${String(i + 1).padStart(3, '0')}`,
  );
}

let bulkScanIndex = 0;
function onBulkScan(code: string) {
  if (bulkScanIndex < bulkForm.value.quantity) {
    bulkForm.value.serial_numbers[bulkScanIndex] = code;
    bulkScanIndex++;
  }
}

async function saveBulkSn() {
  if (!bulkForm.value.product_id) return;
  bulkSaving.value = true;
  try {
    const sns = bulkForm.value.serial_numbers.filter(s => s.trim());
    if (sns.length === 0) return;
    await api.post('/serial-numbers/bulk', {
      serial_numbers: sns.map(sn => ({
        serial_number: sn,
        product_id: bulkForm.value.product_id,
        condition: bulkForm.value.condition,
        warehouse_id: auth.user?.warehouseId,
      })),
    });
    bulkDialog.value = false;
    fetchSNs();
  } finally { bulkSaving.value = false; }
}

onMounted(() => {
  fetchSNs();
  api.get('/products').then(r => products.value = r.data.data);
});
</script>
