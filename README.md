# Estate Levy Platform

Greenview Estate Levy Platform is a resident and chairman operations portal for levy collection, payment tracking, reminders, meeting notices, and proof-of-payment review.

The system is built as a monorepo with:
- `frontend`: Next.js 15 app for residents and chairman workflows
- `backend`: NestJS API with Prisma, PostgreSQL, JWT auth, notifications, receipts, and payment processing

## What the platform does

- Residents sign in with their own account
- Residents can pay online through Paystack test mode or submit bank transfer proof with receipt upload
- The dashboard shows payment status in real time
- The chairman can maintain the official receiving account details
- The chairman can approve or reject manual submissions
- Payment confirmations generate receipts and notifications
- Meeting notices and reminders appear in the resident experience

## Current payment design

The payment flow is intentionally structured as:

1. Resident opens the payment form from the dashboard.
2. The form defaults to online payment first.
3. If the resident prefers bank transfer, they can switch to the manual transfer path.
4. Online payments are initialized through Paystack and verified on the backend.
5. Manual transfers are submitted with a receipt upload for chairman review.
6. Approved payments become confirmed and can generate a receipt.
7. Rejected payments remain visible with a rejection reason.

This design gives you:
- automation for the common case
- a fallback for residents who pay by transfer
- a clear audit trail for the chairman
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
PAYSTACK_WEBHOOK_SECRET=whsec_...
REDIS_URL=redis://localhost:6379
```

### 4. Prepare the database

```bash
cd backend
npx prisma migrate dev --name init
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

## Seed accounts

- Chairman: `chairman@greenview.test`
- Resident: `adewale@greenview.test`
- Password for both: `Password123!`

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

- Resident dashboard with levy status, payment history, receipt previews, and current submission details
- Chairman dashboard with collection summary, payment review queue, and receiving account settings
- Payment dialog for:
  - Paystack online checkout
  - manual bank transfer submission
  - receipt upload
- Receipt preview modal for image and PDF receipts
- Responsive glass-style UI with motion enhancements

### Backend

- JWT authentication
- household and levy dashboards
- payment initialization, verification, and manual submission handling
- chairman approval and rejection flows
- receipt generation
- notification dispatch
- reminder services
- upload handling for receipts and meeting attachments

### Database

Core Prisma models include:
- `User`
- `Household`
- `Levy`
- `Payment`
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
- `MANUAL_TRANSFER_SUBMITTED`
- `AWAITING_CONFIRMATION`
- `CONFIRMED`
- `COMPLETED`
- `REJECTED`
- `FAILED`
- `CANCELLED`

Typical interpretation:

- `PENDING_PAYMENT`: payment has not been completed yet
- `MANUAL_TRANSFER_SUBMITTED`: resident uploaded transfer proof
- `AWAITING_CONFIRMATION`: payment is waiting for review or verification
- `CONFIRMED` or `COMPLETED`: payment has been accepted
- `REJECTED`: payment proof or transfer was rejected

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

- payment submitted
- payment confirmed
- payment rejected
- meeting updates
- reminders
- password reset

Notifications are shown in-app and can be extended to email, SMS, or WhatsApp based on environment configuration.

## API endpoints

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Dashboards

- `GET /api/dashboard/chairman`
- `GET /api/dashboard/resident/:userId`

### Payments

- `GET /api/payments/receiving-account`
- `GET /api/payments/receiving-accounts`
- `PATCH /api/payments/receiving-account`
- `POST /api/payments/manual-submissions`
- `POST /api/payments/paystack/initialize`
- `POST /api/payments/paystack/verify`
- `POST /api/payments/paystack/webhook`
- `PATCH /api/payments/:id/approve`
- `PATCH /api/payments/:id/reject`

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
- confirm chairman receiving account details are correct
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

### Manual transfer cannot be submitted

- confirm the chairman has created an active receiving account
- confirm the resident is submitting for their own household
- confirm the receipt file is under the maximum upload size

## Development notes

- The frontend uses a glass-style visual language with responsive motion
- The resident dashboard is intentionally wide and full-page rather than narrow-centered
- Receipt previews are reusable across resident and chairman screens
- Payment approvals generate receipts and notifications
- Backend tests cover the payment lifecycle and notification state changes
