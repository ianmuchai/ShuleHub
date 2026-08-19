import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { appendAudit } from "./audit";
import { store } from "./store";
import { PermissionKey, Role, SessionView, UserContext } from "./types";
import { AppError } from "./errors";

const SESSION_HOURS = 8;

const rolesForUser = (roleIds: string[]): Role[] => store.roles.filter((role) => roleIds.includes(role.id));

const contextForUser = (userId: string): UserContext => {
  const user = store.users.find((candidate) => candidate.id === userId);
  if (!user) {
    throw new AppError("Session is invalid", 401, "SESSION_INVALID");
  }

  const roles = rolesForUser(user.roleIds);
  return {
    user,
    roles,
    permissions: new Set(roles.flatMap((role) => role.permissions)),
  };
};

export const createSession = async (email: string, password: string): Promise<SessionView> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = store.users.find((candidate) => candidate.email === normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("Invalid email or password", 401, "INVALID_LOGIN");
  }

  if (user.status !== "active") {
    throw new AppError("Account is inactive", 403, "ACCOUNT_INACTIVE");
  }

  const session = {
    id: randomUUID(),
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString(),
  };
  store.sessions.push(session);
  appendAudit({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "Session",
    entityId: session.id,
    summary: "User signed in",
  });

  return {
    sessionId: session.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: rolesForUser(user.roleIds).map((role) => role.name),
    },
  };
};

export const revokeSession = (sessionId: string) => {
  const session = store.sessions.find((candidate) => candidate.id === sessionId);
  if (session) {
    session.revokedAt = new Date().toISOString();
    appendAudit({
      actorUserId: session.userId,
      action: "auth.logout",
      entityType: "Session",
      entityId: session.id,
      summary: "Session revoked",
    });
  }
};

export const requireSession = (sessionId: string): UserContext => {
  const session = store.sessions.find((candidate) => candidate.id === sessionId);
  if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
    throw new AppError("Session is invalid", 401, "SESSION_INVALID");
  }

  const context = contextForUser(session.userId);
  if (context.user.status !== "active") {
    throw new AppError("Account is inactive", 403, "ACCOUNT_INACTIVE");
  }
  return context;
};

export const requirePermission = (sessionId: string, permission: PermissionKey): UserContext => {
  const context = requireSession(sessionId);
  if (!context.permissions.has(permission)) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  return context;
};
