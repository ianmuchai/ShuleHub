import { describe, expect, test } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  test("requires session secret for secure sessions", () => {
    expect(() => loadConfig({})).toThrow("SESSION_SECRET is required");
  });

  test("marks M-Pesa as configured only when all required secrets exist", () => {
    const config = loadConfig({
      SESSION_SECRET: "dev-secret",
      MPESA_ENVIRONMENT: "production",
      MPESA_CONSUMER_KEY: "key",
      MPESA_CONSUMER_SECRET: "secret",
      MPESA_SHORTCODE: "123456",
      MPESA_PASSKEY: "passkey",
      MPESA_CALLBACK_URL: "https://school.example.com/api/mpesa/callback",
    });

    expect(config.mpesa.configured).toBe(true);
    expect(config.mpesa.environment).toBe("production");
  });
});
