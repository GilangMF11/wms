<template>
  <div class="space-y-4">
    <div v-if="!showForm">
      <div class="flex items-center justify-between">
        <h1 class="page-title">Stok Masuk</h1>
        <Button label="Tambah Penerimaan" icon="pi pi-plus" @click="openForm()" />
      </div>

      <Skeleton v-if="loading" width="100%" height="20rem" class="mt-4" />
      <div v-else-if="receipts.length === 0" class="empty-state mt-4">
        <i class="pi pi-arrow-down-left" />
        <p>Belum ada penerimaan barang</p>
      </div>
      <DataTable v-else :value="receipts" paginator :rows="20" size="small" stripedRows class="mt-4"
        selectionMode="single" @row-click="onRowClick">
        <Column field="receiptNumber" header="No. Receipt" class="font-mono" />
        <Column field="supplierName" header="Supplier" />
        <Column header="Tanggal">
          <template #body="{ data }">{{ formatDate(data.receiptDate) }}</template>
        </Column>
        <Column header="Status">
          <template #body="{ data }">
            <span class="status-badge" :class="'status-' + data.status">{{ data.status }}</span>
          </template>
        </Column>
        <Column header="Aksi" style="width:140px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button v-if="data.status === 'draft'" icon="pi pi-check" text size="small" severity="success"
                v-tooltip.top="'Konfirmasi'" @click.stop="confirmReceipt(data)" />
              <Button v-if="data.status === 'confirmed' && auth.user?.role === 'admin'" icon="pi pi-times" text
                size="small" severity="danger" v-tooltip.top="'Batalkan'" @click.stop="cancelReceipt(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <div v-else>
      <Button label="← Kembali" severity="secondary" text size="small" @click="showForm = false" class="mb-4" />

      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <span class="card-title">{{ editingReceipt ? 'Edit Penerimaan' : 'Penerimaan Baru' }}</span>
            <Button v-if="formItems.length > 0 && !editingReceipt" label="Konfirmasi & Input SN" icon="pi pi-check"
              severity="success" @click="openSerialDialog" />
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-medium mb-1">Supplier *</label>
              <InputText v-model="form.supplier_name" class="w-full" placeholder="Nama supplier" required />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Tanggal Penerimaan</label>
              <DatePicker v-model="form.receipt_date" class="w-full" dateFormat="dd/mm/yy" showIcon />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium mb-1">Catatan</label>
              <Textarea v-model="form.notes" class="w-full" rows="2" placeholder="Catatan opsional..." />
            </div>
          </div>

          <div class="flex items-center justify-between mb-3">
            <h3 class="section-title">Item</h3>
            <Button label="+ Tambah Item" icon="pi pi-plus" size="small" severity="secondary" outlined @click="addItem" />
          </div>

          <Skeleton v-if="false" width="100%" height="10rem" />
          <div v-if="formItems.length === 0" class="empty-state border rounded p-6">
            <i class="pi pi-shopping-cart" />
            <p>Tambahkan item untuk memulai</p>
          </div>
          <div v-else class="space-y-3">
            <div v-for="(item, i) in formItems" :key="i" class="grid grid-cols-12 gap-3 items-start p-3 bg-slate-50 rounded">
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-xs text-slate-500 mb-1">Produk</label>
                <Select v-model="item.product_id" :options="products" optionLabel="name" optionValue="id"
                  placeholder="Pilih produk" class="w-full" size="small" filter />
              </div>
              <div class="col-span-4 sm:col-span-3">
                <label class="block text-xs text-slate-500 mb-1">Quantity</label>
                <InputNumber v-model="item.quantity" class="w-full" size="small" :min="1" />
              </div>
              <div class="col-span-4 sm:col-span-3">
                <label class="block text-xs text-slate-500 mb-1">Harga Beli/Unit</label>
                <InputNumber v-model="item.unit_price" class="w-full" size="small" mode="currency" currency="IDR" />
              </div>
              <div class="col-span-12 sm:col-span-2 flex items-end justify-end">
                <Button icon="pi pi-trash" severity="danger" text size="small" @click="formItems.splice(i, 1)" />
              </div>
            </div>
          </div>

          <div class="flex justify-end mt-4 gap-2">
            <Button label="Simpan Draft" :loading="saving" @click="saveReceipt" />
          </div>
        </template>
      </Card>
    </div>

    <Dialog v-model:visible="serialDialog" header="Input Serial Number" :modal="true" :closable="false"
      class="w-full max-w-2xl">
      <p class="text-sm text-slate-500 mb-4">Masukkan serial number untuk setiap unit yang diterima</p>
      <div v-for="item in formItems" :key="item.product_id" class="mb-4">
        <h4 class="font-medium text-sm mb-2 flex items-center gap-2">
        {{ getProductName(item.product_id) }} ({{ item.quantity }} unit)
        <Button icon="pi pi-camera" text size="small" severity="info" v-tooltip.top="'Scan SN'"
          @click="scanTarget = item.product_id; showScanner = true" />
      </h4>
        <div v-for="j in item.quantity" :key="j" class="mb-1">
          <InputText v-model="serialNumbers[(item.product_id as string)][j - 1]"
            :placeholder="'SN #' + j" class="w-full font-mono text-sm" />
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <Button label="Batal" severity="secondary" outlined @click="serialDialog = false" />
        <Button label="Konfirmasi" severity="success" :loading="confirming" @click="doConfirmWithSerials" />
      </div>
    </Dialog>

    <BarcodeScanner v-model:visible="showScanner" @scan="onSnScan" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../lib/axios';
