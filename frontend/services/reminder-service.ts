import { api } from '@/lib/api';

export const reminderService = {
  async remindHousehold(householdId: string) {
    const { data } = await api.post(`/reminders/household/${householdId}`);
    return data;
  },
  async remindBulkOverdue() {
    const { data } = await api.post('/reminders/bulk-overdue');
    return data as { success: boolean; sent: number };
  },
};
