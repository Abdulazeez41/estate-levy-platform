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
