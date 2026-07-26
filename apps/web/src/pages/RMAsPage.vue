<template>
  <div class="space-y-4">
    <div v-if="!showDetail">
      <div class="flex items-center justify-between">
        <h1 class="page-title">RMA / Retur</h1>
        <Button label="Tambah RMA" icon="pi pi-plus" @click="openForm()" />
      </div>

      <Toolbar class="mb-3 mt-4">
        <template #start>
          <Select v-model="filterStatus" :options="rmaStatusOptions" optionLabel="label" optionValue="value"
            placeholder="Semua status" class="w-40" size="small" showClear @change="fetchRMAs" />
        </template>
      </Toolbar>

      <Skeleton v-if="loading" width="100%" height="20rem" />
      <div v-else-if="rmas.length === 0" class="empty-state">
        <i class="pi pi-replay" />
        <p>Belum ada data RMA</p>
      </div>
      <DataTable v-else :value="rmas" paginator :rows="20" size="small" stripedRows responsiveLayout="scroll"
        selectionMode="single" @row-click="onRowClick">
        <Column field="rmaNumber" header="No. RMA" class="font-mono" />
        <Column field="customerName" header="Pelanggan" />
        <Column field="reason" header="Alasan" class="max-w-xs">
          <template #body="{ data }">{{ truncate(data.reason, 50) }}</template>
        </Column>
        <Column header="Status">
          <template #body="{ data }">
            <span class="status-badge" :class="'status-' + data.status">{{ data.status }}</span>
          </template>
        </Column>
        <Column header="Tanggal">
          <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
        </Column>
      </DataTable>
    </div>

    <div v-else>
      <Button label="← Kembali" severity="secondary" text size="small" @click="showDetail = false" class="mb-4" />

      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <span class="card-title font-mono">{{ detailRma.rmaNumber }}</span>
            <span class="status-badge" :class="'status-' + detailRma.status">{{ detailRma.status }}</span>
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
            <div><span class="text-slate-500">Pelanggan</span><br /><span class="font-medium">{{ detailRma.customerName }}</span></div>
            <div><span class="text-slate-500">Serial Number</span><br /><span class="font-mono font-medium">{{ detailSerialNumber?.serialNumber ?? '-' }}</span></div>
            <div><span class="text-slate-500">Produk</span><br /><span class="font-medium">{{ detailProduct?.name ?? '-' }}</span></div>
            <div><span class="text-slate-500">Tanggal</span><br /><span class="font-medium">{{ formatDate(detailRma.createdAt) }}</span></div>
          </div>

          <div class="mb-4">
            <span class="text-slate-500 text-sm">Alasan</span>
            <p class="text-sm">{{ detailRma.reason }}</p>
          </div>

          <h4 class="text-sm font-semibold mb-2">Status RMA</h4>
          <div class="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            <template v-for="(step, si) in rmaSteps" :key="step.value">
              <div class="flex items-center gap-1 shrink-0">
                <div class="flex flex-col items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    :class="stepClass(step.value)">
                    {{ si + 1 }}
                  </div>
                  <small class="text-xs mt-1" :class="stepTextClass(step.value)">{{ step.label }}</small>
                </div>
                <div v-if="si < rmaSteps.length - 1" class="w-8 h-0.5"
                  :class="stepConnectorClass(step.value)" />
              </div>
            </template>
          </div>

          <div v-if="detailRma.resolution" class="mb-4">
            <span class="text-slate-500 text-sm">Resolusi</span>
            <p class="text-sm">{{ detailRma.resolution }}</p>
          </div>

          <div v-if="!['completed_replaced', 'completed_repaired', 'rejected'].includes(detailRma.status)" class="border-t pt-4">
            <h4 class="text-sm font-semibold mb-2">Update Status</h4>
            <div class="flex gap-2 items-end">
              <Select v-model="newStatus" :options="availableNextStatuses" optionLabel="label" optionValue="value"
                placeholder="Pilih status" class="w-48" size="small" />
              <Textarea v-if="['completed_replaced', 'completed_repaired', 'rejected'].includes(newStatus)"
                v-model="newResolution" class="flex-1" rows="2" placeholder="Detail resolusi..." size="small" />
              <Button label="Update" icon="pi pi-check" size="small" :loading="updating" @click="updateStatus" />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <Dialog v-model:visible="formDialog" header="Buat RMA Baru" :modal="true" class="w-full max-w-lg">
      <form @submit.prevent="createRma" class="flex flex-col gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">Serial Number *</label>
          <AutoComplete v-model="selectedSn" :suggestions="snSuggestions" optionLabel="serialNumber"
            placeholder="Ketik serial number..." class="w-full font-mono" size="small" forceSelection
            @complete="searchSN" :minLength="1" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Nama Pelanggan *</label>
          <InputText v-model="rmaForm.customer_name" class="w-full" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Alasan *</label>
          <Textarea v-model="rmaForm.reason" class="w-full" rows="3" required placeholder="Deskripsikan masalah..." />
        </div>
        <Button type="submit" label="Simpan" :loading="rmaSaving" />
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '../lib/axios';
import { useAuthStore } from '../stores/auth';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Toolbar from 'primevue/toolbar';
import AutoComplete from 'primevue/autocomplete';

