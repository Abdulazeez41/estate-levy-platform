# Estate Levy Management Platform — Slice 1

This archive contains the **first implementation slice** of the Greenview Estate Levy Management Platform rebuilt from the supplied HTML prototype.

## Included in this slice

- npm workspace monorepo
- Next.js 15 + React 19 frontend foundation
- NestJS backend foundation with JWT auth
- Prisma schema for users, households, levies, payments, meetings, notifications, receipts, audits, refresh sessions, and receiving accounts
- Seed data that mirrors the prototype's estate, levy month, meeting, and household statuses
- Chairman dashboard UI faithful to the prototype's layout and visual language
- Resident dashboard UI faithful to the prototype's status card, meeting banner, and payment history
- Search + filter household ledger behavior matching the prototype
- Manual payment approval and rejection endpoints
- Reusable design tokens derived from the prototype

## Seed credentials

- Chairman: `chairman@greenview.test` / `Password123!`
- Resident: `adewale@greenview.test` / `Password123!`

## Quick start

### 1) Start infrastructure

```bash
docker compose up -d
```

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment

Copy root `.env.example` values into:
- `frontend/.env.local`
- `backend/.env`

### 4) Prepare database

```bash
cd backend
npx prisma migrate dev --name init
npm run seed
```

### 5) Run apps

```bash
cd ..
npm run dev
```

- Frontend: http://localhost:3000
- Backend Swagger: http://localhost:4000/api/docs

## Implemented routes in this slice

### Frontend
- `/login`
- `/chairman/dashboard`
- `/resident/dashboard`
- `/unauthorized`

### Backend
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/dashboard/chairman`
- `GET /api/dashboard/resident/:userId`
- `GET /api/households`
- `GET /api/meetings/upcoming`
- `POST /api/payments/manual-submissions`
- `PATCH /api/payments/:id/approve`
- `PATCH /api/payments/:id/reject`

## Planned next slice

- receipt upload pipeline
- proper modal/dialog workflow replacing browser prompts
- household details page
- notification center and user settings pages
- forgot/reset password flows
- Paystack initialization and webhook verification
- queues, workers, reminders, and delivery channels
# estate-levy-platform
