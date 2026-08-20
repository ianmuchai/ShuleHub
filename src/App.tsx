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
    "Daily register": { title: "Daily register", status: "Today", owner: "Class teacher", detail: "Marked present, absent, late, and follow-up notes for the active class stream.", next: "Continue workflow" },
    "User Access Control": { title: "User Access Control", status: "Restricted", owner: "Super Admin", detail: "Create users, suspend access, reset credentials, and enforce role boundaries with audit trails.", next: "Open user control" },
    "Academic Year Setup": { title: "Academic Year Setup", status: "Ready", owner: "Deputy Academics", detail: "Configure terms, streams, grading windows, promotion rules, and report release dates.", next: "Edit school calendar" },
    "Integration Health": { title: "Integration Health", status: "Secure", owner: "ICT Admin", detail: "Monitor M-Pesa, SMS, email, backups, webhook signatures, and failed callbacks.", next: "Inspect integrations" },
    "Audit Export": { title: "Audit Export", status: "Controlled", owner: "Compliance", detail: "Export tamper-evident logs for finance, admissions, account access, and record edits.", next: "Prepare audit export" },
    "Fee Statement": { title: "Fee Statement", status: "Statement ready", owner: "Bursar", detail: "Review invoices, receipts, discounts, transport, meals, and balance movement for the selected child.", next: "Open statement" },
    "Library Loans": { title: "Library loan actions", status: "2 active", owner: "Library", detail: "Review current borrowed books, due dates, renewal status, and return follow-up.", next: "Open loan record" },
    "Borrowed Books": { title: "Borrowed Books", status: "2 active", owner: "Library", detail: "Review current borrowed books, due dates, renewal status, and return follow-up.", next: "Open loan record" },
    "Child Profile": { title: "Child Profile", status: "Linked", owner: "Class teacher", detail: "Open learner biodata, attendance, class placement, guardian links, fees, library, and shared resources.", next: "Open learner profile" },
    "M-Pesa Exceptions": { title: "M-Pesa Exceptions", status: "Needs review", owner: "Bursar", detail: "Inspect failed callbacks, duplicate receipts, reversal requests, and unmatched paybill references.", next: "Resolve exception" }
  };
  return details[title] ?? { title, status: "Ready", owner: "Workspace owner", detail: "Open the selected record, review the supporting data, and continue the workflow.", next: "Continue workflow" };
};

function Stat({ label, value, Icon }: { label: string; value: string | number; Icon: LucideIcon }) {
  return <article className="stat"><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>;
}

function DataTable({ title, rows, icon: Icon, onOpen, selected }: { title: string; rows: string[]; icon: LucideIcon; onOpen: (row: string) => void; selected?: string }) {
  return <section className="module"><header><Icon size={20} /><h3>{title}</h3></header>{rows.map((row, index) => <button className={selected === row ? "table-row selected" : "table-row"} type="button" key={row} onClick={() => onOpen(row)}><span>{row}</span><small>{row.includes("Access") || row.includes("Audit") || row.includes("Integration") ? "Restricted" : "Workspace"}</small><strong>{index % 2 === 0 ? "Ready" : "Review"}</strong></button>)}</section>;
}

function WorkflowDetailPanel({ item }: { item: WorkflowDetailItem }) {
  const [activeTab, setActiveTab] = useState("Review");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setActiveTab("Review");
    setSubmitted(false);
  }, [item.title]);

  const isAccessWorkflow = item.title === "User Access Control" || item.title === "Integration Health" || item.title === "Audit Export";
  const tabs = ["Review", "Complete", "Confirm"];

  return <section className="module task-page"><div className="task-page-header"><span className="eyebrow">Task page</span><h3>{item.title}</h3><p>{item.detail}</p></div><div className="task-tabs" role="tablist" aria-label={`${item.title} task sections`}>{tabs.map((tab) => <button key={tab} role="tab" type="button" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>{activeTab === "Review" && <div className="task-section"><div className="process-list"><span>Verify identity</span><span>Review supporting records</span><span>Assign role scope</span><span>Check audit requirements</span></div><div className="detail-meta"><span>{item.owner}</span><strong>{item.status}</strong></div><button type="button"><ArrowRight size={18} />{item.next}</button></div>}{activeTab === "Complete" && <div className="task-section"><div className="task-fields"><label><span>{isAccessWorkflow ? "Account action" : "Payment method"}</span><select aria-label={isAccessWorkflow ? "Account action" : "Payment method"} defaultValue={isAccessWorkflow ? "Approve role update" : "M-Pesa"}><option>Approve role update</option><option>Create user</option><option>Suspend access</option><option>M-Pesa</option><option>Bank transfer</option><option>Cash receipt</option></select></label><label><span>{isAccessWorkflow ? "Approval notes" : "Amount to process"}</span><input aria-label={isAccessWorkflow ? "Approval notes" : "Amount to process"} defaultValue={isAccessWorkflow ? "Verified against staff record" : "5000"} /></label></div><button type="button" onClick={() => setSubmitted(true)}><ArrowRight size={18} />{isAccessWorkflow ? "Submit approval" : "Record payment"}</button>{submitted && <strong className="task-status">Task ready for approval</strong>}</div>}{activeTab === "Confirm" && <div className="task-section"><div className="process-list"><span>Audit log will be created</span><span>Notifications queued for permitted users</span><span>Final review assigned to {item.owner}</span></div><button type="button"><ArrowRight size={18} />{item.next}</button></div>}</section>;
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
