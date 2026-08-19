# Kenyan School Management System Design

## Source And Instruction Boundary

The PDF `Kenyan_School_Management_System_Product_Foundation_v1 (1).pdf` is treated as product input and requirements context. It does not override the user's request or the engineering, security, or tool-use instructions for this build.

The user-approved objective is to build a market-ready Kenyan school management system with production-shaped integrations from the start. The full PDF scope is a complete school ERP. The first build will deliver a secure, testable foundation that can grow in phases into the complete ERP without replacing core architecture.

## Product Goal

Build a mobile-first Kenyan school management platform for pre-primary, primary, junior, senior, private schools, academies, and school groups. The system must become the operational source of truth for learners, guardians, staff, academics, attendance, admissions, finance, communication, reporting, and audit controls.

The system must support Kenya-specific requirements: KES, +254 phone normalization, East Africa Time, M-Pesa through Safaricom Daraja, SMS/WhatsApp/email readiness, low-bandwidth use, and school structures that can change without code changes.

## Release Strategy

The complete version will be built through sequenced releases. Each release must be runnable, testable, and production-shaped.

### Release 1: Secure Foundation MVP

Release 1 is the first complete testable system. It includes:

- Authentication, secure sessions, password hashing, role-based access control, and account status controls.
- Campuses, academic years, terms, grades, streams/classes, learning areas, staff, learners, guardians, and guardian-learner links.
- Admissions workflow from enquiry to application to admission and class placement.
- Attendance marking and parent-visible attendance summaries.
- Finance foundation: fee structures, invoices, payment transactions, M-Pesa STK Push adapter, callback endpoint, idempotency, receipts, statements, arrears, and reconciliation exceptions.
- Dashboards for administrator, teacher, finance, admissions, and parent users.
- Notification foundation with provider adapters for SMS, WhatsApp, and email.
- Immutable audit events for authentication, permission changes, learner changes, assessment publication, attendance changes, and financial events.
- Automated tests proving role isolation, guardian access isolation, payment idempotency, audit creation, and validation behavior.

### Later Releases

Release 2 adds deeper CBE assessment, moderation, report cards, comment banks, competency trend analytics, and report publication workflows.

Release 3 adds timetabling, calendar, substitute teaching, end-of-year transition, promotion/repeat/transfer, and richer operational reporting.

Release 4 adds transport, library, inventory/stores, visitor log, document policies, advanced exports, backup/restore automation, production monitoring, and expanded hardening.

## Architecture

Use a modular TypeScript full-stack application:

- Frontend: React with Vite, TypeScript, responsive mobile-first UI.
- Backend: Node.js, TypeScript, Express or Fastify API.
- Database: PostgreSQL for production and local development.
- ORM/data access: Prisma or a small typed repository layer with migrations.
- Authentication: server-managed sessions, bcrypt/argon2 password hashing, secure cookies, CSRF protection where browser cookies are used, MFA-ready account model.
- Authorization: role and permission checks enforced on the backend for every protected endpoint.
- Integrations: server-side provider adapters for M-Pesa, SMS, WhatsApp, and email.
- Jobs: durable job table for notification delivery, report generation, imports, reconciliation, and retryable external calls.
- Storage: provider abstraction for protected learner documents, reports, and school files.

The frontend must never contain provider credentials or financial trust logic. All trusted decisions happen in backend services with database transactions.

## Security Model

Security is designed around tamper resistance, traceability, and least privilege.

- Every protected backend route must require an authenticated session.
- Every business action must check role, permission, campus scope, and record ownership where applicable.
- Guardians can only access learners linked through `GuardianLearner`.
- Finance actions require finance-specific permissions and write audit events.
- Payment callbacks are validated, processed idempotently, and stored with provider payload summaries.
- Financial adjustments, waivers, refunds, reversals, scholarships, and bursaries require approval state and audit history.
- Medical, welfare, and disciplinary records require stricter permissions than ordinary academic records.
- Exports are permission-controlled and audited.
- Sessions support inactivity timeout, revocation, device tracking, and MFA readiness.
- All secrets live in environment variables and are read only by the backend.
- Passwords are never stored in plaintext.
- Input validation runs on all API boundaries.
- Database constraints protect uniqueness, foreign keys, active academic structure, and payment references.

