import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  test("student role can be selected during login", async () => {
    const app = createApp();
    const login = await request(app).post("/api/auth/login").send({
      email: "student@demo.school",
      password: "StudentPass123!",
      selectedRole: "Learner",
    });

    expect(login.status).toBe(200);
    expect(login.body.activeRole).toBe("Learner");
    const dashboard = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${login.body.sessionId}`);
    expect(dashboard.body.role).toBe("Learner");
  });

  test("teacher role dashboard loads even when the teacher is also a guardian", async () => {
    const app = createApp();
    const login = await request(app).post("/api/auth/login").send({
      email: "teacher@demo.school",
      password: "TeacherPass123!",
      selectedRole: "Teacher",
    });

    expect(login.status).toBe(200);
    const dashboard = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${login.body.sessionId}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.role).toBe("Teacher");
  });
  test("auth routes also work when a service router forwards without the api prefix", async () => {
    const app = createApp();
    const login = await request(app).post("/auth/login").send({
      email: "parent@demo.school",
      password: "ParentPass123!",
      selectedRole: "Parent",
    });

    expect(login.status).toBe(200);
    const dashboard = await request(app).get("/dashboard").set("Authorization", `Bearer ${login.body.sessionId}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.role).toBe("Parent");
  });
  test("session token survives a serverless cold start between login and dashboard", async () => {
    const app = createApp();
    const login = await request(app).post("/api/auth/login").send({
      email: "parent@demo.school",
      password: "ParentPass123!",
      selectedRole: "Parent",
    });

    expect(login.status).toBe(200);
    resetStore();
    const freshApp = createApp();
    const dashboard = await request(freshApp).get("/api/dashboard").set("Authorization", `Bearer ${login.body.sessionId}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.role).toBe("Parent");
  });
  test("serves the built frontend and API from one production app", async () => {
    const staticDir = mkdtempSync(join(tmpdir(), "shulehub-dist-"));
    writeFileSync(join(staticDir, "index.html"), "<html><body><div id=\"root\">ShuleHub shell</div></body></html>");

    try {
      const app = createApp({ staticDir });
      const page = await request(app).get("/");
      const api = await request(app).get("/api/health");
      const fallback = await request(app).get("/family/records");

      expect(page.status).toBe(200);
      expect(page.text).toContain("ShuleHub shell");
      expect(api.status).toBe(200);
      expect(api.body).toMatchObject({ ok: true, service: "ShuleHub" });
      expect(fallback.status).toBe(200);
      expect(fallback.text).toContain("ShuleHub shell");
    } finally {
      rmSync(staticDir, { recursive: true, force: true });
    }
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

