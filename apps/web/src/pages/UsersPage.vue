<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="page-title">Pengguna</h1>
      <Button v-if="auth.user?.role === 'admin'" label="Tambah User" icon="pi pi-plus" @click="openForm()" />
    </div>

    <Skeleton v-if="loading" width="100%" height="20rem" />
    <div v-else-if="users.length === 0" class="empty-state">
      <i class="pi pi-users" />
      <p>Belum ada pengguna</p>
    </div>
    <DataTable v-else :value="users" size="small" stripedRows responsiveLayout="scroll">
      <Column field="email" header="Email" />
      <Column field="full_name" header="Nama" />
      <Column header="Role">
        <template #body="{ data }">
          <Tag :value="data.role" :severity="data.role === 'admin' ? 'danger' : data.role === 'owner' ? 'warn' : 'info'" />
        </template>
      </Column>
      <Column header="Aktif">
        <template #body="{ data }">
          <Tag :value="data.is_active ? 'Aktif' : 'Nonaktif'" :severity="data.is_active ? 'success' : 'danger'" />
        </template>
      </Column>
      <Column header="Aksi" style="width:140px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" text size="small" severity="secondary"
              v-tooltip.top="'Edit'" @click.stop="openForm(data)" />
            <Button v-if="data.is_active" icon="pi pi-ban" text size="small" severity="danger"
              v-tooltip.top="'Nonaktifkan'" @click.stop="deactivateUser(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="formDialog" :header="editing ? 'Edit User' : 'Tambah User'" :modal="true" class="w-full max-w-md">
      <form @submit.prevent="saveUser" class="flex flex-col gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">Email *</label>
          <InputText v-model="userForm.email" class="w-full" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Nama *</label>
          <InputText v-model="userForm.full_name" class="w-full" required />
        </div>
        <div v-if="!editing">
          <label class="block text-sm font-medium mb-1">Password *</label>
          <Password v-model="userForm.password" :feedback="false" toggleMask class="w-full" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Role *</label>
          <Dropdown v-model="userForm.role" :options="roleOptions" optionLabel="label" optionValue="value"
            class="w-full" required />
        </div>
        <Button type="submit" :label="editing ? 'Update' : 'Simpan'" :loading="saving" class="mt-2" />
      </form>
    </Dialog>
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
import Password from 'primevue/password';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';

const auth = useAuthStore();
const { ask } = useConfirmAction();
const users = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const formDialog = ref(false);
const editing = ref<any>(null);

const userForm = ref({ email: '', full_name: '', password: '', role: 'staff' });

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Staf Gudang', value: 'staff' },
  { label: 'Kepala Toko', value: 'owner' },
];

function openForm(user?: any) {
  if (user) {
    editing.value = user;
    userForm.value = { email: user.email, full_name: user.full_name, password: '', role: user.role };
  } else {
    editing.value = null;
    userForm.value = { email: '', full_name: '', password: '', role: 'staff' };
  }
  formDialog.value = true;
}

async function saveUser() {
  saving.value = true;
  try {
    const payload: any = {
      email: userForm.value.email,
      full_name: userForm.value.full_name,
      role: userForm.value.role,
    };
    if (!editing.value) payload.password = userForm.value.password;
    if (editing.value) {
      await api.put(`/users/${editing.value.id}`, payload);
    } else {
      await api.post('/users', payload);
    }
    formDialog.value = false;
    fetchUsers();
  } finally { saving.value = false; }
}

function deactivateUser(user: any) {
  ask(`Nonaktifkan user "${user.full_name}"?`, async () => {
    await api.post(`/users/${user.id}/deactivate`);
    fetchUsers();
  });
}

async function fetchUsers() {
  loading.value = true;
  try {
    const { data } = await api.get('/users');
    users.value = data.data;
  } finally { loading.value = false; }
}

onMounted(fetchUsers);
</script>
