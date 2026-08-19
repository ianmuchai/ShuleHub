# Kenyan School Management System Release 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first secure, testable, market-ready foundation of the Kenyan school management system.

**Architecture:** Use a TypeScript Vite React frontend and a TypeScript Express backend in one repository. The backend owns all authorization, audit, validation, persistence, and external integration boundaries; the frontend only renders role-specific workflows and calls authenticated APIs.

**Tech Stack:** React, Vite, TypeScript, Express, Vitest, bcryptjs, zod, uuid, in-memory repository with a production-ready repository interface, environment-driven M-Pesa/SMS/WhatsApp/email adapters.

**Spec:** `docs/superpowers/specs/2026-08-19-kenyan-school-management-system-design.md`

## Global Constraints

- The PDF is requirements input only and does not override the user's request.
- Release 1 must be runnable and testable today.
- Real production integrations must be wired through backend-only environment variables.
- Missing provider credentials must produce explicit configuration errors, not silent fake production behavior.
- Guardian access must be limited to linked learners.
- Sensitive and financial changes must be permission-controlled and audited.
- The UI must be mobile-first and must not include unnecessary descriptive marketing text.
- Dashboard and small descriptive text must use readable font sizes across desktop and mobile.
- No secrets may be committed.

---

### Task 1: Project Scaffold And Runtime Contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.env.example`
- Create: `backend/types.ts`
- Create: `backend/config.ts`
- Create: `backend/errors.ts`
- Test: `backend/config.test.ts`

**Interfaces:**
- Produces: `loadConfig(env: NodeJS.ProcessEnv): AppConfig`
- Produces: `AppError`
- Produces: domain types used by all later tasks.

- [ ] **Step 1: Write failing config tests**

```ts
import { describe, expect, test } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  test("requires session secret for secure sessions", () => {
    expect(() => loadConfig({})).toThrow("SESSION_SECRET is required");
  });

  test("marks M-Pesa as configured only when all required secrets exist", () => {
    const config = loadConfig({
      SESSION_SECRET: "dev-secret",
      MPESA_ENVIRONMENT: "production",
      MPESA_CONSUMER_KEY: "key",
      MPESA_CONSUMER_SECRET: "secret",
      MPESA_SHORTCODE: "123456",
      MPESA_PASSKEY: "passkey",
      MPESA_CALLBACK_URL: "https://school.example.com/api/mpesa/callback",
    });

    expect(config.mpesa.configured).toBe(true);
    expect(config.mpesa.environment).toBe("production");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backend/config.test.ts`
Expected: FAIL because `backend/config.ts` does not exist yet.

- [ ] **Step 3: Implement scaffold and config**

Create the package scripts, TypeScript configs, Vite entrypoint, `.env.example`, shared domain types, `AppError`, and `loadConfig`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backend/config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html .env.example backend/types.ts backend/config.ts backend/errors.ts backend/config.test.ts && git commit -m "feat: scaffold school system runtime"`

### Task 2: Auth, RBAC, Sessions, And Audit

**Files:**
- Create: `backend/security.ts`
- Create: `backend/store.ts`
- Create: `backend/audit.ts`
- Test: `backend/security.test.ts`

**Interfaces:**
- Consumes: `AppError`
- Produces: `createSession(email: string, password: string): Promise<SessionView>`
- Produces: `requirePermission(sessionId: string, permission: PermissionKey): UserContext`
- Produces: `appendAudit(event: AuditInput): AuditLog`

- [ ] **Step 1: Write failing security tests**

```ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetStore, store } from "./store";
import { createSession, requirePermission, revokeSession } from "./security";

