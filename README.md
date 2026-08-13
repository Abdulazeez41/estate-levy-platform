# Estate Levy Platform

Greenview Estate Levy Platform is a resident and chairman operations portal for automated levy collection, payment tracking, reminders, meeting notices, and verified receipts.

The system is built as a monorepo with:
- `frontend`: Next.js 15 app for residents and chairman workflows
- `backend`: NestJS API with Prisma, PostgreSQL, JWT auth, notifications, receipts, and payment processing

## What the platform does

- Residents and the chairman use one passwordless house-number login with a six-digit WhatsApp code
- Residents pay online through Paystack; manual transfers and receipt uploads are disabled
- The dashboard polls verified backend state every 10-15 seconds
- The chairman creates levy cycles that automatically generate one invoice per household
- The chairman can add, update, or remove each household's WhatsApp login number
- Payment confirmations generate receipts and notifications
- Meeting notices and reminders appear in the resident experience

## Current payment design

The payment flow is intentionally structured as:

1. Resident opens the payment form from the dashboard.
2. The backend creates a unique Paystack payment reference for the resident invoice.
3. The resident completes checkout using a method offered by Paystack.
4. The backend verifies the transaction reference, amount, and currency.
5. A signed Paystack webhook reconciles the payment idempotently.
6. Confirmed payments update the invoice and generate a verified receipt.

This design gives you:
- automation for the common case
- no manual payment review workload for the chairman
- an audit trail for gateway and contact-management events
- status updates that the resident can trust

## Test mode first

This project is wired for **Paystack test mode first**.

That means:
- use Paystack test keys in local development
- keep `PAYSTACK_MODE=test` in backend environment files
- keep `NEXT_PUBLIC_PAYMENT_MODE=test` in frontend environment files
- use the callback page at `/payment/callback`

When you are ready for production:
- replace the Paystack test keys with live keys
- set `PAYSTACK_MODE=live`
- set `NEXT_PUBLIC_PAYMENT_MODE=live`
- keep the same code paths and webhook logic

## Requirements

- Node.js 18 or newer
- npm 10 or newer
- Docker Desktop for PostgreSQL and Redis
- A PostgreSQL database
- A Redis instance

## Local setup

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Install dependencies

From the repository root:

```bash
npm install
```

### 3. Configure environment files

Copy the example files and fill in your local values:

- `frontend/.env.local`
- `backend/.env`

For the frontend, include:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_PAYMENT_MODE=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/estate_levy
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
```

For the backend, include:

```bash
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/estate_levy
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
APP_ORIGIN=http://localhost:3000
PAYSTACK_MODE=test
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_CALLBACK_URL=http://localhost:3000/payment/callback
PAYSTACK_WEBHOOK_SECRET=sk_test_...
REDIS_URL=redis://localhost:6379
REMINDER_SCHEDULER_ENABLED=true
```

Paystack test credentials must come from the Paystack Dashboard. Test public keys begin with `pk_test_`; test secret keys begin with `sk_test_`. Do not use JWT secrets or generated application secrets in these fields.

### 4. Prepare the database

```bash
cd backend
npx prisma migrate dev
npm run seed
```

### 5. Run both apps

From the repository root:

```bash
npm run dev
```

## Main URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`
- API docs: `http://localhost:4000/api/docs`
- Paystack callback: `http://localhost:3000/payment/callback`

## Seed household access

- Chairman house: `Block A, Flat 1`
- Resident houses: the remaining 58 houses, from `Block A, Flat 2` through `Block J, Flat 5`
- The seed creates exactly 59 selectable house identities: one chairman and 58 residents.
- In local development, the WhatsApp OTP appears on the verification screen unless `OTP_DELIVERY_IN_DEVELOPMENT=true`.
- Production WhatsApp delivery requires Meta Cloud API, Twilio, or a compatible webhook. Provider pricing and conversation rules still apply.

## Repository scripts

### Root

```bash
npm run dev
npm run build
npm run lint
npm run seed
```

