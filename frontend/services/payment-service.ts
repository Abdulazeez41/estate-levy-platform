import { api } from '@/lib/api';

export const paymentService = {
  async initializePaystack(payload: { residentId: string; levyId: string }) {
    const { data } = await api.post<{ reference: string; authorizationUrl: string; accessCode: string }>('/payments/paystack/initialize', payload);
    return data;
  },
  async verifyPaystack(reference: string) {
    const { data } = await api.post('/payments/paystack/verify', { reference });
    return data;
  },
};
