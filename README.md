# ShuleHub

Secure, mobile-first school management foundation for schools. This build includes authentication, active role selection, role-scoped dashboards, audit logging, admissions, learner and guardian linkage, attendance, finance, M-Pesa callback handling, notification provider boundaries, library/resource views, and Vercel-ready frontend/API routing.

## Temporary Testing Access

During system testing, choose a role on the sign-in screen and the app will prefill the matching test credentials. The backend still validates the selected role server-side and rejects any role that is not assigned to the user.

| Role Option | Email | Password |
| --- | --- | --- |
| Admin | `admin@demo.school` | `AdminPass123!` |
| Admissions | `admissions@demo.school` | `AdmissionsPass123!` |
| Bursar | `finance@demo.school` | `FinancePass123!` |
| Teacher | `teacher@demo.school` | `TeacherPass123!` |
| Parent | `parent@demo.school` | `ParentPass123!` |
| Student | `student@demo.school` | `StudentPass123!` |

Before launch, remove the temporary credential-prefill mapping in `src/App.tsx` and replace seeded users with production identity records.

## Local Commands

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

The backend runs on `http://127.0.0.1:4000`. For frontend development, run `npm run dev:frontend` in another terminal and open `http://127.0.0.1:5173`.

## Vercel Deployment Prep

This repository uses the stable Vite plus Vercel Functions deployment shape:

- `vercel.json` pins the project to the Vite preset with `dist` output.
- `server/index.ts` exposes the Express app used by the API functions.
- Concrete `api/**/*.ts` files map Vercel `/api/*` routes to the Express app.

Suggested Vercel project settings:

- Framework Preset: `Vite`
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Do not use the Vercel `Services` preset for this repository. Set production environment variables in Vercel before using real integrations.

## Production Integration Variables

Copy `.env.example` to `.env` locally and add matching values in Vercel Project Settings:

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

## Security Controls In This Build

- Server-side session checks for protected APIs.
- Server-side active-role and permission checks.
- Rejection of tampered role selections.
- Guardian-to-learner isolation through guardian links.
- Password hashing with bcrypt.
- Session revocation.
- Audit records for authentication, role switching, admissions, attendance, invoices, and payment callbacks.
- Idempotent M-Pesa callback processing.
- Reconciliation exceptions for unmatched M-Pesa callbacks.
- Backend-only integration credentials.

## Current Storage

This build uses an in-memory repository with a typed store boundary so workflows can be tested immediately. Production persistence is the next infrastructure step: replace the store implementation with PostgreSQL migrations and transactional repositories while preserving service interfaces.

