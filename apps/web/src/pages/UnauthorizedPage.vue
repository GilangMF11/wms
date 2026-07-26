<template>
  <div class="flex items-center justify-center min-h-screen">
    <Card class="text-center">
      <template #content>
        <i class="pi pi-lock text-4xl text-slate-400 mb-3 block" />
        <h2 class="text-xl font-semibold">Akses Ditolak</h2>
        <p class="text-slate-500 mt-2">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <Button label="Kembali ke Dashboard" @click="$router.push('/')" class="mt-4" />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card';
import Button from 'primevue/button';
</script>
