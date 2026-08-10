'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Paperclip, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMeetings } from '@/hooks/use-meetings';
import { TopBar } from '@/components/common/top-bar';
import { Modal } from '@/components/ui/modal';
import { meetingService } from '@/services/meeting-service';
import { uploadService } from '@/services/upload-service';
import type { MeetingAttachment, MeetingRecord } from '@/types';

export default function ChairmanMeetingsPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useMeetings();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingRecord | null>(null);
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<MeetingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const sorted = useMemo(() => (data ?? []).slice().sort((a, b) => a.meetingDate.localeCompare(b.meetingDate)), [data]);

  const reset = () => {
    setEditing(null);
    setTitle('');
    setVenue('');
    setMeetingDate('');
    setDescription('');
    setAttachments([]);
    setOpen(false);
  };

  const save = async () => {
    const payload = { title, venue, meetingDate, description, attachments };
    if (editing) await meetingService.update(editing.id, payload);
    else await meetingService.create(payload);
    await queryClient.invalidateQueries({ queryKey: ['meetings'] });
    reset();
  };

  return (
    <main className="min-h-screen bg-paper pb-16">
      <TopBar title="Meeting management" subtitle="Chairman tools" userName={user?.fullName ?? 'Chairman'} userRole="Chairman" onLogout={logout} />
      <section className="mx-auto w-full max-w-screen-2xl px-5 py-6 md:px-8">
        <div className="flex items-center justify-between gap-4 rounded-panel border border-line bg-panel p-5 shadow-panel">
          <div>
            <h1 className="text-3xl font-heading text-ink">Meetings</h1>
            <p className="mt-2 text-sm text-ink-soft">Create, update, and remove estate meeting records with agenda attachments.</p>
          </div>
          <button onClick={() => setOpen(true)} className="rounded-full bg-gold px-5 py-3 font-semibold text-[#2A1C05]">New meeting</button>
        </div>
        <div className="mt-5 space-y-3">
          {sorted.map((meeting) => (
            <div key={meeting.id} className="rounded-panel border border-line bg-panel p-5 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-heading text-ink">{meeting.title}</h2>
                  <p className="mt-2 text-sm text-ink-soft">{new Date(meeting.meetingDate).toLocaleString()} · {meeting.venue}</p>
                  {meeting.description ? <p className="mt-3 text-sm text-ink-soft">{meeting.description}</p> : null}
                  {meeting.attachments?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {meeting.attachments.map((attachment, index) => (
                        <a key={`${meeting.id}-${index}`} href={attachment.fileUrl} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs text-ink" rel="noreferrer">
                          <Paperclip className="h-3.5 w-3.5" /> {attachment.fileName}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(meeting); setTitle(meeting.title); setVenue(meeting.venue); setMeetingDate(meeting.meetingDate.slice(0, 16)); setDescription(meeting.description ?? ''); setAttachments(meeting.attachments ?? []); setOpen(true); }} className="rounded-full border border-line px-4 py-2 text-sm">Edit</button>
                  <button onClick={async () => { await meetingService.remove(meeting.id); await queryClient.invalidateQueries({ queryKey: ['meetings'] }); }} className="rounded-full bg-rust px-4 py-2 text-sm text-white">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Modal open={open} title={editing ? 'Edit meeting' : 'Create meeting'} onClose={reset}>
        <div className="space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Meeting title" />
          <input value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Venue" />
          <input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full rounded-2xl border border-line bg-white px-4 py-3" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Description" />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white px-4 py-4 text-sm text-ink-soft">
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading attachment…' : 'Upload PDF, JPG or PNG agenda'}
            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setIsUploading(true);
              try {
                const uploaded = await uploadService.uploadMeetingAttachment(file);
                setAttachments((current) => [...current, { fileUrl: uploaded.url, fileName: uploaded.fileName, mimeType: uploaded.mimeType, size: uploaded.size }]);
              } finally {
                setIsUploading(false);
                event.target.value = '';
              }
            }} />
          </label>
          {attachments.length ? <div className="flex flex-wrap gap-2">{attachments.map((attachment, index) => <button key={`${attachment.fileUrl}-${index}`} onClick={() => setAttachments((current) => current.filter((item) => item.fileUrl !== attachment.fileUrl))} className="rounded-full border border-line bg-gold-wash px-3 py-2 text-xs text-ink">{attachment.fileName} ×</button>)}</div> : null}
          <div className="flex justify-end gap-3">
            <button onClick={reset} className="rounded-full border border-line px-5 py-3">Cancel</button>
            <button onClick={save} className="rounded-full bg-green-deep px-5 py-3 font-semibold text-white">Save meeting</button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
