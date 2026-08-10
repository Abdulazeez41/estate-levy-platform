import { api } from '@/lib/api';
import type { NotificationItem } from '@/types';

export const notificationService = {
  async list() {
    const { data } = await api.get<NotificationItem[]>('/notifications');
    return data;
  },
  async markRead(id: string) {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },
  async archive(id: string) {
    const { data } = await api.patch(`/notifications/${id}/archive`);
    return data;
  },
  async remove(id: string) {
    const { data } = await api.delete(`/notifications/${id}`);
    return data;
  },
};
