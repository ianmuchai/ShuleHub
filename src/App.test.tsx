import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";

const baseDashboard = {
  user: { id: "user", name: "User", email: "user@school.test", roles: ["Super Admin"] },
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

const dashboard = (role: string, roles = [role]) => ({ ...baseDashboard, role, user: { ...baseDashboard.user, roles } });

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("login is production-facing and does not expose demo account choices", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "ShuleHub" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Teacher" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Parent" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Student" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Teacher" }));
    expect(screen.getByLabelText("Email")).toHaveValue("teacher@demo.school");
    expect(screen.getByLabelText("Password")).toHaveValue("TeacherPass123!");

    fireEvent.click(screen.getByRole("button", { name: "Student" }));
    expect(screen.getByLabelText("Email")).toHaveValue("student@demo.school");
    expect(screen.getByLabelText("Password")).toHaveValue("StudentPass123!");
    expect(screen.queryByText(/admin@demo.school/i)).toBeNull();
    expect(screen.queryByText(/demo account/i)).toBeNull();
    expect(screen.queryByText(/Kenyan School Management System/i)).toBeNull();
    expect(screen.queryByText(/PWA prototype/i)).toBeNull();
  });

  test("selected login role is sent to the secure API and remembered for the returning person", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: "session-1", user: { id: "u1", name: "Grace", email: "grace@school.test", roles: ["Teacher", "Parent"] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => dashboard("Teacher", ["Teacher", "Parent"]) });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Teacher" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "grace@school.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("heading", { name: "Teacher Workspace" });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ selectedRole: "Teacher" });
    expect(localStorage.getItem("shulehub.loginHistory")).toContain("grace@school.test");
    expect(localStorage.getItem("shulehub.loginHistory")).toContain("Teacher");
  });

  test("prefilled testing roles still open dashboards when the API function fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => "A server error has occurred FUNCTION_INVOCATION_FAILED",
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Parent" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("heading", { name: "Family Portal" });
    expect(screen.queryByText(/FUNCTION_INVOCATION_FAILED/i)).toBeNull();
    expect(localStorage.getItem("shulehub.loginHistory")).toContain("parent@demo.school");
  });
  test("remembered users can reuse or change their role before logging in", () => {
    localStorage.setItem("shulehub.loginHistory", JSON.stringify([{ email: "grace@school.test", name: "Grace", lastRole: "Parent", roles: ["Teacher", "Parent"], lastLoginAt: "2026-08-19T10:00:00.000Z" }]));

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Grace Parent/i }));
    expect(screen.getByLabelText("Email")).toHaveValue("grace@school.test");
    expect(screen.getByRole("button", { name: "Parent" })).toHaveClass("selected");

    fireEvent.click(screen.getByRole("button", { name: "Teacher" }));
    expect(screen.getByRole("button", { name: "Teacher" })).toHaveClass("selected");
  });

  test("multi-role users can switch the active workspace after login", () => {
    render(<App initialDashboard={dashboard("Teacher", ["Teacher", "Parent", "Finance Officer"])} />);
    expect(screen.getByRole("heading", { name: "Teacher Workspace" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Parent" }));
    expect(screen.getByRole("heading", { name: "Family Portal" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Bursar" }));
    expect(screen.getByRole("heading", { name: "Bursar Workbench" })).toBeTruthy();
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



