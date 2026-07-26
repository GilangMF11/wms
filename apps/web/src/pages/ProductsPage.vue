<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="page-title">Produk</h1>
      <Button
        v-if="auth.user?.role === 'admin'"
        label="Tambah Produk"
        icon="pi pi-plus"
        @click="openDialog()"
      />
    </div>

    <div v-if="!showDetail">
      <Toolbar class="mb-3">
        <template #start>
          <div class="flex gap-2">
            <InputText v-model="search" placeholder="Cari nama/SKU..." class="w-64" size="small"
              @input="debouncedFetch" />
            <Button icon="pi pi-camera" severity="secondary" outlined size="small" v-tooltip.top="'Scan SKU'"
              @click="scanningForSku = true" />
            <Dropdown
              v-if="categories.length"
              v-model="selectedCategory"
              :options="categories"
              optionLabel="name"
              optionValue="id"
              placeholder="Semua kategori"
              class="w-48"
              size="small"
              showClear
              @change="fetchProducts"
            />
          </div>
        </template>
      </Toolbar>

      <Skeleton v-if="loading" width="100%" height="20rem" />
      <div v-else-if="products.length === 0" class="empty-state">
        <i class="pi pi-box" />
        <p>Belum ada produk. Tambahkan produk pertama.</p>
      </div>
      <DataTable v-else :value="products" paginator :rows="20" size="small" stripedRows
        selectionMode="single" @row-click="onRowClick">
        <Column field="sku" header="SKU" sortable class="font-mono" />
        <Column field="name" header="Nama Produk" sortable />
        <Column field="brand" header="Brand" sortable />
        <Column header="Kategori">
          <template #body="{ data }">
            {{ getCategoryName(data.categoryId) }}
          </template>
        </Column>
        <Column header="Harga Jual">
          <template #body="{ data }">
            {{ formatCurrency(Number(data.sellPrice)) }}
          </template>
        </Column>
        <Column header="Aksi" style="width:80px">
          <template #body="{ data }">
            <Button
              v-if="auth.user?.role === 'admin'"
              icon="pi pi-pencil"
              text size="small"
              severity="secondary"
              @click.stop="openDialog(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <div v-else>
      <Button label="← Kembali" severity="secondary" text size="small" @click="showDetail = false" class="mb-4" />
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <span class="card-title">{{ detailProduct.name }}</span>
            <Button icon="pi pi-shield" label="Cek Garansi" size="small" @click="warrantyDialog = true" />
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
            <div><span class="text-slate-500">SKU</span><br /><span class="font-mono font-medium">{{ detailProduct.sku }}</span></div>
            <div><span class="text-slate-500">Brand</span><br /><span class="font-medium">{{ detailProduct.brand || '-' }}</span></div>
            <div><span class="text-slate-500">Harga Beli</span><br /><span class="font-medium">{{ formatCurrency(Number(detailProduct.buyPrice)) }}</span></div>
            <div><span class="text-slate-500">Harga Jual</span><br /><span class="font-medium">{{ formatCurrency(Number(detailProduct.sellPrice)) }}</span></div>
          </div>
          <div v-if="detailProduct.imageUrl" class="mb-4">
            <img :src="detailProduct.imageUrl" class="h-32 rounded border object-cover" />
          </div>
          <h3 class="section-title mb-3">Serial Numbers ({{ serialNumbers.length }})</h3>
          <Skeleton v-if="snLoading" width="100%" height="12rem" />
          <div v-else-if="serialNumbers.length === 0" class="empty-state">
            <i class="pi pi-qrcode" />
            <p>Belum ada serial number</p>
          </div>
          <DataTable v-else :value="serialNumbers" size="small" paginator :rows="10">
            <Column field="serialNumber" header="Serial Number" class="font-mono" />
            <Column field="condition" header="Kondisi" />
            <Column field="status" header="Status">
              <template #body="{ data }">
                <Tag :value="data.status" :severity="snStatusSeverity(data.status)" />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>

    <Dialog v-model:visible="formDialog" :header="editing ? 'Edit Produk' : 'Tambah Produk'" :modal="true" class="w-full max-w-lg">
      <form @submit.prevent="saveProduct" class="flex flex-col gap-3">
        <div class="flex gap-2">
          <div class="flex-1">
            <label class="block text-sm font-medium mb-1">SKU *</label>
            <InputText v-model="form.sku" class="w-full font-mono" required />
          </div>
          <div class="self-end">
            <Button icon="pi pi-camera" severity="secondary" outlined size="small" v-tooltip.top="'Scan SKU'"
              @click="scanForSku = true" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Nama *</label>
          <InputText v-model="form.name" class="w-full" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Brand</label>
          <InputText v-model="form.brand" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Kategori</label>
          <Dropdown v-model="form.category_id" :options="categories" optionLabel="name" optionValue="id" placeholder="Pilih kategori" class="w-full" showClear />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Harga Beli</label>
            <InputNumber v-model="form.buy_price" class="w-full" mode="currency" currency="IDR" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Harga Jual</label>
            <InputNumber v-model="form.sell_price" class="w-full" mode="currency" currency="IDR" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Foto Produk</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="onFileChange"
            class="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <p v-if="uploading" class="text-xs text-blue-600 mt-1">Uploading...</p>
          <div v-if="form.image_url" class="mt-2">
            <img :src="form.image_url" class="h-24 rounded border object-cover" />
          </div>
        </div>
        <Button type="submit" :label="editing ? 'Update' : 'Simpan'" :loading="saving" class="mt-2" />
      </form>
    </Dialog>

    <Dialog v-model:visible="warrantyDialog" header="Cek Garansi" :modal="true" class="w-full max-w-md">
      <div class="flex flex-col gap-2">
        <div>
          <label class="block text-sm font-medium mb-1">Serial Number</label>
          <div class="flex gap-2">
          <InputText v-model="warrantySn" placeholder="Masukkan serial number..." class="flex-1 font-mono" size="small" />
          <Button icon="pi pi-camera" severity="secondary" outlined size="small" v-tooltip.top="'Scan'"
            @click="scanForWarranty = true" />
        </div>
        </div>
        <Button label="Cek" icon="pi pi-search" :loading="checkingWarranty" @click="checkWarranty" size="small" />
        <Divider v-if="warrantyResult" />
        <div v-if="warrantyResult" class="space-y-2 text-sm">
          <div><strong>Produk:</strong> {{ warrantyResult.product_name }}</div>
          <div><strong>Tanggal Jual:</strong> {{ formatDate(warrantyResult.sold_at) }}</div>
          <div><strong>Garansi Berakhir:</strong> {{ formatDate(warrantyResult.warranty_expires_at) }}</div>
          <div><strong>Sisa Hari:</strong> {{ warrantyResult.days_remaining }}</div>
          <Tag :value="warrantyResult.status" :severity="warrantyResult.status === 'active' ? 'success' : 'danger'" />
        </div>
      </div>
    </Dialog>

    <BarcodeScanner v-model:visible="scanForWarranty" @scan="onWarrantyScan" />
    <BarcodeScanner v-model:visible="scanningForSku" @scan="onSearchScan" />
    <BarcodeScanner v-model:visible="scanForSku" @scan="onSkuScan" />
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
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Divider from 'primevue/divider';
import Toolbar from 'primevue/toolbar';
import BarcodeScanner from '../components/BarcodeScanner.vue';

