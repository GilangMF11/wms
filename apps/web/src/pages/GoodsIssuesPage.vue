<template>
  <div class="space-y-4">
    <div v-if="!showForm">
      <div class="flex items-center justify-between">
        <h1 class="page-title">Stok Keluar</h1>
        <Button label="Tambah Pengeluaran" icon="pi pi-plus" @click="openForm()" />
      </div>

      <Skeleton v-if="loading" width="100%" height="20rem" class="mt-4" />
      <div v-else-if="issues.length === 0" class="empty-state mt-4">
        <i class="pi pi-arrow-up-right" />
        <p>Belum ada pengeluaran barang</p>
      </div>
      <DataTable v-else :value="issues" paginator :rows="20" size="small" stripedRows class="mt-4">
        <Column field="issueNumber" header="No. Issue" class="font-mono" />
        <Column header="Tanggal">
          <template #body="{ data }">{{ formatDate(data.issueDate) }}</template>
        </Column>
        <Column field="notes" header="Catatan" />
        <Column header="Status">
          <template #body="{ data }">
            <span class="status-badge" :class="'status-' + data.status">{{ data.status }}</span>
          </template>
        </Column>
        <Column header="Aksi" style="width:140px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button v-if="data.status === 'draft'" icon="pi pi-check" text size="small" severity="success"
                v-tooltip.top="'Konfirmasi'" @click.stop="confirmIssue(data)" />
              <Button v-if="data.status === 'confirmed' && auth.user?.role === 'admin'" icon="pi pi-times" text
                size="small" severity="danger" v-tooltip.top="'Batalkan'" @click.stop="cancelIssue(data)" />
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
            <span class="card-title">Pengeluaran Baru</span>
            <Button v-if="formItems.length > 0" label="Simpan & Konfirmasi" icon="pi pi-check" severity="success"
              :loading="saving" @click="saveAndConfirm" />
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-medium mb-1">Tanggal</label>
              <DatePicker v-model="form.issue_date" class="w-full" dateFormat="dd/mm/yy" showIcon />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Catatan</label>
              <InputText v-model="form.notes" class="w-full" placeholder="Contoh: Penjualan tunai" />
            </div>
          </div>

          <div class="flex items-center justify-between mb-3">
            <h3 class="section-title">Serial Numbers</h3>
              <Button label="+ Tambah" icon="pi pi-plus" size="small" severity="secondary" outlined @click="addItem" />
              <Button icon="pi pi-camera" size="small" severity="info" outlined v-tooltip.top="'Scan SN'"
                @click="showScanner = true" />
          </div>

          <div v-if="formItems.length === 0" class="empty-state border rounded p-6">
            <i class="pi pi-qrcode" />
            <p>Pilih serial number yang akan dikeluarkan</p>
          </div>
          <div v-else class="space-y-3">
            <div v-for="(item, i) in formItems" :key="i" class="grid grid-cols-12 gap-3 items-start p-3 bg-slate-50 rounded">
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-xs text-slate-500 mb-1">Serial Number</label>
                <AutoComplete v-model="item.selectedSn" :suggestions="snSuggestions" optionLabel="serialNumber"
                  placeholder="Cari serial number..." class="w-full font-mono" size="small" dropdown forceSelection
                  @complete="searchSN($event)" @item-select="onSnSelect($event, i)">
                  <template #option="{ option }">
                    <div class="flex justify-between items-center text-sm">
                      <span class="font-mono">{{ option.serialNumber }}</span>
                      <small class="text-slate-400">{{ option.productName }}</small>
                    </div>
                  </template>
                </AutoComplete>
              </div>
              <div class="col-span-6 sm:col-span-4">
                <label class="block text-xs text-slate-500 mb-1">Harga Jual</label>
                <InputNumber v-model="item.sell_price" class="w-full" size="small" mode="currency" currency="IDR" />
              </div>
              <div class="col-span-6 sm:col-span-2 flex items-end justify-end">
                <Button icon="pi pi-trash" severity="danger" text size="small" @click="formItems.splice(i, 1)" />
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <BarcodeScanner v-model:visible="showScanner" @scan="onScan" />
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
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import DatePicker from 'primevue/datepicker';
import AutoComplete from 'primevue/autocomplete';
import BarcodeScanner from '../components/BarcodeScanner.vue';

const auth = useAuthStore();
const { ask } = useConfirmAction();
const issues = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const showForm = ref(false);
const showScanner = ref(false);
const snSuggestions = ref<any[]>([]);

const form = ref({ issue_date: new Date(), notes: '' });
const formItems = ref<any[]>([]);

function formatDate(d: string) { return new Date(d).toLocaleDateString('id-ID'); }

function openForm() {
  form.value = { issue_date: new Date(), notes: '' };
  formItems.value = [];
  showForm.value = true;
}

function addItem() {
  formItems.value.push({ serial_number_id: '', selectedSn: null, sell_price: 0 });
}

async function onScan(code: string) {
  addItem();
  const i = formItems.value.length - 1;
  const { data } = await api.get('/serial-numbers', { params: { serial_number: code, status: 'in_stock', limit: 1 } });
  const sn = data.data[0];
  if (sn) {
    const { data: p } = await api.get(`/products/${sn.productId}`);
    formItems.value[i] = { serial_number_id: sn.id, selectedSn: { ...sn, productName: p.data?.name }, sell_price: Number(sn.sellPrice) || 0 };
  }
}

async function searchSN(event: any) {
  const query = event.query?.trim();
  if (!query || query.length < 2) { snSuggestions.value = []; return; }
  const { data } = await api.get('/serial-numbers', { params: { serial_number: query, status: 'in_stock', limit: 10 } });
  const enriched = await Promise.all(data.data.map(async (sn: any) => {
    const { data: p } = await api.get(`/products/${sn.productId}`);
    return { ...sn, productName: p.data?.name ?? '??' };
  }));
  snSuggestions.value = enriched;
}

function onSnSelect(event: any, index: number) {
  formItems.value[index].serial_number_id = event.value.id;
  formItems.value[index].selectedSn = event.value;
}

async function saveAndConfirm() {
  saving.value = true;
  try {
    const payload = {
      issue_date: form.value.issue_date.toISOString(),
      notes: form.value.notes || undefined,
      items: formItems.value.map(i => ({
        serial_number_id: i.serial_number_id,
        sell_price: i.sell_price || undefined,
      })),
    };
    const { data } = await api.post('/goods-issues', payload);
    await api.post(`/goods-issues/${data.data.id}/confirm`);
    showForm.value = false;
    fetchIssues();
  } finally { saving.value = false; }
}

async function confirmIssue(r: any) {
  ask('Konfirmasi pengeluaran ini? Stok akan berkurang.', async () => {
    await api.post(`/goods-issues/${r.id}/confirm`);
    fetchIssues();
  });
}

async function cancelIssue(r: any) {
  ask('Batalkan pengeluaran ini? Stok akan kembali.', async () => {
    await api.post(`/goods-issues/${r.id}/cancel`);
    fetchIssues();
  });
}

async function fetchIssues() {
  loading.value = true;
  try {
    const { data } = await api.get('/goods-issues');
    issues.value = data.data;
  } finally { loading.value = false; }
}

onMounted(fetchIssues);
</script>
