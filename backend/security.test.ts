import { beforeEach, describe, expect, test } from "vitest";
import { createSession, requirePermission, revokeSession } from "./security";
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

  test("revoked sessions cannot authorize protected actions", async () => {
    const session = await createSession("admin@demo.school", "AdminPass123!");
    revokeSession(session.sessionId);
    expect(() => requirePermission(session.sessionId, "school:manage")).toThrow("Session is invalid");
  });
});
