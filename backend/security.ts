import bcrypt from "bcryptjs";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { appendAudit } from "./audit";
import { store } from "./store";
import { PermissionKey, Role, RoleName, Session, SessionView, UserContext } from "./types";
import { AppError } from "./errors";

const SESSION_HOURS = 8;
const TOKEN_VERSION = 1;
const DEV_SESSION_SECRET = "dev-session-secret-change-before-production";

type SessionTokenPayload = {
  v: typeof TOKEN_VERSION;
  sid: string;
  userId: string;
  activeRoleName: RoleName;
  expiresAt: string;
};

const sessionSecret = () => process.env.SESSION_SECRET || DEV_SESSION_SECRET;

const sign = (value: string) => createHmac("sha256", sessionSecret()).update(value).digest("base64url");

const timingSafeTextEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const encodeSessionToken = (session: Session) => {
  const payload: SessionTokenPayload = {
    v: TOKEN_VERSION,
    sid: session.id,
    userId: session.userId,
    activeRoleName: session.activeRoleName,
    expiresAt: session.expiresAt,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
};

const decodeSessionToken = (sessionId: string): Session | undefined => {
  const [body, signature, extra] = sessionId.split(".");
  if (!body || !signature || extra) return undefined;
  if (!timingSafeTextEqual(sign(body), signature)) return undefined;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionTokenPayload>;
    if (payload.v !== TOKEN_VERSION || !payload.sid || !payload.userId || !payload.activeRoleName || !payload.expiresAt) {
      return undefined;
    }
    return {
      id: payload.sid,
      userId: payload.userId,
      activeRoleName: payload.activeRoleName,
      createdAt: new Date(0).toISOString(),
      expiresAt: payload.expiresAt,
    };
  } catch {
    return undefined;
  }
};

const resolveSession = (sessionId: string): Session => {
  const stored = store.sessions.find((candidate) => candidate.id === sessionId || encodeSessionToken(candidate) === sessionId);
  const session = stored ?? decodeSessionToken(sessionId);
  if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
    throw new AppError("Session is invalid", 401, "SESSION_INVALID");
  }
  return session;
};

const rolesForUser = (roleIds: string[]): Role[] => roleIds.map((roleId) => store.roles.find((role) => role.id === roleId)).filter((role): role is Role => Boolean(role));

const resolveActiveRole = (roles: Role[], selectedRole?: string): Role => {
  if (!roles.length) {
    throw new AppError("User has no assigned roles", 403, "ROLE_REQUIRED");
  }

  if (!selectedRole) return roles[0];
  const activeRole = roles.find((role) => role.name === selectedRole);
  if (!activeRole) {
    throw new AppError("Role is not assigned to this user", 403, "ROLE_NOT_ASSIGNED");
  }
  return activeRole;
};

const contextForUser = (userId: string, activeRoleName?: RoleName): UserContext => {
  const user = store.users.find((candidate) => candidate.id === userId);
  if (!user) {
    throw new AppError("Session is invalid", 401, "SESSION_INVALID");
  }

  const roles = rolesForUser(user.roleIds);
  const activeRole = resolveActiveRole(roles, activeRoleName);
  return {
    user,
    roles,
    activeRole,
    permissions: new Set(activeRole.permissions),
  };
};

export const createSession = async (email: string, password: string, selectedRole?: string): Promise<SessionView> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = store.users.find((candidate) => candidate.email === normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("Invalid email or password", 401, "INVALID_LOGIN");
  }

  if (user.status !== "active") {
    throw new AppError("Account is inactive", 403, "ACCOUNT_INACTIVE");
  }

  const roles = rolesForUser(user.roleIds);
  const activeRole = resolveActiveRole(roles, selectedRole);
  const session = {
    id: randomUUID(),
    userId: user.id,
    activeRoleName: activeRole.name,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString(),
  };
  store.sessions.push(session);
  appendAudit({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "Session",
    entityId: session.id,
    summary: `User signed in as ${activeRole.name}`,
  });

  return {
    sessionId: encodeSessionToken(session),
    activeRole: activeRole.name,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: roles.map((role) => role.name),
    },
  };
};

export const switchSessionRole = (sessionId: string, selectedRole: string): SessionView => {
  const session = resolveSession(sessionId);
  const context = contextForUser(session.userId, session.activeRoleName);
  const activeRole = resolveActiveRole(context.roles, selectedRole);
  const nextSession: Session = { ...session, activeRoleName: activeRole.name };
  const storedSession = store.sessions.find((candidate) => candidate.id === session.id);
  if (storedSession) storedSession.activeRoleName = activeRole.name;

  appendAudit({
    actorUserId: session.userId,
    action: "auth.role.switch",
    entityType: "Session",
    entityId: session.id,
    summary: `User switched active role to ${activeRole.name}`,
  });

  return {
    sessionId: encodeSessionToken(nextSession),
    activeRole: activeRole.name,
    user: {
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
      roles: context.roles.map((role) => role.name),
    },
  };
};

export const revokeSession = (sessionId: string) => {
  const session = store.sessions.find((candidate) => candidate.id === sessionId || encodeSessionToken(candidate) === sessionId);
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
  const session = resolveSession(sessionId);
  const context = contextForUser(session.userId, session.activeRoleName);
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