import { useAuthStore } from '../stores/auth';
import { useConfirmAction } from '../composables/useConfirm';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import DatePicker from 'primevue/datepicker';
import Toolbar from 'primevue/toolbar';
import BarcodeScanner from '../components/BarcodeScanner.vue';

const auth = useAuthStore();
const { ask } = useConfirmAction();
const receipts = ref<any[]>([]);
const products = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const confirming = ref(false);
const showForm = ref(false);
const editingReceipt = ref<any>(null);
const serialDialog = ref(false);
const showScanner = ref(false);
const scanTarget = ref('');

const form = ref({ supplier_name: '', receipt_date: new Date(), notes: '' });
const formItems = ref<any[]>([]);
const serialNumbers = ref<Record<string, string[]>>({});

function formatDate(d: string) { return new Date(d).toLocaleDateString('id-ID'); }
function getProductName(id: string) { return products.value.find(p => p.id === id)?.name ?? '??'; }

function onSnScan(code: string) {
  if (!scanTarget.value) return;
  const arr = serialNumbers.value[scanTarget.value] || [];
  const idx = arr.findIndex(s => !s);
  if (idx >= 0) arr[idx] = code;
  else arr.push(code);
  serialNumbers.value[scanTarget.value] = [...arr];
}

function openForm(receipt?: any) {
  if (receipt) {
    editingReceipt.value = receipt;
    form.value = { supplier_name: receipt.supplierName, receipt_date: new Date(receipt.receiptDate), notes: receipt.notes || '' };
  } else {
    editingReceipt.value = null;
    form.value = { supplier_name: '', receipt_date: new Date(), notes: '' };
    formItems.value = [];
  }
  showForm.value = true;
}

function addItem() {
  formItems.value.push({ product_id: '', quantity: 1, unit_price: 0 });
}

async function saveReceipt() {
  saving.value = true;
  try {
    const payload = {
      supplier_name: form.value.supplier_name,
      receipt_date: form.value.receipt_date.toISOString(),
      notes: form.value.notes || undefined,
      items: formItems.value.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price || 0 })),
    };
    const { data } = await api.post('/goods-receipts', payload);
    form.value = { supplier_name: '', receipt_date: new Date(), notes: '' };
    formItems.value = [];
    showForm.value = false;
    fetchReceipts();
  } finally { saving.value = false; }
}

function openSerialDialog() {
  serialNumbers.value = {};
  for (const item of formItems.value) {
    serialNumbers.value[item.product_id] = Array(item.quantity).fill('');
  }
  serialDialog.value = true;
}

async function doConfirmWithSerials() {
  if (receipts.value.length === 0) return;
  const lastId = receipts.value[0]?.id;
  if (!lastId) return;
  confirming.value = true;
  try {
    const snPayload = {
      serial_numbers: formItems.value.flatMap(item => {
        const sns = serialNumbers.value[item.product_id] || [];
        return sns.map(sn => ({ item_id: item.product_id, serial_number: sn, condition: 'new' }));
      }),
    };
    await api.post(`/goods-receipts/${lastId}/confirm`, snPayload);
    serialDialog.value = false;
    showForm.value = false;
    fetchReceipts();
  } finally { confirming.value = false; }
}

async function confirmReceipt(r: any) {
  ask('Konfirmasi penerimaan ini? Stok akan bertambah.', async () => {
    await api.post(`/goods-receipts/${r.id}/confirm`, { serial_numbers: [] });
    fetchReceipts();
  });
}

async function cancelReceipt(r: any) {
  ask('Batalkan penerimaan ini?', async () => {
    await api.post(`/goods-receipts/${r.id}/cancel`);
    fetchReceipts();
  });
}

function onRowClick(e: any) { /* detail view for future */ }

async function fetchReceipts() {
  loading.value = true;
  try {
    const { data } = await api.get('/goods-receipts');
    receipts.value = data.data;
  } finally { loading.value = false; }
}

onMounted(async () => {
  await Promise.all([
    fetchReceipts(),
    api.get('/products').then(r => products.value = r.data.data),
  ]);
});
</script>
