import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
          localStorage.setItem('access_token', data.data.access_token);
          localStorage.setItem('refresh_token', data.data.refresh_token);
          original.headers.Authorization = `Bearer ${data.data.access_token}`;
          return api(original);
        } catch {
          useAuthStore().logout();
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
