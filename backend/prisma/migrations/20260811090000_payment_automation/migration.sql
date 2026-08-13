-- Expand payment and notification lifecycle values.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DUE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_OVERDUE';

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PROCESSING', 'PENDING_REVIEW', 'CONFIRMED', 'REJECTED', 'OVERDUE', 'FAILED', 'REFUNDED');
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIALIZED', 'PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

ALTER TABLE "Levy" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE "Levy" ADD COLUMN "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN "invoiceId" TEXT;

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "levyId" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "residentId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentIntent" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "residentId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
  "authorizationUrl" TEXT,
  "accessCode" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "intentId" TEXT NOT NULL,
  "paymentId" TEXT,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIALIZED',
  "gatewayReference" TEXT,
  "responseCode" TEXT,
  "responseMessage" TEXT,
  "providerResponse" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "reference" TEXT,
  "signature" TEXT,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "payload" JSONB NOT NULL,
  "error" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- Backfill one invoice per existing household and levy, then connect existing payments.
INSERT INTO "Invoice" ("id", "levyId", "householdId", "residentId", "amount", "currency", "dueDate", "status", "paidAt", "updatedAt")
SELECT 'inv_' || md5(l."id" || h."id"), l."id", h."id", h."residentId", l."amount", l."currency", l."dueDate",
  CASE
    WHEN p."status" IN ('CONFIRMED', 'COMPLETED') THEN 'CONFIRMED'::"InvoiceStatus"
    WHEN p."status" IN ('MANUAL_TRANSFER_SUBMITTED', 'AWAITING_CONFIRMATION') THEN 'PENDING_REVIEW'::"InvoiceStatus"
    WHEN p."status" = 'REJECTED' THEN 'REJECTED'::"InvoiceStatus"
    WHEN l."dueDate" < CURRENT_TIMESTAMP THEN 'OVERDUE'::"InvoiceStatus"
    ELSE 'PENDING_PAYMENT'::"InvoiceStatus"
  END,
  CASE WHEN p."status" IN ('CONFIRMED', 'COMPLETED') THEN p."confirmedAt" ELSE NULL END,
  CURRENT_TIMESTAMP
FROM "Levy" l CROSS JOIN "Household" h
LEFT JOIN LATERAL (
  SELECT * FROM "Payment" candidate
  WHERE candidate."levyId" = l."id" AND candidate."residentId" = h."residentId"
  ORDER BY candidate."createdAt" DESC LIMIT 1
) p ON true;

UPDATE "Payment" p SET "invoiceId" = i."id"
FROM "Invoice" i WHERE i."levyId" = p."levyId" AND i."residentId" = p."residentId";

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE UNIQUE INDEX "Invoice_levyId_householdId_key" ON "Invoice"("levyId", "householdId");
CREATE INDEX "Invoice_residentId_status_idx" ON "Invoice"("residentId", "status");
CREATE INDEX "Invoice_dueDate_status_idx" ON "Invoice"("dueDate", "status");
CREATE UNIQUE INDEX "PaymentIntent_reference_key" ON "PaymentIntent"("reference");
CREATE INDEX "PaymentIntent_invoiceId_status_idx" ON "PaymentIntent"("invoiceId", "status");
CREATE INDEX "PaymentIntent_residentId_createdAt_idx" ON "PaymentIntent"("residentId", "createdAt");
CREATE INDEX "PaymentAttempt_intentId_createdAt_idx" ON "PaymentAttempt"("intentId", "createdAt");
CREATE INDEX "PaymentAttempt_paymentId_idx" ON "PaymentAttempt"("paymentId");
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");
CREATE INDEX "WebhookEvent_reference_createdAt_idx" ON "WebhookEvent"("reference", "createdAt");
CREATE INDEX "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_levyId_fkey" FOREIGN KEY ("levyId") REFERENCES "Levy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
