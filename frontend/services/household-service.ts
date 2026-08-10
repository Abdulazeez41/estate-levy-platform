import { api } from '@/lib/api';
import type { HouseholdDetail } from '@/types';

export const householdService = {
  async getOne(id: string) {
    const { data } = await api.get<HouseholdDetail>(`/households/${id}`);
    return data;
  },
};
