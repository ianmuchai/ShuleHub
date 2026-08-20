import { afterEach, describe, expect, test, vi } from "vitest";
import { login } from "./api";

describe("api client", () => {
  afterEach(() => vi.restoreAllMocks());

  test("reports non-json API failures without a JSON parse crash", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => "The page could not be found",
    }));

    await expect(login("parent@demo.school", "ParentPass123!", "Parent")).rejects.toThrow("API request failed (404): The page could not be found");
  });
});