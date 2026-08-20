import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { admitApplication, getParentLearnerSummary } from "./admissionsService";
import { loadConfig } from "./config";
import { AppError, isAppError } from "./errors";
import { createInvoice, getStatement, handleMpesaCallback, initiateMpesaPayment } from "./financeService";
import { providerStatus, sendNotification } from "./integrations/notifications";
import { createSession, requireSession, switchSessionRole } from "./security";
import { getClassStream, getLearnersInClass } from "./schoolService";
import { store } from "./store";
import { markAttendance } from "./attendanceService";

const sessionIdFromRequest = (request: Request) => {
  const header = request.header("Authorization") ?? "";
  const [, token] = header.match(/^Bearer (.+)$/) ?? [];
  if (!token) {
    throw new AppError("Session is required", 401, "SESSION_REQUIRED");
  }
  return token;
};

const asyncRoute = (handler: (request: Request, response: Response) => Promise<void> | void) =>
  (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response)).catch(next);
  };

const dashboardFor = (sessionId: string) => {
  const context = requireSession(sessionId);
  const role = context.activeRole.name;
  const totals = {
    learners: store.learners.length,
    guardians: store.guardianProfiles.length,
    invoices: store.invoices.length,
    openBalance: store.invoices.reduce((sum, invoice) => sum + invoice.balance, 0),
    auditEvents: store.auditLogs.length,
  };

  return {
    role,
    user: { id: context.user.id, name: context.user.name, email: context.user.email, roles: context.roles.map((assignedRole) => assignedRole.name) },
    totals,
    integrations: {
      mpesa: loadConfig({ SESSION_SECRET: process.env.SESSION_SECRET ?? "dev-session-secret", ...process.env }).mpesa.configured,
      sms: providerStatus(process.env.SMS_PROVIDER, process.env.SMS_API_KEY),
      whatsapp: providerStatus(process.env.WHATSAPP_PROVIDER, process.env.WHATSAPP_ACCESS_TOKEN),
      email: providerStatus(process.env.EMAIL_PROVIDER, process.env.EMAIL_API_KEY),
    },
    parentLearners: context.user.guardianProfileId && context.permissions.has("learner:linked:read") ? getParentLearnerSummary(sessionId) : [],
    classes: store.classStreams.map((stream) => ({ ...stream, learners: getLearnersInClass(stream.id).length })),
    recentAudit: store.auditLogs.slice(-6).reverse(),
  };
};

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, service: "ShuleHub" });
  });

  app.post("/api/auth/login", asyncRoute(async (request, response) => {
    const session = await createSession(String(request.body.email ?? ""), String(request.body.password ?? ""), request.body.selectedRole ? String(request.body.selectedRole) : undefined);
    response.json(session);
  }));

  app.post("/api/auth/switch-role", asyncRoute((request, response) => {
    const sessionId = sessionIdFromRequest(request);
    response.json(switchSessionRole(sessionId, String(request.body.selectedRole ?? "")));
  }));

  app.get("/api/me", asyncRoute((request, response) => {
    const sessionId = sessionIdFromRequest(request);
    const context = requireSession(sessionId);
    response.json({ user: context.user, activeRole: context.activeRole.name, roles: context.roles.map((role) => role.name) });
  }));

  app.get("/api/dashboard", asyncRoute((request, response) => {
    response.json(dashboardFor(sessionIdFromRequest(request)));
  }));

  app.post("/api/admissions/admit", asyncRoute((request, response) => {
    const learner = admitApplication(sessionIdFromRequest(request), request.body);
    response.status(201).json(learner);
  }));

  app.post("/api/attendance", asyncRoute((request, response) => {
    response.status(201).json(markAttendance(sessionIdFromRequest(request), request.body));
  }));

  app.post("/api/finance/invoices", asyncRoute((request, response) => {
    response.status(201).json(createInvoice(sessionIdFromRequest(request), request.body));
  }));

  app.post("/api/finance/payments/mpesa", asyncRoute((request, response) => {
    response.status(201).json(initiateMpesaPayment(sessionIdFromRequest(request), request.body));
  }));

  app.get("/api/finance/statements/:learnerId", asyncRoute((request, response) => {
    response.json(getStatement(sessionIdFromRequest(request), request.params.learnerId));
  }));

  app.post("/api/mpesa/callback", asyncRoute((request, response) => {
    response.json(handleMpesaCallback(request.body));
  }));

  app.post("/api/notifications/test", asyncRoute((request, response) => {
    response.json(sendNotification(request.body, process.env.SMS_PROVIDER, process.env.SMS_API_KEY));
  }));

  app.get("/api/classes/:classStreamId", asyncRoute((request, response) => {
    response.json({ classStream: getClassStream(request.params.classStreamId), learners: getLearnersInClass(request.params.classStreamId) });
  }));

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (isAppError(error)) {
      response.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
  });

  return app;
};

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret-change-before-production";
  const port = Number(process.env.PORT ?? 4000);
  createApp().listen(port, () => {
    console.log(`School system API running on http://127.0.0.1:${port}`);
  });
}



