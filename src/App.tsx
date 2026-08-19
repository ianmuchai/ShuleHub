import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BookMarked,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LockKeyhole,
  Mail,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Dashboard, getDashboard, login } from "./api";
import "./styles.css";

type AppProps = { initialDashboard?: Dashboard };
type WorkspaceKey = "command" | "records" | "attendance" | "resources" | "library" | "billing" | "admissions" | "audit" | "settings" | "reconciliation" | "register";
type NavItem = { key: WorkspaceKey; label: string; Icon: LucideIcon };
type Action = { label: string; key: WorkspaceKey };

const productName = "ShuleHub";

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
const adminRows = ["Users & Roles", "Role and permission matrix", "Integration Vault", "Academic structure", "Audit export controls", "Backup readiness"];
const financeRows = ["Invoice runs", "Payment allocation", "Receipt register", "Arrears aging", "Statement exports", "Bank deposit review"];
const teacherRows = ["Class Register", "Assessment entry", "Homework issue", "Learner comments", "Resource publishing", "Welfare follow-up"];
const studentRows = ["Assignments", "Learning Resources", "Library Books", "Published results", "Calendar", "Notices"];

const formatKes = (amount: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);
const roleTitle = (role: string) => role === "Finance Officer" ? "Bursar Workbench" : role === "Super Admin" || role === "School Admin" ? "Admin Command Center" : role === "Teacher" ? "Teacher Workspace" : role === "Parent" ? "Family Portal" : role === "Admissions Officer" ? "Admissions Desk" : "Student Desk";
const defaultWorkspace = (role: string): WorkspaceKey => role === "Finance Officer" ? "billing" : role === "Teacher" ? "register" : role === "Admissions Officer" ? "admissions" : role === "Parent" ? "records" : role === "Learner" ? "resources" : "settings";

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

function Stat({ label, value, Icon }: { label: string; value: string | number; Icon: LucideIcon }) {
  return <article className="stat"><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>;
}

function DataTable({ title, rows, icon: Icon }: { title: string; rows: string[]; icon: LucideIcon }) {
  return <section className="module"><header><Icon size={20} /><h3>{title}</h3></header>{rows.map((row, index) => <button className="table-row" type="button" key={row} aria-label={`Open workflow row ${index + 1}`}><span>{row}</span><strong>{index % 2 === 0 ? "Ready" : "Review"}</strong></button>)}</section>;
}

function Workspace({ dashboard, active }: { dashboard: Dashboard; active: WorkspaceKey }) {
  const linkedIds = dashboard.parentLearners.map((item) => item.learner.id);
  const visibleLoans = linkedIds.length ? loans.filter((loan) => linkedIds.includes(loan.learnerId)) : loans;

  if (active === "settings") return <DataTable title="System Controls" rows={adminRows} icon={UserCog} />;
  if (active === "audit") return <section className="module"><header><ShieldCheck size={20} /><h3>Audit Trail</h3></header>{dashboard.recentAudit.map((event) => <div className="audit-line" key={event.id}><strong>{event.action}</strong><span>{event.summary}</span></div>)}</section>;
  if (active === "billing") return <DataTable title={dashboard.role === "Finance Officer" ? "Billing Control" : "Fee Statement"} rows={financeRows} icon={Banknote} />;
  if (active === "reconciliation") return <DataTable title="Reconciliation Queue" rows={["M-Pesa Exceptions", "Duplicate callbacks", "Unmatched receipts", "Reversal approvals"]} icon={ReceiptText} />;
  if (active === "register") return <DataTable title="Class Register" rows={teacherRows} icon={ClipboardCheck} />;
  if (active === "attendance") return <DataTable title="Attendance And Calendar" rows={["Daily register", "Late arrivals", "Absence follow-up", "Assessment calendar"]} icon={CalendarCheck} />;
  if (active === "admissions") return <DataTable title="Applications" rows={admissionsRows} icon={FileText} />;
  if (active === "resources") return <section className="module wide"><header><BookMarked size={20} /><h3>{dashboard.role === "Learner" ? "Study Board" : "Learning Resources"}</h3></header><div className="resource-board">{resources.map((resource) => <article key={resource.title}><span>{resource.area}</span><strong>{resource.title}</strong><p>{resource.audience}</p><small>{resource.owner}</small></article>)}{dashboard.role === "Learner" && <article><span>Class tasks</span><strong>Assignment Board</strong><p>Open class tasks and teacher feedback.</p><small>Due this week</small></article>}</div></section>;
  if (active === "library") return <section className="module"><header><Library size={20} /><h3>Library Books</h3></header>{visibleLoans.map((loan) => <div className="library-line" key={loan.barcode}><div><strong>{loan.title}</strong><span>{loan.barcode}</span></div><div><strong>{loan.status}</strong><span>Due {loan.due}</span></div></div>)}</section>;
  if (active === "records") return <section className="module"><header><GraduationCap size={20} /><h3>{dashboard.role === "Parent" ? "Child Records" : "Learner Records"}</h3></header>{dashboard.parentLearners.map((item) => <div className="library-line" key={item.learner.id}><div><strong>{item.learner.firstName} {item.learner.lastName}</strong><span>{item.learner.admissionNumber}</span></div><div><strong>{item.attendanceRate}% attendance</strong><span>{formatKes(item.balance)}</span></div></div>)}{dashboard.role === "Parent" && <><div className="library-line"><div><strong>The River and the Source</strong><span>Current library loan</span></div><div><strong>Due soon</strong><span>Due 26 Aug</span></div></div><div className="library-line"><div><strong>Grade 4 Mathematics Practice Pack</strong><span>Learning resource</span></div><div><strong>Shared</strong><span>Family and teacher access</span></div></div></>}</section>;
  return <section className="module wide"><header><LayoutDashboard size={20} /><h3>{roleTitle(dashboard.role)}</h3></header><div className="resource-board"><article><span>Academics</span><strong>Learning progress</strong><p>Classes, resources, assessment tasks, comments, and report readiness.</p></article><article><span>Operations</span><strong>Daily work</strong><p>Attendance, admissions, communication, fees, library, and follow-up queues.</p></article><article><span>Controls</span><strong>Permission aware</strong><p>Only authorized users see sensitive finance, admin, and audit tools.</p></article></div></section>;
}

