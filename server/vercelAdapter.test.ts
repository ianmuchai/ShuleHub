import request from "supertest";
import { describe, expect, test } from "vitest";
import { createApp } from "./server";
import { vercelPathApp } from "./vercelAdapter";

describe("vercel api adapter", () => {
  test("login function rewrites function-local root requests to the Express login route", async () => {
    const app = vercelPathApp(createApp(), "/api/auth/login");
    const login = await request(app).post("/").send({
      email: "parent@demo.school",
      password: "ParentPass123!",
      selectedRole: "Parent",
    });

    expect(login.status).toBe(200);
    expect(login.body.activeRole).toBe("Parent");
  });
});