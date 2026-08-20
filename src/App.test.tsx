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
    expect(screen.getAllByText("User Access Control").length).toBeGreaterThan(0);
    expect(screen.getByText("Integration Health"));
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
    expect(screen.getByRole("heading", { level: 1, name: "Student Portal" })).toBeTruthy();
    expect(screen.getByText("Assignments"));

    rerender(<App initialDashboard={dashboard("Admissions Officer")} />);
    expect(screen.getByRole("heading", { name: "Admissions Desk" })).toBeTruthy();
    expect(screen.getAllByText("Application Pipeline").length).toBeGreaterThan(0);
  });
  test("learner role opens a dedicated student portal with clickable school tasks", () => {
    render(<App initialDashboard={dashboard("Learner")} />);

    expect(screen.getByRole("heading", { level: 1, name: "Student Portal" })).toBeTruthy();
    expect(screen.getByText("Nia Wanjiku")).toBeTruthy();
    expect(screen.getByText("Grade 4 East")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open today's mathematics assignment" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open attendance calendar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open borrowed book record" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open fee summary" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open today's mathematics assignment" }));
    expect(screen.getByRole("heading", { name: "Mathematics Assignment" })).toBeTruthy();
    expect(screen.getByLabelText("Evidence required")).toHaveValue("Grade 4 East assignment MAT-G4-0820, teacher David Class Teacher, due 23 Aug 2026, learner Nia Wanjiku");
  });

  test("student portal starts with a concrete learner task instead of a placeholder workflow", () => {
    render(<App initialDashboard={dashboard("Learner")} />);

    expect(screen.getByRole("heading", { name: "Mathematics Assignment" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Current workflow" })).toBeNull();
  });
  test("student portal is available only to relevant learner, guardian, teacher, and admin roles", () => {
    const { rerender } = render(<App initialDashboard={dashboard("Parent")} />);
    expect(screen.getByRole("button", { name: "Student Portal" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Student Portal" }));
    expect(screen.getByText("Guardian view")).toBeTruthy();

    rerender(<App initialDashboard={dashboard("Teacher")} />);
    expect(screen.getByRole("button", { name: "Student Portal" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Student Portal" }));
    expect(screen.getByText("Teacher view")).toBeTruthy();

    rerender(<App initialDashboard={dashboard("Super Admin")} />);
    expect(screen.getByRole("button", { name: "Student Portal" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Student Portal" }));
    expect(screen.getByText("Administrator view")).toBeTruthy();

    rerender(<App initialDashboard={dashboard("Finance Officer")} />);
    expect(screen.queryByRole("button", { name: "Student Portal" })).toBeNull();
  });
  test("signed-in users can return to the role login page", () => {
    render(<App initialDashboard={dashboard("Parent")} />);
    expect(screen.getByRole("heading", { name: "Family Portal" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("heading", { name: "ShuleHub" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Teacher" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Parent" })).toBeTruthy();
  });

  test("admin controls are explicit and stay hidden from family accounts", () => {
    const { rerender } = render(<App initialDashboard={dashboard("Super Admin")} />);
    expect(screen.getByRole("heading", { name: "Admin Command Center" })).toBeTruthy();
    expect(screen.getAllByText("User Access Control").length).toBeGreaterThan(0);
    expect(screen.getByText("Academic Year Setup")).toBeTruthy();
    expect(screen.getByText("Integration Health")).toBeTruthy();
    expect(screen.getByText("Audit Export")).toBeTruthy();

    rerender(<App initialDashboard={dashboard("Parent")} />);
    expect(screen.queryByText("Integration Health")).toBeNull();
    expect(screen.queryByText("Audit Export")).toBeNull();
  });

  test("workflow buttons open focused panels with role-specific data", () => {
    render(<App initialDashboard={dashboard("Parent")} />);

    fireEvent.click(screen.getByRole("button", { name: "Fee Statement" }));
    expect(screen.getByRole("heading", { name: "Fee Statement & Payments" })).toBeTruthy();
    expect(screen.getByText("Current balance")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Library Loans" }));
    expect(screen.getByRole("heading", { name: "Borrowed Books" })).toBeTruthy();
    expect(screen.getByText("LIB-ENG-042")).toBeTruthy();
  });

  test("table row buttons open a clear workflow detail panel", () => {
    render(<App initialDashboard={dashboard("Teacher")} />);

    fireEvent.click(screen.getByRole("button", { name: /Daily register/i }));

    expect(screen.getByRole("heading", { name: "Daily register" })).toBeTruthy();
    expect(screen.getByText(/Marked present, absent, late, and follow-up notes/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open attendance register" })).toBeTruthy();
  });
  test("remembered people are presented as active return options", () => {
    localStorage.setItem("shulehub.loginHistory", JSON.stringify([{ email: "grace@school.test", name: "Grace", lastRole: "Parent", roles: ["Teacher", "Parent"], lastLoginAt: "2026-08-19T10:00:00.000Z" }]));

    render(<App />);

    const remembered = screen.getByRole("button", { name: /Grace Parent/i });
    expect(remembered).toBeEnabled();
    expect(remembered).toHaveClass("returning-user-card");
  });
  test("dashboard actions open tabbed task pages that can be completed", () => {
    render(<App initialDashboard={dashboard("Parent")} />);

    fireEvent.click(screen.getByRole("button", { name: "Fee Statement" }));
    expect(screen.getByRole("tab", { name: "Review" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Complete" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Confirm" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Complete" }));
    expect(screen.getByText("Payment method")).toBeTruthy();
    expect(screen.getByText("Amount to process")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Post verified payment allocation" }));
    expect(screen.getByText("Payment allocation ready for bursar approval")).toBeTruthy();
  });

  test("admin workflow pages expose a complete controlled access process", () => {
    render(<App initialDashboard={dashboard("Super Admin")} />);

    fireEvent.click(screen.getByRole("button", { name: "Manage Users" }));
    expect(screen.getByRole("heading", { name: "User Access Control" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verify identity" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Assign role scope" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Complete" }));
    expect(screen.getByText("Account action")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit scoped access approval" }));
    expect(screen.getByText("Access change ready for checker approval")).toBeTruthy();
  });
  test("staff role assignments use staff access evidence instead of learner resource steps", () => {
    render(<App initialDashboard={dashboard("Super Admin")} />);

    fireEvent.click(screen.getByRole("button", { name: "Staff Role Assignments" }));

    expect(screen.getByRole("heading", { name: "Staff Role Assignments" })).toBeTruthy();
    expect(screen.getByText("Review staff appointment records, role assignment request, approval scope, and maker-checker audit controls.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verify staff identity" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open learner context" })).toBeNull();
    expect(screen.getByText("HR Manager")).toBeTruthy();
    expect(screen.getAllByText("Restricted").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Verify staff identity" }));
    expect(screen.getByLabelText("Evidence required")).toHaveValue("Staff payroll number PAY-0142, national ID ending 4482, school email admin@demo.school, and signed HR appointment letter HR-2026-014");
  });  test("workflow review steps are clickable task prompts with relevant step pages", () => {
    render(<App initialDashboard={dashboard("Super Admin")} />);

    fireEvent.click(screen.getByRole("button", { name: "Manage Users" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify identity" }));

    expect(screen.getByRole("heading", { name: "Verify identity" })).toBeTruthy();
    expect(screen.getByText("Confirm the exact person before account, role, or sensitive record changes continue.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save verified identity evidence" })).toBeTruthy();
  });
  test("audit export workflow uses audit-specific clickable steps and preparation fields", () => {
    render(<App initialDashboard={dashboard("Super Admin")} />);

    fireEvent.click(screen.getByRole("button", { name: "Audit Review" }));

    expect(screen.queryByRole("button", { name: "Verify identity" })).toBeNull();
    expect(screen.getByRole("button", { name: "Select audit period" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verify export authority" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Verify export authority" }));
    expect(screen.getByRole("heading", { name: "Verify export authority" })).toBeTruthy();
    expect(screen.getByText("Confirm the admin has explicit permission to export sensitive audit events.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Prepare audit export" }));
    expect(screen.getByRole("tab", { name: "Complete" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Export format")).toBeTruthy();
    expect(screen.getByText("Date range")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Generate signed audit export package" }));
    expect(screen.getByText("Export package ready for compliance approval")).toBeTruthy();
  });
  test("workflow evidence names exact school records and action outcomes", () => {
    render(<App initialDashboard={dashboard("Parent")} />);

    fireEvent.click(screen.getByRole("button", { name: "Fee Statement" }));
    fireEvent.click(screen.getByRole("button", { name: "Review balance movement" }));

    expect(screen.getByLabelText("Evidence required")).toHaveValue("Invoice INV-2026-041, receipt MPESA-QK82L19, discount approval DISC-004, and Nia Wanjiku ledger balance");
    expect(screen.getByRole("button", { name: "Attach invoice, receipt, and ledger review" })).toBeTruthy();
  });

  test("workflow step, tab, and completion clicks scroll changed panels into view", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callback(0); return 0; });
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });

    render(<App initialDashboard={dashboard("Super Admin")} />);

    fireEvent.click(screen.getByRole("button", { name: "Audit Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify export authority" }));
    fireEvent.click(screen.getByRole("tab", { name: "Complete" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate signed audit export package" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(scrollIntoView).toHaveBeenCalledTimes(4);
  });
  test("dashboard actions scroll the task workflow into view", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callback(0); return 0; });
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });

    render(<App initialDashboard={dashboard("Parent")} />);

    fireEvent.click(screen.getByRole("button", { name: "Fee Statement" }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
