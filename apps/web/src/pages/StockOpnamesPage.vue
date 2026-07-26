<template>
  <div class="space-y-4">
    <div v-if="!showDetail">
      <div class="flex items-center justify-between">
        <h1 class="page-title">Stock Opname</h1>
        <Button label="Opname Baru" icon="pi pi-plus" @click="createOpname" :loading="creating" />
      </div>

      <Skeleton v-if="loading" width="100%" height="20rem" class="mt-4" />
      <div v-else-if="opnames.length === 0" class="empty-state mt-4">
        <i class="pi pi-list-check" />
        <p>Belum ada sesi stock opname</p>
      </div>
      <DataTable v-else :value="opnames" paginator :rows="20" size="small" stripedRows responsiveLayout="scroll" class="mt-4"
        selectionMode="single" @row-click="onRowClick">
        <Column field="opnameNumber" header="No. Opname" class="font-mono" />
        <Column header="Tanggal">
          <template #body="{ data }">{{ formatDate(data.opnameDate) }}</template>
        </Column>
        <Column header="Status">
          <template #body="{ data }">
            <span class="status-badge" :class="'status-' + data.status">{{ data.status }}</span>
          </template>
        </Column>
        <Column header="Aksi" style="width:140px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button v-if="data.status === 'draft'" label="Submit" icon="pi pi-send" text size="small" severity="warn"
                @click.stop="submitOpname(data)" />
              <Button v-if="data.status === 'review' && auth.user?.role === 'admin'" label="Approve" icon="pi pi-check"
                text size="small" severity="success" @click.stop="approveOpname(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <div v-else>
      <Button label="← Kembali" severity="secondary" text size="small" @click="showDetail = false" class="mb-4" />

      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <span class="card-title font-mono">{{ detailOpname.opnameNumber }}</span>
            <span class="status-badge" :class="'status-' + detailOpname.status">{{ detailOpname.status }}</span>
          </div>
        </template>
        <template #content>
          <p class="text-sm text-slate-500 mb-4">Tanggal: {{ formatDate(detailOpname.opnameDate) }}</p>

          <Skeleton v-if="detailLoading" width="100%" height="12rem" />
          <div v-else-if="opnameItems.length === 0" class="empty-state">
            <i class="pi pi-inbox" />
            <p>Tidak ada item opname</p>
          </div>
          <div v-else>
            <div v-if="detailOpname.status === 'draft'" class="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
              Isi jumlah fisik untuk setiap produk, lalu klik Submit.
            </div>

            <DataTable :value="opnameItems" size="small" responsiveLayout="scroll">
              <Column header="Produk">
                <template #body="{ data }">{{ getProductName(data.productId) }}</template>
              </Column>
              <Column field="systemQuantity" header="System Qty" />
              <Column header="Fisik Qty">
                <template #body="{ data, index }">
                  <span v-if="detailOpname.status !== 'draft'">{{ data.physicalQuantity }}</span>
                  <InputNumber v-else v-model="opnameItems[index].physicalQuantity" size="small" :min="0" style="width:80px"
                    @input="onQtyChange(index)" />
                </template>
              </Column>
              <Column header="Selisih">
                <template #body="{ data }">
                  <span :class="data.difference > 0 ? 'text-green-600 font-semibold' : data.difference < 0 ? 'text-red-600 font-semibold' : ''">
                    {{ data.difference > 0 ? '+' : '' }}{{ data.difference }}
                  </span>
                </template>
              </Column>
            </DataTable>

            <div v-if="detailOpname.status === 'draft'" class="flex justify-end mt-4">
              <Button label="Simpan & Submit" icon="pi pi-send" severity="warn" :loading="submitting" @click="saveAndSubmit" />
            </div>
          </div>
        </template>
      </Card>
    </div>
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
import InputNumber from 'primevue/inputnumber';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';

const auth = useAuthStore();
const { ask } = useConfirmAction();
const opnames = ref<any[]>([]);
const products = ref<any[]>([]);
const loading = ref(false);
const detailLoading = ref(false);
const creating = ref(false);
const submitting = ref(false);
const showDetail = ref(false);
const detailOpname = ref<any>({});
const opnameItems = ref<any[]>([]);

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }
function getProductName(id: string) { return products.value.find(p => p.id === id)?.name ?? id; }

function onQtyChange(index: number) {
  const item = opnameItems.value[index];
  item.difference = item.physicalQuantity - item.systemQuantity;
}

async function createOpname() {
  creating.value = true;
  try {
    await api.post('/stock-opnames', { opname_date: new Date().toISOString() });
    fetchOpnames();
  } finally { creating.value = false; }
}

async function onRowClick(e: any) {
  showDetail.value = true;
  detailOpname.value = e.data;
  detailLoading.value = true;
  const { data } = await api.get(`/stock-opnames/${e.data.id}`);
  detailOpname.value = data.data;
  opnameItems.value = data.data.items || [];
  detailLoading.value = false;
}

async function saveAndSubmit() {
  submitting.value = true;
  try {
    await api.put(`/stock-opnames/${detailOpname.value.id}/items`, {
      items: opnameItems.value.map(i => ({ product_id: i.productId, physical_quantity: i.physicalQuantity })),
    });
    await api.post(`/stock-opnames/${detailOpname.value.id}/submit`);
    showDetail.value = false;
    fetchOpnames();
  } finally { submitting.value = false; }
}

async function submitOpname(o: any) {
  ask('Submit opname ini untuk review?', async () => {
    await api.post(`/stock-opnames/${o.id}/submit`);
    fetchOpnames();
  });
}

async function approveOpname(o: any) {
  ask('Approve opname ini? Selisih akan dicatat sebagai adjustment.', async () => {
    await api.post(`/stock-opnames/${o.id}/approve`);
    fetchOpnames();
  });
}

async function fetchOpnames() {
  loading.value = true;
  try {
    const { data } = await api.get('/stock-opnames');
    opnames.value = data.data;
  } finally { loading.value = false; }
}

onMounted(async () => {
  await Promise.all([
    fetchOpnames(),
    api.get('/products').then(r => products.value = r.data.data),
  ]);
});
</script>
