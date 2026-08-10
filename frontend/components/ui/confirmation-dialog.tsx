'use client';

import { ReactNode } from 'react';
import { Modal } from './modal';

export function ConfirmationDialog({
  open,
  title,
  children,
  confirmLabel,
  confirmClassName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  confirmClassName?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-5">
        {children}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border border-line px-5 py-2.5 font-medium text-ink">Cancel</button>
          <button onClick={onConfirm} className={confirmClassName ?? 'rounded-full bg-green-deep px-5 py-2.5 font-medium text-white'}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}
