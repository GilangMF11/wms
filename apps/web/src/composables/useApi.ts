import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';

export function useApi() {
  const toast = useToast();
  const loading = ref(false);

  async function call<T>(fn: () => Promise<T>, opts?: { errorMessage?: string }): Promise<T | null> {
    loading.value = true;
    try {
      return await fn();
    } catch (e: any) {
      const msg = opts?.errorMessage || e?.response?.data?.error?.message || 'Terjadi kesalahan';
      toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, call };
}
