# Kenyan School Management System

Secure, mobile-first school management foundation for Kenyan schools. This Release 1 build includes authentication, roles, audit logging, admissions, learner and guardian linkage, attendance, finance, M-Pesa callback handling, notification provider boundaries, and role dashboards.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@demo.school` | `AdminPass123!` |
| Admissions | `admissions@demo.school` | `AdmissionsPass123!` |
| Finance | `finance@demo.school` | `FinancePass123!` |
| Teacher | `teacher@demo.school` | `TeacherPass123!` |
| Parent | `parent@demo.school` | `ParentPass123!` |

## Local Commands

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

The backend runs on `http://127.0.0.1:4000`. For frontend development, run `npm run dev:frontend` in another terminal and open `http://127.0.0.1:5173`.

## Production Integration Variables

Copy `.env.example` to `.env` and provide real values before production use:

- `DATABASE_URL`
- `SESSION_SECRET`
- `MPESA_ENVIRONMENT`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL`
- `SMS_PROVIDER`
- `SMS_API_KEY`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_ACCESS_TOKEN`
- `EMAIL_PROVIDER`
- `EMAIL_API_KEY`
- `FILE_STORAGE_PROVIDER`
- `FILE_STORAGE_BUCKET`

## Security Controls In Release 1

- Server-side session checks for protected APIs.
- Server-side role and permission checks.
- Guardian-to-learner isolation through guardian links.
- Password hashing with bcrypt.
- Session revocation.
- Audit records for authentication, admissions, attendance, invoices, and payment callbacks.
- Idempotent M-Pesa callback processing.
- Reconciliation exceptions for unmatched M-Pesa callbacks.
- Backend-only integration credentials.

## Current Storage

Release 1 uses an in-memory repository with a typed store boundary so workflows can be tested immediately. Production persistence is the next infrastructure step: replace the store implementation with PostgreSQL migrations and transactional repositories while preserving service interfaces.
