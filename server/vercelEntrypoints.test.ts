import request from "supertest";
import { describe, expect, test } from "vitest";
import apiHandler from "../api/index";

describe("vercel auth entrypoints", () => {
  test("single api function logs in and loads dashboard through rewritten paths", async () => {
    const login = await request(apiHandler).post("/?path=auth/login").send({
      email: "parent@demo.school",
      password: "ParentPass123!",
      selectedRole: "Parent",
    });

    expect(login.status).toBe(200);
    const dashboard = await request(apiHandler).get("/?path=dashboard").set("Authorization", `Bearer ${login.body.sessionId}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.role).toBe("Parent");
  });
});