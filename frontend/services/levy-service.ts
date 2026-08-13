import { api } from '@/lib/api';

export const levyService = {
  async create(payload: { month: number; year: number; amount: number; dueDate: string; currency: string; reminderDaysBefore: number }) {
    const { data } = await api.post('/levies', payload);
    return data;
  },
  async list() {
    const { data } = await api.get('/levies');
    return data;
  },
};