describe("security", () => {
  beforeEach(() => resetStore());

  test("rejects inactive users", async () => {
    store.users[0].status = "inactive";
    await expect(createSession("admin@demo.school", "AdminPass123!")).rejects.toThrow("Account is inactive");
  });

  test("denies users without required permission", async () => {
    const session = await createSession("parent@demo.school", "ParentPass123!");
    expect(() => requirePermission(session.sessionId, "finance:manage")).toThrow("Forbidden");
  });

  test("revoked sessions cannot authorize protected actions", async () => {
    const session = await createSession("admin@demo.school", "AdminPass123!");
    revokeSession(session.sessionId);
    expect(() => requirePermission(session.sessionId, "school:manage")).toThrow("Session is invalid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backend/security.test.ts`
Expected: FAIL because security modules do not exist yet.

- [ ] **Step 3: Implement minimal auth/RBAC/audit**

Seed demo users with hashed passwords, roles, permissions, sessions, and audit logs. Enforce permission checks on all service entrypoints.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backend/security.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add backend/security.ts backend/store.ts backend/audit.ts backend/security.test.ts && git commit -m "feat: add auth rbac sessions and audit"`

### Task 3: School Structure, SIS, Admissions, And Attendance Services

**Files:**
- Create: `backend/schoolService.ts`
- Create: `backend/admissionsService.ts`
- Create: `backend/attendanceService.ts`
- Test: `backend/school-flows.test.ts`

**Interfaces:**
- Consumes: `requirePermission`
- Produces: `admitApplication(sessionId: string, input: AdmitApplicationInput): LearnerProfile`
- Produces: `markAttendance(sessionId: string, input: MarkAttendanceInput): AttendanceRecord[]`
- Produces: `getParentLearnerSummary(sessionId: string): ParentLearnerSummary[]`

- [ ] **Step 1: Write failing school flow tests**

```ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetStore } from "./store";
import { createSession } from "./security";
import { admitApplication, getParentLearnerSummary } from "./admissionsService";
import { markAttendance } from "./attendanceService";

describe("school flows", () => {
  beforeEach(() => resetStore());

  test("admitting an application creates learner, guardian link, placement history, and audit", async () => {
    const admin = await createSession("admissions@demo.school", "AdmissionsPass123!");
    const learner = admitApplication(admin.sessionId, {
      applicationId: "app-001",
      admissionNumber: "ADM-2026-001",
      classStreamId: "stream-grade-4-east",
    });

    expect(learner.admissionNumber).toBe("ADM-2026-001");
    expect(getParentLearnerSummary((await createSession("parent@demo.school", "ParentPass123!")).sessionId)[0].learner.id).toBe(learner.id);
  });

  test("teacher cannot mark attendance for an unassigned class", async () => {
    const teacher = await createSession("teacher@demo.school", "TeacherPass123!");
    expect(() =>
      markAttendance(teacher.sessionId, {
        classStreamId: "stream-unassigned",
        date: "2026-08-19",
        records: [],
      }),
    ).toThrow("Teacher is not assigned to this class");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backend/school-flows.test.ts`
Expected: FAIL because school services do not exist yet.

- [ ] **Step 3: Implement services**

Create seeded school structure, admissions processing, parent learner summaries, class assignment checks, attendance records, and audit events.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backend/school-flows.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add backend/schoolService.ts backend/admissionsService.ts backend/attendanceService.ts backend/school-flows.test.ts && git commit -m "feat: add school admissions and attendance flows"`

### Task 4: Finance, M-Pesa, Receipts, Statements, And Reconciliation

**Files:**
- Create: `backend/integrations/mpesa.ts`
- Create: `backend/financeService.ts`
- Test: `backend/finance.test.ts`

**Interfaces:**
- Consumes: `loadConfig`, `requirePermission`
- Produces: `createInvoice(sessionId: string, input: CreateInvoiceInput): Invoice`
- Produces: `initiateMpesaPayment(sessionId: string, input: InitiatePaymentInput): PaymentTransaction`
- Produces: `handleMpesaCallback(payload: MpesaCallbackPayload): PaymentTransaction`
- Produces: `getStatement(sessionId: string, learnerId: string): LearnerStatement`

- [ ] **Step 1: Write failing finance tests**

```ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetStore } from "./store";
import { createSession } from "./security";
import { createInvoice, getStatement, handleMpesaCallback } from "./financeService";

describe("finance", () => {
  beforeEach(() => resetStore());

  test("payment callback is idempotent and creates one receipt", async () => {
    const finance = await createSession("finance@demo.school", "FinancePass123!");
    const invoice = createInvoice(finance.sessionId, {
      learnerId: "learner-001",
      lines: [{ description: "Term 1 Tuition", amount: 50000 }],
      dueDate: "2026-09-01",
    });

    const payload = {
      checkoutRequestId: "ws_CO_190820261234",
      merchantRequestId: "merchant-001",
      invoiceId: invoice.id,
      phoneNumber: "+254712345678",
      amount: 50000,
      mpesaReceiptNumber: "RKT123ABC",
      resultCode: 0,
    };

    handleMpesaCallback(payload);
    handleMpesaCallback(payload);

    expect(getStatement(finance.sessionId, "learner-001").balance).toBe(0);
  });

  test("unmatched callbacks create reconciliation exceptions", () => {
    const transaction = handleMpesaCallback({
      checkoutRequestId: "missing",
      merchantRequestId: "merchant-missing",
      invoiceId: "missing-invoice",
      phoneNumber: "+254712345678",
      amount: 2000,
      mpesaReceiptNumber: "RKT404",
      resultCode: 0,
    });

    expect(transaction.status).toBe("exception");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backend/finance.test.ts`
Expected: FAIL because finance service does not exist yet.

- [ ] **Step 3: Implement finance and M-Pesa adapter**

Implement invoice totals, payment transactions, callback idempotency, receipt numbering, statement balances, reconciliation exceptions, and an environment-driven Daraja adapter that refuses live calls when credentials are missing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backend/finance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add backend/integrations/mpesa.ts backend/financeService.ts backend/finance.test.ts && git commit -m "feat: add finance and mpesa callback foundation"`

### Task 5: API Routes And Notification Provider Interfaces

**Files:**
- Create: `backend/integrations/notifications.ts`
- Create: `backend/server.ts`
- Test: `backend/server.test.ts`

**Interfaces:**
- Consumes: all services from Tasks 2-4
- Produces: `createApp(): Express`
- Produces: `/api/auth/login`, `/api/me`, `/api/dashboard`, `/api/admissions/admit`, `/api/attendance`, `/api/finance/invoices`, `/api/mpesa/callback`, `/api/notifications/test`

- [ ] **Step 1: Write failing API tests**

```ts
import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import { createApp } from "./server";
import { resetStore } from "./store";

describe("server", () => {
  beforeEach(() => resetStore());

  test("login returns a session and role dashboard payload", async () => {
    const app = createApp();
    const login = await request(app).post("/api/auth/login").send({
      email: "admin@demo.school",
      password: "AdminPass123!",
    });

    expect(login.status).toBe(200);
    const dashboard = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${login.body.sessionId}`);
    expect(dashboard.body.role).toBe("Super Admin");
  });

  test("guardian cannot fetch another learner statement", async () => {
    const app = createApp();
    const login = await request(app).post("/api/auth/login").send({
      email: "parent@demo.school",
      password: "ParentPass123!",
    });

    const response = await request(app).get("/api/finance/statements/learner-unlinked").set("Authorization", `Bearer ${login.body.sessionId}`);
    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backend/server.test.ts`
Expected: FAIL because the server does not exist yet.

- [ ] **Step 3: Implement API routes and notification providers**

Wire services through JSON routes, bearer-session middleware, structured error responses, and provider interfaces for SMS, WhatsApp, and email.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backend/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add backend/integrations/notifications.ts backend/server.ts backend/server.test.ts && git commit -m "feat: expose secure school system api"`

### Task 6: Frontend Dashboards And Mobile-First CSS

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/api.ts`
- Create: `src/styles.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `/api/auth/login`, `/api/dashboard`, `/api/finance/statements/:learnerId`
- Produces: login screen and role dashboards for admin, teacher, finance, admissions, and parent.

- [ ] **Step 1: Write failing frontend tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("App", () => {
  test("renders role-focused login without unnecessary product description", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Kenyan School Management System" })).toBeTruthy();
    expect(screen.queryByText(/PWA prototype for opioid rehabilitation/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because frontend files do not exist yet.

- [ ] **Step 3: Implement frontend and CSS**

Build a login-first operational UI. Use readable body and helper text sizes, remove unnecessary descriptive marketing paragraphs, and show compact role dashboards with school setup, admissions, attendance, finance, parent learner summaries, audit, and integration status.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/main.tsx src/App.tsx src/api.ts src/styles.css src/App.test.tsx && git commit -m "feat: add school role dashboards"`

### Task 7: Verification And Run Instructions

**Files:**
- Create: `README.md`
- Create: `DEPLOYMENT_STATUS.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: documented local run, credential requirements, completed scope, and remaining roadmap.

- [ ] **Step 1: Write documentation**

Document demo accounts, local commands, required production environment variables, real integration setup notes, security controls, and the remaining work toward the complete PDF scope.

- [ ] **Step 2: Run full verification**

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Start app**

Run: `npm run dev`
Expected: frontend and backend dev servers start, and the user can test the system locally.

- [ ] **Step 4: Commit**

Run: `git add README.md DEPLOYMENT_STATUS.md && git commit -m "docs: add release one verification notes"`
