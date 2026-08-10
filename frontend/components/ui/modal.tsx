'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-line bg-panel p-4 shadow-panel sm:max-h-[calc(100dvh-2rem)] sm:rounded-[24px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-heading text-ink sm:text-2xl">{title}</h3>
          <button onClick={onClose} className="rounded-full border border-line p-2 text-ink-soft transition hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch] sm:mt-5">{children}</div>
      </div>
    </div>
  );
}