### Backend

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run seed
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
```

## Implementation overview

### Frontend

- Resident dashboard with levy status, Paystack checkout, and verified payment history
- Chairman dashboard with collection summary and household WhatsApp contact management
- Chairman levy-cycle form that generates household invoices
- Paystack-only payment dialog
- Responsive glass-style UI with motion enhancements

### Backend

- JWT authentication
- household and levy dashboards
- Paystack initialization and verification
- signed, idempotent webhook reconciliation with retry processing
- scheduled due and overdue notifications
- receipt generation
- notification dispatch
- reminder services
- upload handling for meeting attachments

### Database

Core Prisma models include:
- `User`
- `Household`
- `Levy`
- `Invoice`
- `Payment`
- `PaymentIntent`
- `PaymentAttempt`
- `WebhookEvent`
- `PaymentReceipt`
- `ReceivingAccount`
- `Meeting`
- `MeetingAttachment`
- `Notification`
- `AuditLog`
- `RefreshSession`
- `PasswordResetToken`

## Payment status lifecycle

The platform uses these key statuses:

- `PENDING_PAYMENT`
- `PROCESSING`
- `CONFIRMED`
- `COMPLETED`
- `FAILED`
- `REFUNDED`
- `CANCELLED`

Typical interpretation:

- `PENDING_PAYMENT`: payment has not been completed yet
- `CONFIRMED` or `COMPLETED`: payment has been accepted

## Payment behavior in test mode

When running in test mode:

- residents are redirected through the Paystack test checkout path
- the backend verifies the returned transaction reference
- webhook verification is still validated
- the dashboard updates after verification
- receipt generation still runs so the full lifecycle is tested

This is useful for:
- local development
- demo environments
- QA verification
- regression testing before live rollout

## Notifications

The system prepares notifications for:

- payment confirmed
- payment failed
- payment due
- payment overdue
- meeting updates
- reminders
- password reset

Notifications are shown in-app and can use configured provider channels. Login verification itself is WhatsApp-only.

## API endpoints

### Authentication

- `GET /api/auth/houses?query=`
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Dashboards

- `GET /api/dashboard/chairman`
- `GET /api/dashboard/resident/:userId`

### Payments

- `POST /api/payments/paystack/initialize`
- `POST /api/payments/paystack/verify`
- `POST /api/payments/paystack/webhook`

### Household WhatsApp access

- `PATCH /api/households/:id/whatsapp` (chairman only; recent OTP required)
- `DELETE /api/households/:id/whatsapp` (chairman only; recent OTP required)

### Levies and invoices

- `GET /api/levies`
- `POST /api/levies`
- `POST /api/levies/:id/sync-invoices`

### Meetings

- `GET /api/meetings/upcoming`

### Households

- `GET /api/households`
- `GET /api/households/:id`

### Notifications

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

## Notes for production rollout

Before switching to live payment mode:

- replace all Paystack test credentials with live credentials
- update `PAYSTACK_MODE=live`
- update `NEXT_PUBLIC_PAYMENT_MODE=live`
- confirm the webhook endpoint is publicly reachable
- verify the callback URL is correct in Paystack
- confirm Redis and PostgreSQL are stable in production
- use a Render persistent disk or external object storage for generated verified receipts
- keep `REMINDER_SCHEDULER_ENABLED=true` on one backend instance
- confirm each occupied house has the correct WhatsApp login number
- run the full payment lifecycle test suite again

## Troubleshooting

### Login fails with a network error

- confirm the backend is running on `http://localhost:4000`
- confirm `NEXT_PUBLIC_API_URL` is set correctly
- confirm the frontend can reach the API through CORS

### Paystack checkout does not open

- confirm `PAYSTACK_MODE=test` or `live` is set
- confirm `PAYSTACK_SECRET_KEY` is present
- confirm `PAYSTACK_PUBLIC_KEY` is present
- confirm `PAYSTACK_CALLBACK_URL` is reachable

### Webhook verification fails

- confirm the Paystack webhook secret is correct
- confirm the raw body reaches the webhook handler
- confirm the signature header is being sent by the provider

### WhatsApp login code is not delivered

- confirm the household has a WhatsApp number saved by the chairman
- confirm `WHATSAPP_PROVIDER` and its provider credentials are configured
- keep `OTP_DELIVERY_IN_DEVELOPMENT=false` locally to show the test code on screen

## Development notes

- The frontend uses a glass-style visual language with responsive motion
- The resident dashboard is intentionally wide and full-page rather than narrow-centered
- Confirmed Paystack payments generate verified receipts and notifications
- Backend tests cover the payment lifecycle and notification state changes

## Suggested next step

If you are moving beyond test mode, the next step is to switch the Paystack credentials from test keys to live keys and perform a full end-to-end payment rehearsal in staging before opening the system to residents.
