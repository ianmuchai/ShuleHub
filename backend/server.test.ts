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

