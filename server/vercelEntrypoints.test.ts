import request from "supertest";
import { describe, expect, test } from "vitest";
import loginHandler from "../api/auth/login";
import dashboardHandler from "../api/dashboard";

describe("vercel auth entrypoints", () => {
  test("login and dashboard work through function-local root URLs", async () => {
    const login = await request(loginHandler).post("/").send({
      email: "parent@demo.school",
      password: "ParentPass123!",
      selectedRole: "Parent",
    });

    expect(login.status).toBe(200);
    const dashboard = await request(dashboardHandler).get("/").set("Authorization", `Bearer ${login.body.sessionId}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.role).toBe("Parent");
  });
});