const auth = useAuthStore();
const rmas = ref<any[]>([]);
const loading = ref(false);
const rmaSaving = ref(false);
const updating = ref(false);
const showDetail = ref(false);
const detailRma = ref<any>({});
const detailSerialNumber = ref<any>(null);
const detailProduct = ref<any>(null);
const formDialog = ref(false);
const selectedSn = ref<any>(null);
const snSuggestions = ref<any[]>([]);
const newStatus = ref('');
const newResolution = ref('');
const filterStatus = ref('');

const rmaForm = ref({ serial_number_id: '', customer_name: '', reason: '' });

const rmaStatusOptions = [
  { label: 'Diterima', value: 'received' },
  { label: 'Diproses', value: 'processing' },
  { label: 'Selesai (Diganti)', value: 'completed_replaced' },
  { label: 'Selesai (Diperbaiki)', value: 'completed_repaired' },
  { label: 'Ditolak', value: 'rejected' },
];

const rmaSteps = [
  { label: 'Diterima', value: 'received' },
  { label: 'Diproses', value: 'processing' },
  { label: 'Selesai/Ditolak', value: 'completed' },
];

const availableNextStatuses = computed(() => {
  if (detailRma.value.status === 'received') return [
    { label: 'Diproses', value: 'processing' },
    { label: 'Selesai - Diganti', value: 'completed_replaced' },
    { label: 'Selesai - Diperbaiki', value: 'completed_repaired' },
    { label: 'Ditolak', value: 'rejected' },
  ];
  return [
    { label: 'Selesai - Diganti', value: 'completed_replaced' },
    { label: 'Selesai - Diperbaiki', value: 'completed_repaired' },
    { label: 'Ditolak', value: 'rejected' },
  ];
});

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }
function truncate(s: string, n: number) { return s?.length > n ? s.slice(0, n) + '...' : s; }

const currentStepIndex = computed(() => {
  if (['received'].includes(detailRma.value.status)) return 1;
  if (['processing'].includes(detailRma.value.status)) return 2;
  return 3;
});

function stepClass(v: string) {
  const idx = rmaSteps.findIndex(s => s.value === v);
  if (idx + 1 < currentStepIndex.value) return 'bg-green-500 text-white';
  if (idx + 1 === currentStepIndex.value) return 'bg-blue-600 text-white';
  return 'bg-slate-200 text-slate-500';
}

function stepTextClass(v: string) {
  const idx = rmaSteps.findIndex(s => s.value === v);
  return idx + 1 <= currentStepIndex.value ? 'text-slate-700' : 'text-slate-400';
}

function stepConnectorClass(v: string) {
  const idx = rmaSteps.findIndex(s => s.value === v);
  return idx + 1 < currentStepIndex.value ? 'bg-green-500' : 'bg-slate-200';
}

async function onRowClick(e: any) {
  showDetail.value = true;
  detailRma.value = e.data;
  const { data } = await api.get(`/rmas/${e.data.id}`);
  detailRma.value = data.data;
  detailSerialNumber.value = data.data?.serial_number ?? null;
  detailProduct.value = data.data?.product ?? null;
}

async function updateStatus() {
  if (!newStatus.value) return;
  updating.value = true;
  try {
    await api.put(`/rmas/${detailRma.value.id}/status`, {
      status: newStatus.value,
      resolution: newResolution.value || undefined,
    });
    newStatus.value = '';
    newResolution.value = '';
    onRowClick({ data: detailRma.value });
  } finally { updating.value = false; }
}

async function searchSN(event: any) {
  const q = event.query?.trim();
  if (!q) { snSuggestions.value = []; return; }
  const { data } = await api.get('/serial-numbers', { params: { serial_number: q, status: 'sold', limit: 20 } });
  const enriched = await Promise.all(data.data.map(async (sn: any) => {
    const { data: p } = await api.get(`/products/${sn.productId}`);
    return { ...sn, productName: p.data?.name ?? '??' };
  }));
  snSuggestions.value = enriched;
}

function openForm() {
  rmaForm.value = { serial_number_id: '', customer_name: '', reason: '' };
  selectedSn.value = null;
  formDialog.value = true;
}

async function createRma() {
  if (!selectedSn.value) return;
  rmaSaving.value = true;
  try {
    await api.post('/rmas', {
      serial_number_id: selectedSn.value.id,
      customer_name: rmaForm.value.customer_name,
      reason: rmaForm.value.reason,
    });
    formDialog.value = false;
    fetchRMAs();
  } finally { rmaSaving.value = false; }
}

async function fetchRMAs() {
  loading.value = true;
  try {
    const params: any = {};
    if (filterStatus.value) params.status = filterStatus.value;
    const { data } = await api.get('/rmas', { params });
    rmas.value = data.data;
  } finally { loading.value = false; }
}

onMounted(fetchRMAs);
</script>
