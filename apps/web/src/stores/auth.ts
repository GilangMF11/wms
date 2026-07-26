import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../lib/axios';
import router from '../lib/router';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff' | 'owner';
  warehouseId?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!user.value && !!localStorage.getItem('access_token'));

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('refresh_token', data.data.refresh_token);
      user.value = data.data.user;
      router.push('/');
    } catch (e) {
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    user.value = null;
    router.push('/login');
  }

  async function restore() {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const { data } = await api.get('/dashboard/summary');
    } catch {
      logout();
    }
  }

  return { user, loading, isAuthenticated, login, logout, restore };
});
