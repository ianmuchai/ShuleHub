import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  BookMarked,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LockKeyhole,
  LogOut,
  Mail,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Dashboard, getDashboard, login, switchRole } from "./api";
import "./styles.css";

type AppProps = { initialDashboard?: Dashboard };
type WorkspaceKey = "command" | "records" | "attendance" | "resources" | "library" | "billing" | "admissions" | "audit" | "settings" | "reconciliation" | "register";
type NavItem = { key: WorkspaceKey; label: string; Icon: LucideIcon };
type Action = { label: string; key: WorkspaceKey };
type WorkflowDetailItem = { title: string; status: string; owner: string; detail: string; next: string };
type LoginHistoryItem = { email: string; name: string; lastRole: string; roles: string[]; lastLoginAt: string };

const productName = "ShuleHub";
const loginHistoryKey = "shulehub.loginHistory";
const roleOptions = [
  { label: "Admin", value: "Super Admin", email: "admin@demo.school", password: "AdminPass123!" },
  { label: "Admissions", value: "Admissions Officer", email: "admissions@demo.school", password: "AdmissionsPass123!" },
  { label: "Bursar", value: "Finance Officer", email: "finance@demo.school", password: "FinancePass123!" },
  { label: "Teacher", value: "Teacher", email: "teacher@demo.school", password: "TeacherPass123!" },
  { label: "Parent", value: "Parent", email: "parent@demo.school", password: "ParentPass123!" },
  { label: "Student", value: "Learner", email: "student@demo.school", password: "StudentPass123!" },
];
const roleDisplay = (role: string) => role === "Finance Officer" ? "Bursar" : role === "Learner" ? "Student" : role === "Admissions Officer" ? "Admissions" : role === "Super Admin" ? "Admin" : role;

const loans = [
  { learnerId: "learner-001", title: "The River and the Source", barcode: "LIB-ENG-042", due: "26 Aug", status: "Due soon" },
  { learnerId: "learner-001", title: "Primary Science Atlas", barcode: "LIB-SCI-118", due: "02 Sep", status: "On loan" },
  { learnerId: "learner-002", title: "Kiswahili Fasaha", barcode: "LIB-KIS-031", due: "29 Aug", status: "On loan" },
];

const resources = [
  { title: "Grade 4 Mathematics Practice Pack", area: "Mathematics", audience: "Family, learner, teacher", owner: "HOD Mathematics" },
  { title: "CBC Environmental Activities Guide", area: "Environmental Activities", audience: "Teachers", owner: "Academic Lead" },
  { title: "Reading Fluency Home Sheet", area: "Literacy", audience: "Family and learner", owner: "Class Teacher" },
  { title: "Assessment Evidence Upload Checklist", area: "Assessment", audience: "Teachers", owner: "Deputy Academics" },
];

const admissionsRows = ["Application Pipeline", "Application review", "Interview scheduling", "Offer letter", "Admission number", "Guardian onboarding"];
const adminRows = ["User Access Control", "Staff Role Assignments", "Academic Year Setup", "Integration Health", "Audit Export", "Backup Readiness"];
const financeRows = ["Invoice runs", "Payment allocation", "Receipt register", "Arrears aging", "Statement exports", "Bank deposit review"];
const teacherRows = ["Daily register", "Assessment entry", "Homework issue", "Learner comments", "Resource publishing", "Welfare follow-up"];

