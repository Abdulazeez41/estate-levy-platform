import { api } from '@/lib/api';
import type { HouseholdDetail } from '@/types';

export const householdService = {
  async getOne(id: string) {
    const { data } = await api.get<HouseholdDetail>(`/households/${id}`);
    return data;
  },
  async updateWhatsApp(id: string, whatsappNumber: string) {
    const { data } = await api.patch<{ phone: string }>(`/households/${id}/whatsapp`, { whatsappNumber });
    return data;
  },
  async deleteWhatsApp(id: string) {
    const { data } = await api.delete<{ phone: null }>(`/households/${id}/whatsapp`);
    return data;
  },
};
