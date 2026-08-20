import { randomUUID } from "node:crypto";
import { store } from "./store";
import { AuditInput, AuditLog } from "./types";

export const appendAudit = (event: AuditInput): AuditLog => {
  const auditLog: AuditLog = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...event,
  };

  store.auditLogs.push(auditLog);
  return auditLog;
};