function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  const [active, setActive] = useState<WorkspaceKey>(defaultWorkspace(dashboard.role));
  const nav = useMemo(() => navForRole(dashboard.role), [dashboard.role]);
  const actions = useMemo(() => actionsForRole(dashboard.role), [dashboard.role]);

  useEffect(() => {
    setActive(defaultWorkspace(dashboard.role));
  }, [dashboard.role]);

  return <main className="portal"><aside className="portal-nav"><div className="brand"><span>SH</span><strong>{productName}</strong></div>{nav.map(({ key, label, Icon }) => <button className={active === key ? "active" : ""} type="button" key={key} onClick={() => setActive(key)}><Icon size={18} />{label}</button>)}</aside><section className="portal-main"><header className="portal-header"><div><p>{dashboard.user.name}</p><h1>{roleTitle(dashboard.role)}</h1></div><div className="trust"><ShieldCheck size={18} />Role-secured session</div></header><section className="stats"><Stat label="Learners" value={dashboard.totals.learners} Icon={GraduationCap} /><Stat label="Fee exposure" value={formatKes(dashboard.totals.openBalance)} Icon={Banknote} /><Stat label="Library loans" value={loans.length} Icon={Library} /><Stat label="Audit events" value={dashboard.totals.auditEvents} Icon={LockKeyhole} /></section><section className="action-strip">{actions.map((action) => <button type="button" key={action.label} onClick={() => setActive(action.key)}>{action.label}</button>)}</section><section className="work-grid"><Workspace dashboard={dashboard} active={active} /><DataTable title="Communication Center" rows={["Targeted notices", "Attendance alerts", "Fee reminders", "Report publication"]} icon={Mail} />{dashboard.role !== "Parent" && dashboard.role !== "Learner" && <DataTable title="Operations Queue" rows={["Pending approvals", "Follow-up tasks", "Imports", "Exports"]} icon={SlidersHorizontal} />}</section></section></main>;
}

export default function App({ initialDashboard }: AppProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboard ?? null);
  const [error, setError] = useState("");

  useEffect(() => {
    setDashboard(initialDashboard ?? null);
  }, [initialDashboard]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const session = await login(email, password);
      setDashboard(await getDashboard(session.sessionId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed");
    }
  };

  if (dashboard) return <DashboardView dashboard={dashboard} />;
  return <main className="login-screen"><section className="login-card" aria-labelledby="login-title"><div className="brand-mark"><GraduationCap size={34} /></div><p>Secure access</p><h1 id="login-title">{productName}</h1><form onSubmit={submit}><label>Email<input aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" /></label><label>Password<input aria-label="Password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button type="submit"><LockKeyhole size={18} />Sign in</button></form></section></main>;
}





