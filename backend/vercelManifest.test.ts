import { describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredFunctions = [
  "api/auth/login.ts",
  "api/auth/switch-role.ts",
  "api/dashboard.ts",
  "api/health.ts",
  "api/me.ts",
];

describe("vercel api manifest", () => {
  test("login-critical endpoints have concrete Vercel function files", () => {
    for (const file of requiredFunctions) {
      expect(existsSync(join(root, file)), `${file} should exist`).toBe(true);
    }
  });
});