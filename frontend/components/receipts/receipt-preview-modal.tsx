'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

export function ReceiptPreviewModal({
  open,
  title,
  receiptUrl,
  subtitle,
  onClose,
}: {
  open: boolean;
  title: string;
  receiptUrl?: string | null;
  subtitle?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const previewType = useMemo(() => {
    if (!receiptUrl) return 'none';
    const url = receiptUrl.toLowerCase();
    if (url.endsWith('.pdf')) return 'pdf';
    if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp')) return 'image';
    return 'link';
  }, [receiptUrl]);

  const handleCopy = async () => {
    if (!receiptUrl) return;
    await navigator.clipboard.writeText(receiptUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        {subtitle ? <p className="text-sm text-ink-soft">{subtitle}</p> : null}

        {receiptUrl ? (
          <div className="overflow-hidden rounded-[24px] border border-line bg-paper shadow-[0_18px_50px_rgba(19,35,24,0.08)]">
            <div className="border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                {previewType === 'pdf' ? <FileText className="h-4 w-4 text-green-deep" /> : <ImageIcon className="h-4 w-4 text-green-deep" />}
                Receipt preview
              </div>
              <div className="mt-1 break-all text-xs text-ink-soft">{receiptUrl}</div>
            </div>
            <div className="bg-[#F7F6F2]">
              {previewType === 'image' ? (
                <img src={receiptUrl} alt={title} loading="lazy" className="max-h-[42vh] w-full object-contain sm:max-h-[520px]" />
              ) : previewType === 'pdf' ? (
                <iframe title={title} src={receiptUrl} className="h-[42vh] w-full border-0 sm:h-[520px]" />
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                  <div className="rounded-full bg-white p-4 text-green-deep shadow-sm">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div className="max-w-md text-sm text-ink-soft">
                    This receipt can be opened in a new tab or downloaded directly. The file is attached to this payment submission.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-line bg-gold-wash px-5 py-6 text-sm text-ink-soft">
            No receipt is attached to this submission yet.
          </div>
        )}

        <div className="grid gap-3 sm:flex sm:flex-wrap">
          {receiptUrl ? (
            <>
              <a href={receiptUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-deep px-5 py-3 font-semibold text-white transition hover:brightness-105 sm:w-auto">
                <ExternalLink className="h-4 w-4" />
                Open receipt
              </a>
              <a href={receiptUrl} download className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 font-semibold text-ink transition hover:bg-white/90 sm:w-auto">
                <Download className="h-4 w-4" />
                Download
              </a>
              <button type="button" onClick={handleCopy} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 font-semibold text-ink transition hover:bg-white/90 sm:w-auto">
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