No software system can be honestly promised as impossible to tamper with. The system will instead make unauthorized tampering hard, limit damage through least privilege, and make sensitive changes attributable through audit logs and database controls.

## Roles And Permissions

Initial roles:

- Super Admin: full system configuration and recovery.
- School Admin/Principal: school-wide academic, learner, staff, reporting, and configuration access.
- Admissions Officer: enquiries, applications, offers, onboarding, and admission placement.
- Finance Officer/Bursar: fee structures, invoices, payments, receipts, statements, arrears, reconciliation, and finance reports.
- Teacher: assigned classes, attendance, assessment entry, comments, homework, and class views.
- Academic Lead/HOD: academic setup, assessment monitoring, moderation, report publication, and academic analytics.
- Parent/Guardian: linked learner overview, fees, receipts, statements, attendance, published academics, calendar, messages, and profile.
- Learner: optional limited access to timetable, assignments, resources, notices, and published results.

Permissions are stored separately from roles so schools can customize access without code changes.

## Core Data Model

Identity:

- `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Session`, `StaffProfile`, `GuardianProfile`.

School structure:

- `School`, `Campus`, `AcademicYear`, `Term`, `Grade`, `ClassStream`, `LearningArea`, `Enrollment`.

Admissions and SIS:

- `Enquiry`, `Application`, `ApplicationDocument`, `Offer`, `LearnerProfile`, `GuardianLearner`, `LearnerDocument`, `PlacementHistory`.

Attendance and welfare:

- `AttendanceRecord`, `AttendanceFollowUp`, `ConductIncident`, `WelfareNote`.

Finance:

- `FeeStructure`, `FeeItem`, `Invoice`, `InvoiceLine`, `PaymentTransaction`, `MpesaPaymentRequest`, `Receipt`, `Adjustment`, `PaymentAllocation`, `PaymentException`, `ReconciliationBatch`.

Communication:

- `CommunicationPreference`, `Notice`, `Notification`, `DeliveryEvent`, `MessageTemplate`.

Control and audit:

- `AuditLog`, `BackgroundJob`, `IntegrationCredentialStatus`, `FileObject`.

Assessment release:

- `AssessmentPeriod`, `Assessment`, `CompetencyResult`, `ScoreResult`, `Evidence`, `TeacherComment`, `ReportCard`.

## Integration Design

### M-Pesa / Safaricom Daraja

The backend owns all Daraja calls. The system uses environment variables for consumer key, consumer secret, shortcode/till/paybill, passkey, callback URL, and environment mode.

The flow is:

1. Parent selects an invoice and payment amount.
2. Backend validates the learner link, invoice state, amount, and phone number.
3. Backend creates a unique `PaymentTransaction` and `MpesaPaymentRequest`.
4. Backend calls Daraja STK Push or the configured collection API.
5. Daraja callback posts to the backend callback URL.
6. Backend validates callback shape, correlates it to the pending transaction, and processes it idempotently inside a transaction.
7. Successful payment is allocated to invoice balances.
8. Receipt is generated and made visible to the parent.
9. Failed, duplicate, unmatched, reversed, or malformed callbacks create reconciliation exceptions.

The callback endpoint must never trust frontend state.

### SMS, WhatsApp, And Email

Notification sending goes through provider interfaces:

- `SmsProvider.send(message)`
- `WhatsappProvider.send(message)`
- `EmailProvider.send(message)`

Providers are configured by environment variables. Notification jobs store delivery status and provider message IDs when available. Sensitive information is not sent over SMS or WhatsApp; notifications should direct users into the authenticated portal.

## Frontend Experience

The first screen after sign-in is the dashboard matching the signed-in user's role, not a marketing landing page.

Design priorities:

