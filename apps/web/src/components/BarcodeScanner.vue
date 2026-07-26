<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" header="Scan Barcode / QR" :modal="true" class="w-full max-w-sm" :closable="false">
    <div v-if="error" class="p-3 bg-red-50 rounded text-sm text-red-700 mb-3 flex items-center gap-2">
      <i class="pi pi-exclamation-triangle" /> {{ error }}
    </div>
    <div id="barcode-reader" ref="readerEl" class="rounded overflow-hidden mb-3" style="min-height: 200px" />
    <p v-if="!error && !lastScan" class="text-xs text-slate-500 text-center mb-3">
      Arahkan kamera ke barcode atau QR code.<br />
      <span class="text-amber-600">Jika kamera tidak muncul, izinkan akses kamera di pengaturan browser.</span>
    </p>
    <p v-else-if="!error" class="text-xs text-green-600 text-center mb-3">Terbaca! {{ lastScan }}</p>
    <div class="flex justify-between gap-2">
      <div class="flex gap-2">
        <Button label="Batal" severity="secondary" outlined @click="stop" />
        <Button v-if="error" label="Coba Lagi" icon="pi pi-refresh" @click="start" size="small" />
      </div>
      <Button v-if="!lastScan" icon="pi pi-sync" severity="info" text size="small" v-tooltip.top="'Ganti Kamera'" @click="switchCamera" />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  'update:visible': [value: boolean];
  scan: [value: string];
}>();

const readerEl = ref<HTMLDivElement | null>(null);
const error = ref('');
const lastScan = ref('');
let scanner: any = null;
let currentFacingMode: 'environment' | 'user' = 'environment';

async function start() {
  error.value = '';
  lastScan.value = '';
  if (!readerEl.value) return;

  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    scanner = new Html5Qrcode('barcode-reader');

    await scanner.start(
      { facingMode: currentFacingMode },
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
      (text: string) => {
        lastScan.value = text;
        emit('scan', text);
        stop();
      },
      () => {},
    );
  } catch (e: any) {
    const msg = e?.message || e?.toString() || '';
    if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
      error.value = 'Akses kamera ditolak. Buka pengaturan browser → izinkan kamera untuk situs ini.';
    } else if (msg.includes('NotFoundError') || msg.includes('No camera')) {
      error.value = 'Kamera tidak ditemukan di perangkat ini.';
    } else if (msg.includes('insecure') || msg.includes('HTTPS')) {
      error.value = 'Kamera hanya bisa diakses via HTTPS. Akses dari localhost atau HTTPS.';
    } else {
      error.value = 'Gagal mengakses kamera. Pastikan kamera tersedia dan izin diberikan.';
    }
  }
}

async function switchCamera() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  if (scanner) {
    try { await scanner.stop(); } catch {}
    try { scanner.clear(); } catch {}
    scanner = null;
  }
  await nextTick();
  await start();
}

async function stop() {
  if (scanner) {
    try { await scanner.stop(); } catch {}
    try { scanner.clear(); } catch {}
    scanner = null;
  }
  emit('update:visible', false);
}

watch(() => props.visible, async (v) => {
  if (v) {
    currentFacingMode = 'environment';
    await nextTick();
    await start();
  }
});

onUnmounted(() => {
  if (scanner) { try { scanner.stop(); } catch {} }
});
</script>
