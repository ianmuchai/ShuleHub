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

  test("vercel config stays on the stable Vite plus Functions deployment shape", async () => {
    const config = await import("../vercel.json");
    expect(config.default).toMatchObject({
      framework: "vite",
      buildCommand: "npm run build",
      outputDirectory: "dist",
    });
    expect(config.default).not.toHaveProperty("services");
    expect(config.default).not.toHaveProperty("rewrites");
    expect(existsSync(join(root, "backend")), "backend folder should not trigger Vercel Services auto-detection").toBe(false);
  });
});