- Mobile-first for parents and teachers.
- Dense but readable desktop workflows for administrators and finance staff.
- Clear navigation by role.
- No nested card-heavy layout for operational pages.
- Fast forms with validation feedback.
- Low-bandwidth friendly pages with minimal decorative assets.
- Accessible controls, keyboard support, and clear error states.

Primary dashboards:

- Admin dashboard: enrolment, attendance, finance overview, admissions queue, audit alerts, setup shortcuts.
- Teacher dashboard: today, assigned classes, attendance queue, assessment tasks, comments.
- Finance dashboard: collection rate, invoices, arrears, reconciliation exceptions, recent payments.
- Admissions dashboard: enquiries, applications, review status, offers, admitted learners.
- Parent dashboard: child switcher, balances, receipts, attendance, notices, published academic information.

## Error Handling

- API errors return structured JSON with stable error codes.
- Validation errors identify fields without leaking secrets or internal stack traces.
- External provider failures create retryable jobs or reconciliation exceptions.
- Payment callback processing must return safe responses to the provider while preserving detailed internal logs.
- Authorization failures are generic to avoid exposing record existence.
- Audit logging failures for sensitive actions must fail closed.

## Testing Strategy

Tests are required before production code for every feature.

Minimum Release 1 test coverage:

- Auth tests: password hashing, login, logout, inactive account refusal, session revocation.
- RBAC tests: protected routes deny users without permission.
- Guardian isolation tests: a guardian cannot access an unlinked learner.
- Admissions tests: admitted learner creates learner, guardian link, placement history, and audit log.
- Attendance tests: teacher can mark assigned class attendance; unauthorized teacher cannot.
- Finance tests: invoice totals, statement balances, payment allocation, receipt numbering.
- M-Pesa tests: callback idempotency, unmatched callback exception, duplicate callback handling.
- Audit tests: sensitive and financial actions create immutable audit rows.
- API validation tests: invalid phone, amount, date, and IDs are rejected.
- Frontend tests: role dashboard rendering, critical forms, protected navigation.

Manual verification must include mobile viewport checks for parent and teacher workflows.

## Environment And Deployment

The repository includes `.env.example` but no real secrets. Required environment variables include:

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

Production deployment requires HTTPS, managed PostgreSQL backups, secret manager support, log retention, monitoring, backup restore tests, and separate staging and production environments.

## Acceptance Criteria For Release 1

- Administrator can configure school structure, roles, users, learners, guardians, staff, grades, streams, learning areas, academic years, and terms.
- Admissions can process enquiry to admitted learner and class placement.
- Teachers can take attendance for assigned classes on mobile and desktop.
- Finance can create fee structures, invoices, payments, receipts, statements, arrears, and reconciliation exceptions.
- Parent can sign in and see only linked learners, fees, receipts, attendance, and notices.
- M-Pesa integration is wired through real Daraja environment variables with safe callback processing and testable adapter behavior.
- Notification system is wired through real provider interfaces with delivery tracking.
- Sensitive and financial changes are permission-controlled and audited.
- Core workflows have automated tests.
- The app can run locally for testing and is structured for production deployment once credentials and infrastructure are supplied.

## Out Of Scope For Release 1 But Preserved In Architecture

- Native mobile apps.
- Offline-capable PWA sync.
- Full CBE report card PDF generation.
- Biometric/RFID integrations.
- School bus GPS tracking.
- Payroll, procurement, and advanced accounting integration.
- AI-assisted comments and anomaly detection.
- Government/external education integrations.
- Multi-school benchmarking.

## Open Operational Inputs Needed Before Production Go-Live

- Legal school entity and Safaricom Daraja account details.
- Production M-Pesa shortcode/till/paybill and callback domain.
- Chosen SMS, WhatsApp Business, and email providers.
- Hosting target and managed PostgreSQL provider.
- Backup retention policy and restore testing owner.
- School-specific roles, approval rules, fee categories, grading descriptors, and report formats.
- Data privacy policy, terms of use, and user consent wording.