const formatKes = (amount: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);
const roleTitle = (role: string) => role === "Finance Officer" ? "Bursar Workbench" : role === "Super Admin" || role === "School Admin" ? "Admin Command Center" : role === "Teacher" ? "Teacher Workspace" : role === "Parent" ? "Family Portal" : role === "Admissions Officer" ? "Admissions Desk" : "Student Desk";
const defaultWorkspace = (role: string): WorkspaceKey => role === "Finance Officer" ? "billing" : role === "Teacher" ? "register" : role === "Admissions Officer" ? "admissions" : role === "Parent" ? "records" : role === "Learner" ? "resources" : "settings";
const userNameForRole = (role: string) => role === "Super Admin" ? "Amina Principal" : role === "Admissions Officer" ? "Brian Registrar" : role === "Finance Officer" ? "Carol Bursar" : role === "Teacher" ? "David Class Teacher" : role === "Parent" ? "Esther Guardian" : "Nia Wanjiku";
const rolesForTestingUser = (role: string) => role === "Teacher" ? ["Teacher", "Parent", "Finance Officer"] : [role];
const parentLearnerSummary = [{
  learner: { id: "learner-001", firstName: "Nia", lastName: "Wanjiku", admissionNumber: "ADM-2026-000" },
  classStream: { gradeName: "Grade 4", streamName: "East" },
  attendanceRate: 100,
  balance: 0,
}];
const testingDashboard = (role: string, email: string): Dashboard => ({
  role,
  user: { id: `testing-${role.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: userNameForRole(role), email, roles: rolesForTestingUser(role) },
  totals: { learners: 1, guardians: 2, invoices: 0, openBalance: 0, auditEvents: 1 },
  integrations: { mpesa: false, sms: { configured: false }, whatsapp: { configured: false }, email: { configured: false } },
  parentLearners: role === "Parent" ? parentLearnerSummary : [],
  classes: [{ id: "stream-grade-4-east", gradeName: "Grade 4", streamName: "East", learners: 1 }],
  recentAudit: [{ id: "testing-login", action: "auth.login", summary: `User signed in as ${role}`, createdAt: new Date().toISOString() }],
});
const testingDashboardForCredentials = (email: string, password: string, role: string) => {
  const option = roleOptions.find((candidate) => candidate.email === email.trim().toLowerCase() && candidate.password === password && candidate.value === role);
  return option ? testingDashboard(option.value, option.email) : null;
};

const readLoginHistory = (): LoginHistoryItem[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(loginHistoryKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.email && item?.lastRole) : [];
  } catch {
    return [];
  }
};

const writeLoginHistory = (item: LoginHistoryItem) => {
  const withoutCurrent = readLoginHistory().filter((candidate) => candidate.email !== item.email);
  localStorage.setItem(loginHistoryKey, JSON.stringify([item, ...withoutCurrent].slice(0, 8)));
};

const navForRole = (role: string): NavItem[] => {
  const common: NavItem[] = [
    { key: "command", label: "Command", Icon: LayoutDashboard },
    { key: "records", label: "Records", Icon: UsersRound },
    { key: "resources", label: "Resources", Icon: BookMarked },
    { key: "library", label: "Library", Icon: Library },
  ];
  if (role === "Finance Officer") return [{ key: "billing", label: "Billing", Icon: Banknote }, { key: "reconciliation", label: "Reconciliation", Icon: ReceiptText }, ...common];
  if (role === "Teacher") return [{ key: "register", label: "Class Register", Icon: ClipboardCheck }, { key: "attendance", label: "Attendance", Icon: CalendarCheck }, ...common];
  if (role === "Admissions Officer") return [{ key: "admissions", label: "Admissions", Icon: FileText }, ...common];
  if (role === "Parent") return [{ key: "records", label: "My Children", Icon: GraduationCap }, { key: "billing", label: "Fees", Icon: Banknote }, { key: "library", label: "Library", Icon: Library }, { key: "resources", label: "Resources", Icon: BookMarked }];
  if (role === "Learner") return [{ key: "resources", label: "Study", Icon: BookMarked }, { key: "library", label: "Library", Icon: Library }, { key: "attendance", label: "Calendar", Icon: CalendarCheck }];
  return [{ key: "settings", label: "Admin", Icon: UserCog }, { key: "audit", label: "Audit", Icon: ShieldCheck }, { key: "billing", label: "Finance", Icon: Banknote }, ...common];
};

const actionsForRole = (role: string): Action[] => {
  if (role === "Finance Officer") return [{ label: "Invoice Runs", key: "billing" }, { label: "M-Pesa Exceptions", key: "reconciliation" }, { label: "Statement Exports", key: "billing" }];
  if (role === "Teacher") return [{ label: "Open Register", key: "register" }, { label: "Assessment Entry", key: "attendance" }, { label: "Publish Resource", key: "resources" }];
  if (role === "Admissions Officer") return [{ label: "Pipeline Review", key: "admissions" }, { label: "Offer Letters", key: "admissions" }, { label: "Guardian Records", key: "records" }];
  if (role === "Parent") return [{ label: "Child Profile", key: "records" }, { label: "Fee Statement", key: "billing" }, { label: "Library Loans", key: "library" }];
  if (role === "Learner") return [{ label: "Assignments", key: "resources" }, { label: "Borrowed Books", key: "library" }, { label: "Study Calendar", key: "attendance" }];
  return [{ label: "Manage Users", key: "settings" }, { label: "Secure Integrations", key: "settings" }, { label: "Audit Review", key: "audit" }];
};


const workflowForAction = (label: string) => {
  const map: Record<string, string> = {
    "Manage Users": "User Access Control",
    "Secure Integrations": "Integration Health",
    "Audit Review": "Audit Export",
    "Fee Statement": "Fee Statement",
    "Library Loans": "Library Loans",
    "Child Profile": "Child Profile",
    "Open Register": "Daily register",
    "Assessment Entry": "Assessment entry",
    "Publish Resource": "Resource publishing",
    "Invoice Runs": "Invoice runs",
    "M-Pesa Exceptions": "M-Pesa Exceptions",
    "Statement Exports": "Statement exports",
    "Pipeline Review": "Application Pipeline",
    "Offer Letters": "Offer letter",
    "Guardian Records": "Guardian onboarding"
  };
  return map[label] ?? label;
};
const workflowDetail = (title: string): WorkflowDetailItem => {
  const details: Record<string, WorkflowDetailItem> = {
    "Daily register": { title: "Daily register", status: "Today", owner: "Class teacher", detail: "Marked present, absent, late, and follow-up notes for the active class stream.", next: "Open attendance register" },
    "User Access Control": { title: "User Access Control", status: "Restricted", owner: "Super Admin", detail: "Create users, suspend access, reset credentials, and enforce role boundaries with audit trails.", next: "Open user control" },
    "Staff Role Assignments": { title: "Staff Role Assignments", status: "Restricted", owner: "HR Manager", detail: "Review staff appointment records, role assignment request, approval scope, and maker-checker audit controls.", next: "Open staff role assignment" },
    "Academic Year Setup": { title: "Academic Year Setup", status: "Ready", owner: "Deputy Academics", detail: "Configure terms, streams, grading windows, promotion rules, and report release dates.", next: "Edit school calendar" },
    "Integration Health": { title: "Integration Health", status: "Secure", owner: "ICT Admin", detail: "Monitor M-Pesa, SMS, email, backups, webhook signatures, and failed callbacks.", next: "Inspect integrations" },
    "Audit Export": { title: "Audit Export", status: "Controlled", owner: "Compliance", detail: "Export tamper-evident logs for finance, admissions, account access, and record edits.", next: "Prepare audit export" },
    "Fee Statement": { title: "Fee Statement", status: "Statement ready", owner: "Bursar", detail: "Review invoices, receipts, discounts, transport, meals, and balance movement for the selected child.", next: "Open statement" },
    "Library Loans": { title: "Library loan actions", status: "2 active", owner: "Library", detail: "Review current borrowed books, due dates, renewal status, and return follow-up.", next: "Open loan record" },
    "Borrowed Books": { title: "Borrowed Books", status: "2 active", owner: "Library", detail: "Review current borrowed books, due dates, renewal status, and return follow-up.", next: "Open loan record" },
    "Child Profile": { title: "Child Profile", status: "Linked", owner: "Class teacher", detail: "Open learner biodata, attendance, class placement, guardian links, fees, library, and shared resources.", next: "Open learner profile" },
    "M-Pesa Exceptions": { title: "M-Pesa Exceptions", status: "Needs review", owner: "Bursar", detail: "Inspect failed callbacks, duplicate receipts, reversal requests, and unmatched paybill references.", next: "Resolve exception" }
  };
  return details[title] ?? { title, status: "Ready", owner: "Assigned staff owner", detail: `Review ${title} records, confirm the required school evidence, and complete the ${title.toLowerCase()} task with an auditable note.`, next: `Open ${title} task` };
};

function Stat({ label, value, Icon }: { label: string; value: string | number; Icon: LucideIcon }) {
  return <article className="stat"><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>;
}

function DataTable({ title, rows, icon: Icon, onOpen, selected }: { title: string; rows: string[]; icon: LucideIcon; onOpen: (row: string) => void; selected?: string }) {
  return <section className="module"><header><Icon size={20} /><h3>{title}</h3></header>{rows.map((row, index) => <button className={selected === row ? "table-row selected" : "table-row"} type="button" key={row} onClick={() => onOpen(row)} aria-label={row}><span>{row}</span><small>{row.includes("Access") || row.includes("Audit") || row.includes("Integration") || row.includes("Role") ? "Restricted" : "Workspace"}</small><strong>{index % 2 === 0 ? "Ready" : "Review"}</strong></button>)}</section>;
}

type WorkflowStep = { title: string; detail: string; evidence: string; action: string };
type CompletionConfig = { primaryLabel: string; secondaryLabel: string; primaryValue: string; secondaryValue: string; buttonLabel: string; status: string };

const accessReviewSteps: WorkflowStep[] = [
  { title: "Verify identity", detail: "Confirm the exact person before account, role, or sensitive record changes continue.", evidence: "Staff payroll number PAY-0142, national ID ending 4482, school email admin@demo.school, and signed HR appointment letter HR-2026-014", action: "Save verified identity evidence" },
  { title: "Review supporting records", detail: "Check the source documents that justify the requested account or role change.", evidence: "HR appointment letter HR-2026-014, board minute BM-2026-08-12, previous role audit AUTH-2031, and requester note REQ-771", action: "Attach HR and approval records" },
  { title: "Assign role scope", detail: "Set exactly which campus, class stream, finance function, learner group, and expiry date the user can access.", evidence: "Scope: Grade 4 East records, finance read-only excluded, library access allowed, expiry 20 Dec 2026", action: "Apply scoped role boundary" },
  { title: "Check audit requirements", detail: "Confirm maker-checker approval, reason, and audit classification before the role change can be submitted.", evidence: "Checker: Amina Principal, reason: term cover assignment, risk class: privileged access, audit tag AUTH-ROLE-CHANGE", action: "Record maker-checker audit check" },
];

const staffRoleReviewSteps: WorkflowStep[] = [
  { title: "Verify staff identity", detail: "Confirm the staff member before changing teaching, bursary, library, admissions, or administrator permissions.", evidence: "Staff payroll number PAY-0142, national ID ending 4482, school email admin@demo.school, and signed HR appointment letter HR-2026-014", action: "Save staff identity evidence" },
  { title: "Review appointment authority", detail: "Check the HR appointment file and the written request for the role assignment.", evidence: "Appointment letter HR-2026-014, role request REQ-771, department head approval DPT-088, board minute BM-2026-08-12", action: "Attach HR authority records" },
  { title: "Set staff role scope", detail: "Choose the exact staff role, campus, class stream, finance limit, library permission, and expiry date.", evidence: "Role: Grade 4 East teacher, campus Main, finance access none, library circulation allowed, expiry 20 Dec 2026", action: "Apply staff role scope" },
  { title: "Check segregation of duties", detail: "Confirm the staff member is not being given conflicting maker and checker privileges.", evidence: "Maker role teaching-record updates only, checker excluded for finance and user-admin actions, audit tag AUTH-SOD-2026-014", action: "Record segregation check" },
];
const auditReviewSteps: WorkflowStep[] = [
  { title: "Select audit period", detail: "Choose the exact school term, date range, or incident window that the export should cover.", evidence: "Term 2 2026, 01 May 2026 to 20 Aug 2026, incident window FIN-ARREARS-0820, timezone Africa/Nairobi", action: "Save audit period and timezone" },
  { title: "Choose audit categories", detail: "Limit the export to the relevant finance, admissions, user-access, learning-resource, or record-change events.", evidence: "Categories: finance.receipt, finance.invoice, admissions.offer, auth.role_change, learner.record_update; exclude medical notes", action: "Save audit event categories" },
  { title: "Verify export authority", detail: "Confirm the admin has explicit permission to export sensitive audit events.", evidence: "Authorization memo COMP-2026-017, approved by Amina Principal, requester Compliance Office, reason Board finance review", action: "Record export authority" },
  { title: "Lock export reason", detail: "Capture the purpose of the export so the request itself is visible in the audit trail.", evidence: "Export reason: Board audit pack for Term 2 close; retention: 7 years; recipient: compliance@school.test", action: "Lock export reason and retention" },
];

const integrationReviewSteps: WorkflowStep[] = [
  { title: "Check webhook signatures", detail: "Verify callbacks from M-Pesa, SMS, email, and backup services are signed and recent.", evidence: "M-Pesa callback MPESA-CB-88421, SHA-256 signature key MPESA_LIVE_WEBHOOK, last valid callback 20 Aug 2026 09:42", action: "Save webhook signature proof" },
  { title: "Review failed callbacks", detail: "Open failed payment or messaging callbacks before the integration is marked healthy.", evidence: "Failed callbacks MPESA-ERR-1021 and SMS-ERR-662, retry count 2, affected receipt INV-2026-041", action: "Attach failed callback review" },
  { title: "Confirm service secrets", detail: "Confirm API keys and webhook secrets are configured without exposing their raw values.", evidence: "Secret names MPESA_CONSUMER_KEY, MPESA_PASSKEY, SMS_API_TOKEN; last rotated 18 Aug 2026; owner ICT Admin", action: "Record secret rotation check" },
  { title: "Queue retry plan", detail: "Schedule safe retries for failed callbacks without duplicating receipts or notifications.", evidence: "Retry batch RETRY-2026-0820-01, duplicate guard by checkoutRequestId, owner Carol Bursar", action: "Save safe retry plan" },
];

const financeReviewSteps: WorkflowStep[] = [
  { title: "Confirm learner account", detail: "Verify the learner, guardian, invoice, and receipt records before posting a finance change.", evidence: "Learner Nia Wanjiku ADM-2026-000, guardian Esther Guardian ID ending 2190, invoice INV-2026-041, account LEDGER-ADM-2026-000", action: "Save learner account verification" },
  { title: "Review balance movement", detail: "Compare opening balance, invoices, receipts, discounts, and reversals before completion.", evidence: "Invoice INV-2026-041, receipt MPESA-QK82L19, discount approval DISC-004, and Nia Wanjiku ledger balance", action: "Attach invoice, receipt, and ledger review" },
  { title: "Check payment channel", detail: "Validate M-Pesa, bank, or cash receipt details against the selected account.", evidence: "M-Pesa receipt MPESA-QK82L19, checkout request ws_CO_20082026_1042, paybill 522123, amount KES 5,000", action: "Save payment channel validation" },
  { title: "Queue guardian notice", detail: "Prepare a permitted notice for guardians after the finance task is approved.", evidence: "Guardian Esther Guardian, SMS template FEE-RECEIPT-01, email statement link masked, delivery after approval", action: "Save guardian notification draft" },
];

const libraryReviewSteps: WorkflowStep[] = [
  { title: "Confirm borrower", detail: "Match the borrower to the learner profile and current class stream before renewing or closing a loan.", evidence: "Learner Nia Wanjiku ADM-2026-000, Grade 4 East, library card LIB-ADM-2026-000", action: "Save borrower verification" },
  { title: "Check book copy", detail: "Verify the exact copy, barcode, due date, and condition before any loan action.", evidence: "Barcode LIB-ENG-042, title The River and the Source, due 26 Aug 2026, condition Good", action: "Attach copy and due-date check" },
  { title: "Review overdue rules", detail: "Confirm renewal limits, overdue days, and any fee rules before updating the loan.", evidence: "Renewals used 0 of 2, overdue days 0, fine KES 0, library policy LIB-POL-2026", action: "Save overdue rule check" },
  { title: "Notify guardian and teacher", detail: "Prepare a notice only for linked guardians and the class teacher.", evidence: "Guardian Esther Guardian, teacher David Class Teacher, SMS notice LIB-DUE-01, send date 24 Aug 2026", action: "Queue library notice" },
];

const admissionsReviewSteps: WorkflowStep[] = [
  { title: "Confirm applicant file", detail: "Open the application file and confirm the child, guardian, class requested, and intake term.", evidence: "Application APP-2026-118, applicant Brian Otieno, Grade 4 intake, Term 3 2026", action: "Save applicant file check" },
  { title: "Review required documents", detail: "Check birth certificate, previous school report, guardian ID, and medical declaration status.", evidence: "Birth certificate BC-77821, report card REP-2025-STD3, guardian ID ending 7741, medical form MED-118", action: "Attach admissions documents" },
  { title: "Schedule interview", detail: "Confirm the interview slot, panel, room, and guardian acknowledgement.", evidence: "Interview 28 Aug 2026 10:30, panel Admissions + Grade Lead, room Admin 2, guardian SMS acknowledged", action: "Save interview schedule" },
  { title: "Prepare offer controls", detail: "Set offer expiry, admission number reservation, fee deposit, and guardian onboarding steps.", evidence: "Offer expiry 05 Sep 2026, reserved ADM-2026-118, deposit KES 10,000, onboarding checklist ADM-ONB-118", action: "Save offer controls" },
];

const learningReviewSteps: WorkflowStep[] = [
  { title: "Open learner context", detail: "Review the learner, class stream, subject, and teacher owner before changing academic records.", evidence: "Grade 4 East, learner Nia Wanjiku ADM-2026-000, subject Mathematics, teacher David Class Teacher", action: "Save learner context" },
  { title: "Review learning material", detail: "Check the assignment, resource, assessment, or comment before it is published or updated.", evidence: "Resource Grade 4 Mathematics Practice Pack, CBC strand Numbers, assessment task MAT-G4-0820, teacher note TN-440", action: "Attach learning material review" },
  { title: "Set visibility", detail: "Choose whether the item is visible to learners, parents, teachers, or administrators.", evidence: "Audience: Grade 4 East learners, linked parents, Mathematics department; release 21 Aug 2026 08:00", action: "Apply resource visibility" },
  { title: "Notify allowed users", detail: "Queue the right notification without exposing the item to users outside the role boundary.", evidence: "Recipients: Grade 4 East guardians and learners, channel in-app + email, template RESOURCE-PUBLISH-01", action: "Queue learning resource notices" },
];

const reviewStepsFor = (title: string) => {
  if (title === "Audit Export") return auditReviewSteps;
  if (title === "Integration Health") return integrationReviewSteps;
  if (title === "Staff Role Assignments") return staffRoleReviewSteps;
  if (title === "User Access Control") return accessReviewSteps;
  if (title.includes("Fee") || title.includes("Payment") || title.includes("M-Pesa") || title.includes("Invoice") || title.includes("Statement")) return financeReviewSteps;
  if (title.includes("Library") || title.includes("Borrowed") || title.includes("loan") || title.includes("River") || title.includes("Atlas")) return libraryReviewSteps;
  if (title.includes("Application") || title.includes("Offer") || title.includes("Guardian onboarding") || title.includes("Admission")) return admissionsReviewSteps;
  return learningReviewSteps;
};

const confirmStepsFor = (item: WorkflowDetailItem): WorkflowStep[] => {
  if (item.title === "Audit Export") return [
    { title: "Seal export checksum", detail: "Create a checksum so the exported audit file can be verified after download.", evidence: "SHA-256 checksum for AUDIT-TERM2-2026.zip, generated by Compliance Office, stored with export manifest", action: "Preview export checksum" },
    { title: "Notify compliance owner", detail: "Send the export package only to the compliance owner and permitted administrators.", evidence: "Recipients compliance@school.test and Amina Principal, delivery channel encrypted email, no guardian or learner recipients", action: "Review compliance recipients" },
    { title: "Store export record", detail: "Save the export request, file metadata, reason, and approver into the audit trail.", evidence: "Archive record AUD-EXP-2026-0820, approver Amina Principal, retention 7 years, export reason Board finance review", action: "Store export audit record" },
  ];
  return [
    { title: "Audit log will be created", detail: "The system will record who performed the action, the role used, the affected record, timestamp, and outcome.", evidence: `Audit event for ${item.title}, actor role ${item.owner}, timestamp Africa/Nairobi, affected record reference required`, action: "Preview audit log entry" },
    { title: "Notifications queued for permitted users", detail: "Only users with permission for this learner, finance account, admission case, or staff record will be notified.", evidence: `Permitted recipients for ${item.title}, channel preference, masked learner/account identifiers, notification template ID`, action: "Review permitted recipients" },
    { title: `Final review assigned to ${item.owner}`, detail: "The accountable owner receives the final approval task before sensitive changes are considered complete.", evidence: `Final owner ${item.owner}, approval SLA 24 hours, escalation to Admin Command Center, maker-checker status`, action: "Assign final owner review" },
  ];
};

const completionFor = (item: WorkflowDetailItem): CompletionConfig => {
  if (item.title === "Audit Export") return { primaryLabel: "Export format", secondaryLabel: "Date range", primaryValue: "Signed PDF + CSV with checksum manifest", secondaryValue: "01 May 2026 to 20 Aug 2026, Africa/Nairobi", buttonLabel: "Generate signed audit export package", status: "Export package ready for compliance approval" };
  if (item.title === "Integration Health") return { primaryLabel: "Integration action", secondaryLabel: "Technical note", primaryValue: "Retry failed callbacks MPESA-ERR-1021 and SMS-ERR-662", secondaryValue: "Webhook signatures verified; no duplicate receipt posting", buttonLabel: "Apply signed integration update", status: "Integration update ready for ICT approval" };
  if (item.title === "User Access Control") return { primaryLabel: "Account action", secondaryLabel: "Approval notes", primaryValue: "Approve Grade 4 East teacher access until 20 Dec 2026", secondaryValue: "Verified against HR record HR-2026-014 and checker Amina Principal", buttonLabel: "Submit scoped access approval", status: "Access change ready for checker approval" };
  if (item.title === "Staff Role Assignments") return { primaryLabel: "Staff role action", secondaryLabel: "HR approval note", primaryValue: "Assign Grade 4 East class-teacher scope to PAY-0142 until 20 Dec 2026", secondaryValue: "Appointment HR-2026-014 verified; no finance checker privilege granted", buttonLabel: "Submit staff role assignment for checker approval", status: "Staff role assignment ready for HR checker approval" };
  if (item.title.includes("Fee") || item.title.includes("Payment") || item.title.includes("M-Pesa") || item.title.includes("Invoice") || item.title.includes("Statement")) return { primaryLabel: "Payment method", secondaryLabel: "Amount to process", primaryValue: "M-Pesa receipt MPESA-QK82L19 to invoice INV-2026-041", secondaryValue: "KES 5,000 for Nia Wanjiku ADM-2026-000", buttonLabel: "Post verified payment allocation", status: "Payment allocation ready for bursar approval" };
  if (item.title.includes("Library") || item.title.includes("Borrowed") || item.title.includes("loan")) return { primaryLabel: "Library action", secondaryLabel: "Loan note", primaryValue: "Renew barcode LIB-ENG-042 for Nia Wanjiku", secondaryValue: "Due 26 Aug 2026; guardian notice queued", buttonLabel: "Save library loan update", status: "Library loan update ready for approval" };
  return { primaryLabel: `${item.title} action`, secondaryLabel: `${item.owner} evidence note`, primaryValue: item.next, secondaryValue: `Prepared for ${item.owner} with linked learner, class, finance, or library evidence`, buttonLabel: `Save ${item.title} update`, status: `${item.title} update ready for owner approval` };
};

function WorkflowStepPanel({ step, onDone }: { step: WorkflowStep; onDone: () => void }) {
  return <article className="step-workspace" key={step.title}><header><span className="eyebrow">Selected step</span><h4>{step.title}</h4></header><p>{step.detail}</p><label><span>Evidence required</span><input aria-label="Evidence required" defaultValue={step.evidence} key={step.title} /></label><button type="button" onClick={onDone}><ArrowRight size={18} />{step.action}</button></article>;
}

function WorkflowDetailPanel({ item }: { item: WorkflowDetailItem }) {
  const reviewSteps = useMemo(() => reviewStepsFor(item.title), [item.title]);
  const confirmationSteps = useMemo(() => confirmStepsFor(item), [item.title, item.owner]);
  const completion = useMemo(() => completionFor(item), [item.title, item.next, item.owner]);
  const [activeTab, setActiveTab] = useState("Review");
  const [submitted, setSubmitted] = useState(false);
  const [activeStep, setActiveStep] = useState<WorkflowStep>(reviewSteps[0]);
  const taskBodyRef = useRef<HTMLDivElement | null>(null);

  const scrollToChangedPanel = () => {
    window.requestAnimationFrame(() => taskBodyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  useEffect(() => {
    setActiveTab("Review");
    setSubmitted(false);
    setActiveStep(reviewSteps[0]);
  }, [item.title, reviewSteps]);

  const tabs = ["Review", "Complete", "Confirm"];
  const steps = activeTab === "Confirm" ? confirmationSteps : reviewSteps;
  const openTab = (tab: string) => {
    setActiveTab(tab);
    setSubmitted(false);
    setActiveStep(tab === "Confirm" ? confirmationSteps[0] : reviewSteps[0]);
    scrollToChangedPanel();
  };
  const openStep = (step: WorkflowStep) => {
    setActiveStep(step);
    scrollToChangedPanel();
  };
  const submitTask = () => {
    setSubmitted(true);
    scrollToChangedPanel();
  };

  return <section className="module task-page"><div className="task-page-header"><span className="eyebrow">Task page</span><h3>{item.title}</h3><p>{item.detail}</p></div><div className="task-tabs" role="tablist" aria-label={`${item.title} task sections`}>{tabs.map((tab) => <button key={tab} role="tab" type="button" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => openTab(tab)}>{tab}</button>)}</div>{activeTab === "Review" && <div className="task-section" ref={taskBodyRef}><div className="process-list">{steps.map((step) => <button className={activeStep.title === step.title ? "active" : ""} type="button" key={step.title} onClick={() => openStep(step)}>{step.title}</button>)}</div><WorkflowStepPanel step={activeStep} onDone={() => openTab("Complete")} /><div className="detail-meta"><span>{item.owner}</span><strong>{item.status}</strong></div><button type="button" onClick={() => openTab("Complete")}><ArrowRight size={18} />{item.next}</button></div>}{activeTab === "Complete" && <div className="task-section" ref={taskBodyRef}><div className="task-fields"><label><span>{completion.primaryLabel}</span><input aria-label={completion.primaryLabel} defaultValue={completion.primaryValue} key={`${item.title}-${completion.primaryLabel}`} /></label><label><span>{completion.secondaryLabel}</span><input aria-label={completion.secondaryLabel} defaultValue={completion.secondaryValue} key={`${item.title}-${completion.secondaryLabel}`} /></label></div><button type="button" onClick={submitTask}><ArrowRight size={18} />{completion.buttonLabel}</button>{submitted && <strong className="task-status">{completion.status}</strong>}</div>}{activeTab === "Confirm" && <div className="task-section" ref={taskBodyRef}><div className="process-list">{steps.map((step) => <button className={activeStep.title === step.title ? "active" : ""} type="button" key={step.title} onClick={() => openStep(step)}>{step.title}</button>)}</div><WorkflowStepPanel step={activeStep} onDone={submitTask} /><button type="button" onClick={submitTask}><ArrowRight size={18} />{item.next}</button>{submitted && <strong className="task-status">{completion.status}</strong>}</div>}</section>;
}
function Workspace({ dashboard, active, onOpen, selected }: { dashboard: Dashboard; active: WorkspaceKey; onOpen: (row: string) => void; selected?: string }) {
  const linkedIds = dashboard.parentLearners.map((item) => item.learner.id);
  const visibleLoans = linkedIds.length ? loans.filter((loan) => linkedIds.includes(loan.learnerId)) : loans;

  if (active === "settings") return <DataTable title="Admin Control Center" rows={adminRows} icon={UserCog} onOpen={onOpen} selected={selected} />;
  if (active === "audit") return <section className="module"><header><ShieldCheck size={20} /><h3>Audit Trail</h3></header>{dashboard.recentAudit.map((event) => <button type="button" className="audit-line" key={event.id} onClick={() => onOpen(event.action)}><strong>{event.action}</strong><span>{event.summary}</span></button>)}</section>;
  if (active === "billing") return <section className="module"><header><Banknote size={20} /><h3>{dashboard.role === "Finance Officer" ? "Billing Control" : "Fee Statement & Payments"}</h3></header>{dashboard.role !== "Finance Officer" && <div className="balance-callout"><span>Current balance</span><strong>{formatKes(dashboard.parentLearners[0]?.balance ?? dashboard.totals.openBalance)}</strong></div>}{financeRows.map((row, index) => <button className={selected === row ? "table-row selected" : "table-row"} type="button" key={row} onClick={() => onOpen(row)}><span>{row}</span><small>Finance</small><strong>{index % 2 === 0 ? "Ready" : "Review"}</strong></button>)}</section>;
  if (active === "reconciliation") return <DataTable title="Reconciliation Queue" rows={["M-Pesa Exceptions", "Duplicate callbacks", "Unmatched receipts", "Reversal approvals"]} icon={ReceiptText} onOpen={onOpen} selected={selected} />;
  if (active === "register") return <DataTable title="Class Register" rows={teacherRows} icon={ClipboardCheck} onOpen={onOpen} selected={selected} />;
  if (active === "attendance") return <DataTable title="Attendance & Calendar" rows={["Daily register", "Late arrivals", "Absence follow-up", "Assessment calendar"]} icon={CalendarCheck} onOpen={onOpen} selected={selected} />;
  if (active === "admissions") return <DataTable title="Applications" rows={admissionsRows} icon={FileText} onOpen={onOpen} selected={selected} />;
  if (active === "resources") return <section className="module wide"><header><BookMarked size={20} /><h3>{dashboard.role === "Learner" ? "Study Board" : "Learning Resources"}</h3></header><div className="resource-board">{resources.map((resource) => <button type="button" className="resource-card" key={resource.title} onClick={() => onOpen(resource.title)}><span>{resource.area}</span><strong>{resource.title}</strong><p>{resource.audience}</p><small>{resource.owner}</small></button>)}{dashboard.role === "Learner" && <button type="button" className="resource-card" onClick={() => onOpen("Assignments")}><span>Class tasks</span><strong>Assignment Board</strong><p>Open class tasks and teacher feedback.</p><small>Due this week</small></button>}</div></section>;
  if (active === "library") return <section className="module"><header><Library size={20} /><h3>{dashboard.role === "Parent" || dashboard.role === "Learner" ? "Borrowed Books" : "Library Books"}</h3></header>{visibleLoans.map((loan) => <button type="button" className="library-line" key={loan.barcode} onClick={() => onOpen(loan.title)}><div><strong>{loan.title}</strong><span>{loan.barcode}</span></div><div><strong>{loan.status}</strong><span>Due {loan.due}</span></div></button>)}</section>;
  if (active === "records") return <section className="module"><header><GraduationCap size={20} /><h3>{dashboard.role === "Parent" ? "Child Records" : "Learner Records"}</h3></header>{dashboard.parentLearners.map((item) => <button type="button" className="library-line" key={item.learner.id} onClick={() => onOpen(`${item.learner.firstName} ${item.learner.lastName}`)}><div><strong>{item.learner.firstName} {item.learner.lastName}</strong><span>{item.learner.admissionNumber}</span></div><div><strong>{item.attendanceRate}% attendance</strong><span>{formatKes(item.balance)}</span></div></button>)}{dashboard.role === "Parent" && <><button type="button" className="library-line" onClick={() => onOpen("The River and the Source")}><div><strong>The River and the Source</strong><span>Current library loan</span></div><div><strong>Due soon</strong><span>Due 26 Aug</span></div></button><button type="button" className="library-line" onClick={() => onOpen("Grade 4 Mathematics Practice Pack")}><div><strong>Grade 4 Mathematics Practice Pack</strong><span>Learning resource</span></div><div><strong>Shared</strong><span>Family and teacher access</span></div></button></>}</section>;
  return <section className="module wide"><header><LayoutDashboard size={20} /><h3>{roleTitle(dashboard.role)}</h3></header><div className="resource-board"><button type="button" className="resource-card" onClick={() => onOpen("Learning progress")}><span>Academics</span><strong>Learning progress</strong><p>Classes, resources, assessment tasks, comments, and report readiness.</p></button><button type="button" className="resource-card" onClick={() => onOpen("Daily work")}><span>Operations</span><strong>Daily work</strong><p>Attendance, admissions, communication, fees, library, and follow-up queues.</p></button><button type="button" className="resource-card" onClick={() => onOpen("Permission aware")}><span>Controls</span><strong>Permission aware</strong><p>Only authorized users see sensitive finance, admin, and audit tools.</p></button></div></section>;
}

function DashboardView({ dashboard, onRoleChange, onSignOut }: { dashboard: Dashboard; onRoleChange: (role: string) => void; onSignOut: () => void }) {
  const [active, setActive] = useState<WorkspaceKey>(defaultWorkspace(dashboard.role));
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDetailItem>(() => workflowDetail("Current workflow"));
  const nav = useMemo(() => navForRole(dashboard.role), [dashboard.role]);
  const actions = useMemo(() => actionsForRole(dashboard.role), [dashboard.role]);
  const assignableRoles = dashboard.user.roles?.length ? dashboard.user.roles : [dashboard.role];
  const workflowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActive(defaultWorkspace(dashboard.role));
    setSelectedWorkflow(workflowDetail("Current workflow"));
  }, [dashboard.role]);

  const scrollToWorkflow = () => {
    window.requestAnimationFrame(() => workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openWorkflow = (workflow: string) => {
    setSelectedWorkflow(workflowDetail(workflowForAction(workflow)));
    scrollToWorkflow();
  };

  const openArea = (key: WorkspaceKey, workflow?: string) => {
    setActive(key);
    openWorkflow(workflow ?? key);
  };

  return <main className="portal"><aside className="portal-nav"><div className="brand"><span>SH</span><strong>{productName}</strong></div>{nav.map(({ key, label, Icon }) => <button className={active === key ? "active" : ""} type="button" key={key} onClick={() => openArea(key)}><Icon size={18} />{label}</button>)}</aside><section className="portal-main"><header className="portal-header"><div><p>{dashboard.user.name}</p><h1>{roleTitle(dashboard.role)}</h1></div><div className="session-tools"><div className="trust"><ShieldCheck size={18} />Role-secured session</div>{assignableRoles.length > 1 && <div className="role-switcher" aria-label="Switch active role">{assignableRoles.map((role) => role === dashboard.role ? <span className="current-role" key={role}>{roleDisplay(role)}</span> : <button type="button" key={role} onClick={() => onRoleChange(role)}>Switch to {roleDisplay(role)}</button>)}</div>}<button className="sign-out" type="button" onClick={onSignOut}><LogOut size={18} />Sign out</button></div></header><section className="stats"><Stat label="Learners" value={dashboard.totals.learners} Icon={GraduationCap} /><Stat label="Fee exposure" value={formatKes(dashboard.totals.openBalance)} Icon={Banknote} /><Stat label="Library loans" value={loans.length} Icon={Library} /><Stat label="Audit events" value={dashboard.totals.auditEvents} Icon={LockKeyhole} /></section><section className="action-strip">{actions.map((action) => <button type="button" key={action.label} onClick={() => openArea(action.key, workflowForAction(action.label))}>{action.label}</button>)}</section><section className="work-grid"><Workspace dashboard={dashboard} active={active} onOpen={openWorkflow} selected={selectedWorkflow.title} /><div className="workflow-anchor" ref={workflowRef}><WorkflowDetailPanel item={selectedWorkflow} /></div><DataTable title="Communication Center" rows={["Targeted notices", "Attendance alerts", "Fee reminders", "Report publication"]} icon={Mail} onOpen={openWorkflow} selected={selectedWorkflow.title} />{dashboard.role !== "Parent" && dashboard.role !== "Learner" && <DataTable title="Operations Queue" rows={["Pending approvals", "Follow-up tasks", "Imports", "Exports"]} icon={SlidersHorizontal} onOpen={openWorkflow} selected={selectedWorkflow.title} />}</section></section></main>;
}
export default function App({ initialDashboard }: AppProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboard ?? null);
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setDashboard(initialDashboard ?? null);
  }, [initialDashboard]);

  useEffect(() => {
    setHistory(readLoginHistory());
  }, []);

  const remember = (nextDashboard: Dashboard, activeRole: string) => {
    const item = {
      email: nextDashboard.user.email,
      name: nextDashboard.user.name,
      lastRole: activeRole,
      roles: nextDashboard.user.roles?.length ? nextDashboard.user.roles : [activeRole],
      lastLoginAt: new Date().toISOString(),
    };
    writeLoginHistory(item);
    setHistory(readLoginHistory());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!selectedRole) {
      setError("Choose the role you want to use for this sign in.");
      return;
    }

    try {
      const session = await login(email, password, selectedRole);
      setSessionId(session.sessionId);
      const nextDashboard = await getDashboard(session.sessionId);
      const withRoles = { ...nextDashboard, user: { ...nextDashboard.user, id: session.user.id, name: session.user.name, email: session.user.email, roles: session.user.roles } };
      setDashboard(withRoles);
      remember(withRoles, session.activeRole || selectedRole);
    } catch (caught) {
      const fallbackDashboard = testingDashboardForCredentials(email, password, selectedRole);
      if (fallbackDashboard) {
        setSessionId("");
        setDashboard(fallbackDashboard);
        remember(fallbackDashboard, selectedRole);
        return;
      }
      setError(caught instanceof Error ? caught.message : "Sign in failed");
    }
  };

  const useRememberedLogin = (item: LoginHistoryItem) => {
    setEmail(item.email);
    setSelectedRole(item.lastRole);
  };

  const useTestingRole = (role: typeof roleOptions[number]) => {
    setSelectedRole(role.value);
    setEmail(role.email);
    setPassword(role.password);
  };

  const handleRoleChange = async (role: string) => {
    if (!dashboard) return;
    setError("");
    if (!sessionId) {
      const nextDashboard = { ...dashboard, role, user: { ...dashboard.user, roles: dashboard.user.roles ?? [dashboard.role] } };
      setDashboard(nextDashboard);
      remember(nextDashboard, role);
      return;
    }

    try {
      const session = await switchRole(sessionId, role);
      setSessionId(session.sessionId);
      const nextDashboard = await getDashboard(session.sessionId);
      const withRoles = { ...nextDashboard, user: { ...nextDashboard.user, id: session.user.id, name: session.user.name, email: session.user.email, roles: session.user.roles } };
      setDashboard(withRoles);
      remember(withRoles, session.activeRole || role);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Role switch failed");
    }
  };

  const signOut = () => {
    setDashboard(null);
    setSessionId("");
    setPassword("");
    setError("");
  };
  if (dashboard) return <DashboardView dashboard={dashboard} onRoleChange={handleRoleChange} onSignOut={signOut} />;

  return <main className="login-screen"><section className="login-card" aria-labelledby="login-title"><div className="brand-mark"><GraduationCap size={34} /></div><p>Secure access</p><h1 id="login-title">{productName}</h1>{history.length > 0 && <section className="remembered-logins" aria-label="Remembered people">{history.map((item) => <button className="returning-user-card" type="button" key={item.email} onClick={() => useRememberedLogin(item)}><span>{item.name}</span><strong>{roleDisplay(item.lastRole)}</strong></button>)}</section>}<section className="role-picker" aria-label="Choose login role">{roleOptions.map((role) => <button className={selectedRole === role.value ? "selected" : ""} type="button" key={role.value} onClick={() => useTestingRole(role)}>{role.label}</button>)}</section><form onSubmit={submit}><label>Email<input aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" /></label><label>Password<input aria-label="Password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button type="submit"><LockKeyhole size={18} />Sign in</button></form></section></main>;
}
