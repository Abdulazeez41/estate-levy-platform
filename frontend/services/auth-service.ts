import { api } from '@/lib/api';
import type { LoginResponse } from '@/types';
import type { LoginInput, ForgotPasswordInput, ResetPasswordInput } from '@/validators/auth';

export const authService = {
  async searchHouses(query: string) {
    const { data } = await api.get<Array<{ houseNumber: string }>>(`/auth/houses?query=${encodeURIComponent(query)}`);
    return data;
  },
  async requestOtp(payload: { houseNumber: string }) {
    const { data } = await api.post<{ challengeId: string; destinationMasked: string; channel?: 'WHATSAPP'; expiresInSeconds: number; debugCode?: string }>('/auth/otp/request', payload);
    return data;
  },
  async verifyOtp(payload: { challengeId: string; code: string }) {
    const { data } = await api.post<LoginResponse>('/auth/otp/verify', payload);
    return data;
  },
  async login(payload: LoginInput) {
    const { data } = await api.post<LoginResponse>('/auth/login', payload);
    return data;
  },
  async logout() {
    await api.post('/auth/logout', {});
  },
  async forgotPassword(payload: ForgotPasswordInput) {
    const { data } = await api.post<{ success: boolean; resetToken?: string }>('/auth/forgot-password', payload);
    return data;
  },
  async validateResetToken(token: string) {
    const { data } = await api.get<{ valid: boolean }>(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
    return data;
  },
  async resetPassword(payload: ResetPasswordInput) {
    const { data } = await api.post<{ success: boolean }>('/auth/reset-password', payload);
    return data;
  },
};
