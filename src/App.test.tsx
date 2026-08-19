import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("App", () => {
  test("renders the ShuleHub product name without generic or irrelevant product text", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "ShuleHub" })).toBeTruthy();
    expect(screen.queryByText(/Kenyan School Management System/i)).toBeNull();
    expect(screen.queryByText(/PWA prototype for opioid rehabilitation/i)).toBeNull();
  });

  test("demo account buttons select role credentials", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Finance finance@demo.school/i }));
    expect(screen.getByLabelText("Email")).toHaveValue("finance@demo.school");
  });

  test("admin dashboard has admin-only system controls and actionable workspace buttons", () => {
    const adminDashboard = {
      role: "Super Admin",
      user: { id: "user-admin", name: "Amina Principal", email: "admin@demo.school" },
      totals: { learners: 2, guardians: 2, invoices: 3, openBalance: 12000, auditEvents: 5 },
      integrations: {},
      parentLearners: [],
      classes: [{ id: "stream-grade-4-east", gradeName: "Grade 4", streamName: "East", learners: 31 }],
      recentAudit: [{ id: "audit-1", action: "finance.invoice.create", summary: "Created invoice INV-000001", createdAt: "2026-08-19" }],
    };

    render(<App initialDashboard={adminDashboard} />);
    expect(screen.getByText("System Controls")).toBeTruthy();
    expect(screen.getByText("Role and permission matrix")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Review audit/i }));
    expect(screen.getByRole("heading", { name: "Audit Trail" })).toBeTruthy();
  });

  test("parent dashboard shows learner library books and learning resources without admin controls", () => {
    const parentDashboard = {
      role: "Parent",
      user: { id: "user-parent", name: "Esther Guardian", email: "parent@demo.school" },
      totals: { learners: 1, guardians: 1, invoices: 1, openBalance: 5000, auditEvents: 2 },
      integrations: {},
      parentLearners: [{
        learner: { id: "learner-001", firstName: "Nia", lastName: "Wanjiku", admissionNumber: "ADM-2026-000" },
        classStream: { gradeName: "Grade 4", streamName: "East" },
        attendanceRate: 94,
        balance: 5000,
      }],
      classes: [],
      recentAudit: [],
    };

    render(<App initialDashboard={parentDashboard} />);
    expect(screen.getByText("Library Books")).toBeTruthy();
    expect(screen.getByText("The River and the Source")).toBeTruthy();
    expect(screen.getByText("Learning Resources")).toBeTruthy();
    expect(screen.getByText("Grade 4 Mathematics Practice Pack")).toBeTruthy();
    expect(screen.queryByText("System Controls")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Open resources/i }));
    expect(screen.getByRole("heading", { name: "Learning Resources" })).toBeTruthy();
  });
});
