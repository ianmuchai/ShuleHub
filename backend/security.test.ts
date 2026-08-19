import { beforeEach, describe, expect, test } from "vitest";
import { createSession, requirePermission, revokeSession, switchSessionRole } from "./security";
import { resetStore, store } from "./store";

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


  test("active role selection is limited to assigned roles and scopes permissions", async () => {
    const teacher = await createSession("teacher@demo.school", "TeacherPass123!", "Teacher");
    expect(teacher.activeRole).toBe("Teacher");
    expect(() => requirePermission(teacher.sessionId, "finance:manage")).toThrow("Forbidden");

    switchSessionRole(teacher.sessionId, "Parent");
    expect(() => requirePermission(teacher.sessionId, "learner:linked:read")).not.toThrow();
    expect(() => requirePermission(teacher.sessionId, "attendance:mark")).toThrow("Forbidden");
  });

  test("rejects tampered role selection during login", async () => {
    await expect(createSession("parent@demo.school", "ParentPass123!", "Finance Officer")).rejects.toThrow("Role is not assigned to this user");
  });
  test("revoked sessions cannot authorize protected actions", async () => {
    const session = await createSession("admin@demo.school", "AdminPass123!");
    revokeSession(session.sessionId);
    expect(() => requirePermission(session.sessionId, "school:manage")).toThrow("Session is invalid");
  });
});

