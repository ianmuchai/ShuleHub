import { describe, expect, test } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

const apiFunctions = (directory = join(root, "api")): string[] => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return apiFunctions(path);
    return entry.isFile() && entry.name.endsWith(".ts") ? [relative(root, path).replace(/\\/g, "/")] : [];
  }).sort();
};

describe("vercel api manifest", () => {
  test("hobby deployment uses one api function", () => {
    expect(existsSync(join(root, "api/index.ts")), "api/index.ts should exist").toBe(true);
    expect(apiFunctions()).toEqual(["api/index.ts"]);
  });

  test("vercel config stays on the stable Vite plus single Function deployment shape", async () => {
    const config = await import("../vercel.json");
    expect(config.default).toMatchObject({
      framework: "vite",
      buildCommand: "npm run build",
      outputDirectory: "dist",
      rewrites: [{ source: "/api/:path*", destination: "/api/index?path=:path*" }],
    });
    expect(config.default).not.toHaveProperty("services");
    expect(existsSync(join(root, "backend")), "backend folder should not trigger Vercel Services auto-detection").toBe(false);
  });
});