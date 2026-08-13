import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

const defaultBaseURL = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000/api');

export const api = axios.create({
  baseURL: defaultBaseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const responseMessage = error.response?.data?.message;
    if (responseMessage) error.message = Array.isArray(responseMessage) ? responseMessage.join(', ') : String(responseMessage);
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const isAuthRoute = String(original?.url ?? '').includes('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const { data } = await axios.post<{ accessToken: string }>(`${defaultBaseURL}/auth/refresh`, {}, { withCredentials: true });
        useAuthStore.getState().setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().clearSession();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
