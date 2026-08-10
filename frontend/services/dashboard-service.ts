import { api } from '@/lib/api';
import type { ChairmanDashboardResponse, ResidentDashboardResponse } from '@/types';

export const dashboardService = {
  async getChairmanDashboard() {
    const { data } = await api.get<ChairmanDashboardResponse>('/dashboard/chairman');
    return data;
  },
  async getResidentDashboard(userId: string) {
    const { data } = await api.get<ResidentDashboardResponse>(`/dashboard/resident/${userId}`);
    return data;
  },
};
