import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "./App";

const baseDashboard = {
  user: { id: "user", name: "User", email: "user@school.test" },
  totals: { learners: 410, guardians: 720, invoices: 188, openBalance: 1265000, auditEvents: 49 },
  integrations: {},
  parentLearners: [{
    learner: { id: "learner-001", firstName: "Nia", lastName: "Wanjiku", admissionNumber: "ADM-2026-000" },
    classStream: { gradeName: "Grade 4", streamName: "East" },
    attendanceRate: 94,
    balance: 5000,
  }],
  classes: [{ id: "stream-grade-4-east", gradeName: "Grade 4", streamName: "East", learners: 31 }],
  recentAudit: [{ id: "audit-1", action: "finance.invoice.create", summary: "Created invoice INV-000001", createdAt: "2026-08-19" }],
};

const dashboard = (role: string) => ({ ...baseDashboard, role });

describe("App", () => {
  test("login is production-facing and does not expose demo account choices", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "ShuleHub" })).toBeTruthy();
    expect(screen.queryByText(/admin@demo.school/i)).toBeNull();
    expect(screen.queryByText(/demo account/i)).toBeNull();
    expect(screen.queryByText(/Kenyan School Management System/i)).toBeNull();
    expect(screen.queryByText(/PWA prototype/i)).toBeNull();
  });

  test("admin portal exposes system controls that are hidden from parents", () => {
    render(<App initialDashboard={dashboard("Super Admin")} />);
    expect(screen.getByRole("heading", { name: "Admin Command Center" })).toBeTruthy();
    expect(screen.getByText("Users & Roles"));
    expect(screen.getByText("Integration Vault"));
  });

  test("parent portal focuses on the child record, library loans, fees, and resources", () => {
    render(<App initialDashboard={dashboard("Parent")} />);
    expect(screen.getByRole("heading", { name: "Family Portal" })).toBeTruthy();
    expect(screen.getByText("Nia Wanjiku"));
    expect(screen.getByText("The River and the Source"));
    expect(screen.getByText("Grade 4 Mathematics Practice Pack"));
    expect(screen.queryByText("Integration Vault")).toBeNull();
  });

  test("bursar and teacher portals open different work areas from action buttons", () => {
    const { rerender } = render(<App initialDashboard={dashboard("Finance Officer")} />);
    expect(screen.getByRole("heading", { name: "Bursar Workbench" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /M-Pesa Exceptions/i }));
    expect(screen.getByRole("heading", { name: "Reconciliation Queue" })).toBeTruthy();

    rerender(<App initialDashboard={dashboard("Teacher")} />);
    expect(screen.getByRole("heading", { name: "Teacher Workspace" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Class Register/i }));
    expect(screen.getByRole("heading", { name: "Class Register" })).toBeTruthy();
  });

  test("student and admissions experiences are specific to their workflows", () => {
    const { rerender } = render(<App initialDashboard={dashboard("Learner")} />);
    expect(screen.getByRole("heading", { name: "Student Desk" })).toBeTruthy();
    expect(screen.getByText("Assignments"));

    rerender(<App initialDashboard={dashboard("Admissions Officer")} />);
    expect(screen.getByRole("heading", { name: "Admissions Desk" })).toBeTruthy();
    expect(screen.getByText("Application Pipeline"));
  });
});
