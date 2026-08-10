'use client';

export type PaymentMode = 'test' | 'live' | 'off';

export const paymentMode: PaymentMode = ((process.env.NEXT_PUBLIC_PAYMENT_MODE ?? 'test').toLowerCase() as PaymentMode) || 'test';

export function isTestPaymentMode() {
  return paymentMode === 'test';
}