const auth = useAuthStore();
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const selectedCategory = ref(null);
const showDetail = ref(false);
const detailProduct = ref<any>({});
const serialNumbers = ref<any[]>([]);
const snLoading = ref(false);
const formDialog = ref(false);
const editing = ref<any>(null);
const warrantyDialog = ref(false);
const warrantySn = ref('');
const warrantyResult = ref<any>(null);
const checkingWarranty = ref(false);
const scanForWarranty = ref(false);

const scanningForSku = ref(false);
const scanForSku = ref(false);
const uploading = ref(false);

const form = ref({ sku: '', name: '', brand: '', category_id: '', buy_price: 0, sell_price: 0, image_url: '' });
let debounceTimer: any = null;

function formatCurrency(n: number) { return n ? 'Rp ' + n.toLocaleString('id-ID') : '-'; }
function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }
function getCategoryName(id: string) { return categories.value.find((c: any) => c.id === id)?.name ?? '-'; }
function snStatusSeverity(s: string) {
  const m: Record<string, string> = { in_stock: 'success', sold: 'info', returned: 'warn', rma: 'danger' };
  return m[s] ?? 'secondary';
}

function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchProducts, 300);
}

async function fetchProducts() {
  loading.value = true;
  try {
    const params: any = {};
    if (search.value) params.search = search.value;
    if (selectedCategory.value) params.category_id = selectedCategory.value;
    const { data } = await api.get('/products', { params });
    products.value = data.data;
  } finally { loading.value = false; }
}

async function onRowClick(e: any) {
  showDetail.value = true;
  detailProduct.value = e.data;
  snLoading.value = true;
  const { data } = await api.get('/serial-numbers', { params: { product_id: e.data.id, limit: 100 } });
  serialNumbers.value = data.data;
  snLoading.value = false;
}

function openDialog(product?: any) {
  if (product) {
    editing.value = product;
    form.value = { ...product, buy_price: Number(product.buyPrice) || 0, sell_price: Number(product.sellPrice) || 0, category_id: product.categoryId || '', image_url: product.imageUrl || '' };
  } else {
    editing.value = null;
    form.value = { sku: '', name: '', brand: '', category_id: '', buy_price: 0, sell_price: 0, image_url: '' };
  }
  formDialog.value = true;
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/uploads', fd);
    form.value.image_url = data.data.url;
  } finally { uploading.value = false; }
}

function onSkuScan(code: string) {
  form.value.sku = code;
}

function onSearchScan(code: string) {
  search.value = code;
  fetchProducts();
}

async function saveProduct() {
  saving.value = true;
  try {
    const payload = {
      sku: form.value.sku,
      name: form.value.name,
      brand: form.value.brand || undefined,
      category_id: form.value.category_id || undefined,
      buy_price: form.value.buy_price || undefined,
      sell_price: form.value.sell_price || undefined,
      image_url: form.value.image_url || undefined,
    };
    if (editing.value) {
      await api.put(`/products/${editing.value.id}`, payload);
    } else {
      await api.post('/products', payload);
    }
    formDialog.value = false;
    fetchProducts();
  } finally { saving.value = false; }
}

async function checkWarranty() {
  if (!warrantySn.value) return;
  checkingWarranty.value = true;
  try {
    const { data } = await api.get('/serial-numbers', { params: { serial_number: warrantySn.value, limit: 1 } });
    const sn = data.data[0];
    if (!sn) { warrantyResult.value = null; return; }
    const { data: w } = await api.get(`/serial-numbers/${sn.id}/warranty`);
    warrantyResult.value = w.data;
  } finally { checkingWarranty.value = false; }
}

function onWarrantyScan(code: string) {
  warrantySn.value = code;
  checkWarranty();
}

onMounted(async () => {
  const [_, cats] = await Promise.all([
    fetchProducts(),
    api.get('/products/categories/all').then(r => categories.value = r.data.data),
  ]);
});
</script>
