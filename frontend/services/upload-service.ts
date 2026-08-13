import { api } from '@/lib/api';

export const uploadService = {
  async uploadMeetingAttachment(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/uploads/meeting-attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as { url: string; mimeType: string; size: number; fileName: string };
  },
};
