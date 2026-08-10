import { api } from '@/lib/api';
import type { MeetingAttachment, MeetingRecord } from '@/types';

export const meetingService = {
  async list() {
    const { data } = await api.get<MeetingRecord[]>('/meetings');
    return data;
  },
  async create(payload: { title: string; venue: string; meetingDate: string; description?: string; attachments?: MeetingAttachment[] }) {
    const { data } = await api.post<MeetingRecord>('/meetings', payload);
    return data;
  },
  async update(id: string, payload: Partial<{ title: string; venue: string; meetingDate: string; description?: string; attachments?: MeetingAttachment[] }>) {
    const { data } = await api.patch<MeetingRecord>(`/meetings/${id}`, payload);
    return data;
  },
  async remove(id: string) {
    const { data } = await api.delete(`/meetings/${id}`);
    return data;
  },
};
