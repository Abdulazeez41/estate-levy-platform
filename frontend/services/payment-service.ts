import { api } from '@/lib/api';
import type { ReceivingAccount } from '@/types';

export const paymentService = {
  async approve(paymentId: string) {
    const { data } = await api.patch(`/payments/${paymentId}/approve`);
    return data;
  },
  async reject(paymentId: string, payload: { reason: string }) {
    const { data } = await api.patch(`/payments/${paymentId}/reject`, payload);
    return data;
  },
  async getReceivingAccounts() {
    const { data } = await api.get<ReceivingAccount[]>('/payments/receiving-accounts');
    return data;
  },
  async getReceivingAccount() {
    const { data } = await api.get<ReceivingAccount | null>('/payments/receiving-account');
    return data;
  },
  async upsertReceivingAccount(payload: { bankName: string; accountName: string; accountNumber: string; instructions?: string }) {
    const { data } = await api.patch<ReceivingAccount>('/payments/receiving-account', payload);
    return data;
  },
  async createManualSubmission(payload: {
    residentId: string;
    levyId: string;
    paymentMethod: string;
    amount: number;
    transferDate: string;
    reference: string;
    receiptUrl?: string;
    note?: string;
  }) {
    const { data } = await api.post('/payments/manual-submissions', payload);
    return data;
  },
  async initializePaystack(payload: { residentId: string; levyId: string }) {
    const { data } = await api.post<{ reference: string; authorizationUrl: string; accessCode: string }>('/payments/paystack/initialize', payload);
    return data;
  },
  async verifyPaystack(reference: string) {
    const { data } = await api.post('/payments/paystack/verify', { reference });
    return data;
  },
};
