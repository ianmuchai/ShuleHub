import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("App", () => {
  test("renders role-focused login without unnecessary product description", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Kenyan School Management System" })).toBeTruthy();
    expect(screen.queryByText(/PWA prototype for opioid rehabilitation/i)).toBeNull();
  });
});
