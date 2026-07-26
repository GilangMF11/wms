<template>
  <div class="min-h-screen flex items-center justify-center px-4" style="background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #f1f5f9 100%)">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
          <i class="pi pi-box text-3xl text-white" />
        </div>
        <h1 class="text-2xl font-semibold text-slate-800">WMS Gudang Elektronik</h1>
        <p class="text-sm text-slate-500 mt-1">Warehouse Management System</p>
      </div>

      <Card>
        <template #content>
          <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <InputText
                v-model="email"
                placeholder="Masukkan email"
                class="w-full"
                :invalid="!!loginError"
                @input="loginError = ''"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <Password
                v-model="password"
                :feedback="false"
                toggleMask
                placeholder="Masukkan password"
                class="w-full"
                :inputProps="{ class: 'w-full' }"
                :invalid="!!loginError"
                @input="loginError = ''"
                @keyup.enter="handleLogin"
              />
            </div>
            <p v-if="loginError" class="text-sm text-red-600 flex items-center gap-1">
              <i class="pi pi-exclamation-circle" /> {{ loginError }}
            </p>
            <Button type="submit" label="Login" icon="pi pi-sign-in" :loading="loading" class="w-full" />
          </form>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';

const auth = useAuthStore();
const email = ref('');
const password = ref('');
const loginError = ref('');
const loading = ref(false);

async function handleLogin() {
  loginError.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
  } catch (e: any) {
    loginError.value = e?.response?.data?.error?.message || 'Login gagal. Periksa email dan password.';
  } finally {
    loading.value = false;
  }
}
</script>
