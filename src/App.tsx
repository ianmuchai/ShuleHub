import { FormEvent, useMemo, useState } from "react";
import {
  Banknote,
  BookMarked,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Dashboard, getDashboard, login } from "./api";
import "./styles.css";

type AppProps = {
  initialDashboard?: Dashboard;
};

type WorkspaceKey = "overview" | "attendance" | "resources" | "library" | "finance" | "admissions" | "audit" | "admin";

type WorkspaceAction = {
  label: string;
  workspace: WorkspaceKey;
};

type NavItem = { key: WorkspaceKey; label: string; Icon: LucideIcon };

const productName = "ShuleHub";

const demoAccounts = [
  ["Super Admin", "admin@demo.school", "AdminPass123!"],
  ["Admissions", "admissions@demo.school", "AdmissionsPass123!"],
  ["Finance", "finance@demo.school", "FinancePass123!"],
  ["Teacher", "teacher@demo.school", "TeacherPass123!"],
  ["Parent", "parent@demo.school", "ParentPass123!"],
];

const libraryLoans = [
  { learnerId: "learner-001", title: "The River and the Source", code: "LIB-ENG-042", due: "26 Aug", status: "Due soon" },
  { learnerId: "learner-001", title: "Primary Science Atlas", code: "LIB-SCI-118", due: "02 Sep", status: "On loan" },
  { learnerId: "learner-002", title: "Kiswahili Fasaha", code: "LIB-KIS-031", due: "29 Aug", status: "On loan" },
];

const resources = [
  { title: "Grade 4 Mathematics Practice Pack", audience: "Parents, learners, teachers", area: "Mathematics", status: "Published" },
  { title: "CBC Environmental Activities Guide", audience: "Teachers", area: "Environmental Activities", status: "Staff only" },
  { title: "Reading Fluency Home Sheet", audience: "Parents and learners", area: "Literacy", status: "Published" },
  { title: "Assessment Evidence Upload Checklist", audience: "Teachers and academic leads", area: "Assessment", status: "Review" },
];

const formatKes = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);

const roleLabel = (role: string) => role === "Finance Officer" ? "Bursar" : role;

const actionsForRole = (role: string): WorkspaceAction[] => {
  if (role === "Parent") {
    return [
      { label: "Open resources", workspace: "resources" },
      { label: "View library books", workspace: "library" },
      { label: "Review fee statement", workspace: "finance" },
    ];
  }
  if (role === "Teacher") {
    return [
      { label: "Mark attendance", workspace: "attendance" },
      { label: "Open resources", workspace: "resources" },
      { label: "Review class list", workspace: "overview" },
    ];
  }
  if (role === "Finance Officer") {
    return [
      { label: "Review arrears", workspace: "finance" },
      { label: "Reconcile M-Pesa", workspace: "finance" },
      { label: "Issue receipts", workspace: "finance" },
    ];
  }
  if (role === "Admissions Officer") {
    return [
      { label: "Review applications", workspace: "admissions" },
      { label: "Admit learners", workspace: "admissions" },
      { label: "Confirm guardian links", workspace: "overview" },
    ];
  }
  return [
    { label: "Configure school", workspace: "admin" },
    { label: "Review audit", workspace: "audit" },
    { label: "Monitor integrations", workspace: "admin" },
  ];
};

function Metric({ label, value, icon: Icon, tone = "default" }: { label: string; value: string | number; icon: typeof UsersRound; tone?: string }) {
  return (
    <article className={`metric ${tone}`}>
      <Icon aria-hidden="true" size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function WorkspacePanel({ dashboard, activeWorkspace }: { dashboard: Dashboard; activeWorkspace: WorkspaceKey }) {
  const isAdmin = dashboard.role === "Super Admin" || dashboard.role === "School Admin";
  const learnerIds = dashboard.parentLearners.map((item) => item.learner.id);
  const visibleLoans = learnerIds.length === 0 ? libraryLoans.slice(0, 2) : libraryLoans.filter((loan) => learnerIds.includes(loan.learnerId));

  if (activeWorkspace === "resources") {
    return (
      <section className="work-panel" aria-labelledby="resources-title">
        <div className="section-heading"><BookMarked size={22} /><h2 id="resources-title">Learning Resources</h2></div>
        <div className="resource-grid">
          {resources.map((resource) => (
            <article className="resource-card" key={resource.title}>
              <span>{resource.area}</span>
              <h3>{resource.title}</h3>
              <p>{resource.audience}</p>
              <strong>{resource.status}</strong>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (activeWorkspace === "library") {
    return (
      <section className="work-panel" aria-labelledby="library-title">
        <div className="section-heading"><Library size={22} /><h2 id="library-title">Library Books</h2></div>
        {visibleLoans.map((loan) => (
          <div className="detail-row" key={loan.code}>
            <div><strong>{loan.title}</strong><span>{loan.code}</span></div>
            <div><strong>{loan.status}</strong><span>Due {loan.due}</span></div>
          </div>
        ))}
      </section>
    );
  }

  if (activeWorkspace === "finance") {
    return (
      <section className="work-panel" aria-labelledby="finance-title">
        <div className="section-heading"><ReceiptText size={22} /><h2 id="finance-title">Finance Workspace</h2></div>
        <div className="finance-strip">
          <span>Open balance</span><strong>{formatKes(dashboard.totals.openBalance)}</strong>
          <span>M-Pesa reconciliation</span><strong>{dashboard.totals.invoices} tracked invoices</strong>
        </div>
      </section>
    );
  }

  if (activeWorkspace === "attendance") {
    return (
      <section className="work-panel" aria-labelledby="attendance-title">
        <div className="section-heading"><ClipboardCheck size={22} /><h2 id="attendance-title">Attendance</h2></div>
        <div className="resource-grid compact">
          {dashboard.classes.map((schoolClass) => (
            <article className="resource-card" key={schoolClass.id}>
              <span>{schoolClass.gradeName}</span>
              <h3>{schoolClass.streamName}</h3>
              <p>{schoolClass.learners} learners ready for register marking.</p>
              <strong>Class register</strong>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (activeWorkspace === "admissions") {
    return (
      <section className="work-panel" aria-labelledby="admissions-title">
        <div className="section-heading"><FileText size={22} /><h2 id="admissions-title">Admissions Desk</h2></div>
        <div className="detail-row"><div><strong>Application review</strong><span>Document checks, interviews, offers</span></div><button type="button">Open queue</button></div>
        <div className="detail-row"><div><strong>Guardian records</strong><span>Contacts, pickup permissions, links</span></div><button type="button">Verify</button></div>
      </section>
    );
  }

  if (activeWorkspace === "audit") {
    return (
      <section className="work-panel" aria-labelledby="audit-title">
        <div className="section-heading"><ShieldCheck size={22} /><h2 id="audit-title">Audit Trail</h2></div>
        {dashboard.recentAudit.length === 0 ? <p className="readable-note">No recent audit events for this session.</p> : dashboard.recentAudit.map((event) => (
          <div className="audit-row" key={event.id}><strong>{event.action}</strong><span>{event.summary}</span></div>
        ))}
      </section>
    );
  }

  if (activeWorkspace === "admin" && isAdmin) {
    return (
      <section className="work-panel" aria-labelledby="admin-title">
        <div className="section-heading"><UserCog size={22} /><h2 id="admin-title">System Controls</h2></div>
        <div className="admin-grid">
          <button type="button"><SlidersHorizontal size={18} /> Role and permission matrix</button>
          <button type="button"><ShieldCheck size={18} /> Audit export controls</button>
          <button type="button"><Banknote size={18} /> Integration credentials</button>
          <button type="button"><GraduationCap size={18} /> Academic structure</button>
        </div>
      </section>
    );
  }

  return (
    <section className="work-panel" aria-labelledby="overview-title">
      <div className="section-heading"><LayoutDashboard size={22} /><h2 id="overview-title">Role Overview</h2></div>
      <div className="overview-grid">
        <article><strong>{roleLabel(dashboard.role)} workspace</strong><span>Personalized controls for the signed-in user.</span></article>
        <article><strong>{dashboard.totals.learners} learners</strong><span>Active records with linked guardians and class placement.</span></article>
        <article><strong>{dashboard.classes.length} class streams</strong><span>Teacher assignment and attendance-ready registers.</span></article>
      </div>
    </section>
  );
}

function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  const isAdmin = dashboard.role === "Super Admin" || dashboard.role === "School Admin";
  const defaultWorkspace: WorkspaceKey = isAdmin ? "admin" : "overview";
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>(defaultWorkspace);
  const actions = useMemo(() => actionsForRole(dashboard.role), [dashboard.role]);
  const navItems: NavItem[] = [
    { key: "overview", label: "Overview", Icon: LayoutDashboard },
    { key: "resources", label: "Resources", Icon: BookMarked },
    { key: "library", label: "Library", Icon: Library },
    { key: "finance", label: dashboard.role === "Finance Officer" ? "Bursar" : "Finance", Icon: Banknote },
    { key: "attendance", label: "Attendance", Icon: ClipboardCheck },
    ...(isAdmin ? [
      { key: "admin" as const, label: "Admin", Icon: UserCog },
      { key: "audit" as const, label: "Audit", Icon: ShieldCheck },
    ] : []),
  ];

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="logo-lockup"><span>SH</span><strong>{productName}</strong></div>
        <nav>
          {navItems.map(({ key, label, Icon }) => (
            <button className={activeWorkspace === key ? "active" : ""} key={key} type="button" onClick={() => setActiveWorkspace(key)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">{roleLabel(dashboard.role)}</p>
            <h1>{productName}</h1>
          </div>
          <div className="secure-badge"><ShieldCheck size={18} /> Protected workspace</div>
        </header>

        <section className="metrics" aria-label="Operational metrics">
          <Metric label="Learners" value={dashboard.totals.learners} icon={GraduationCap} tone="green" />
          <Metric label="Guardians" value={dashboard.totals.guardians} icon={UsersRound} tone="blue" />
          <Metric label="Open balance" value={formatKes(dashboard.totals.openBalance)} icon={Banknote} tone="gold" />
          <Metric label="Library loans" value={libraryLoans.length} icon={Library} tone="rose" />
        </section>

        <section className="workspace-layout">
          <div className="action-panel">
            <div className="section-heading"><CalendarCheck size={22} /><h2>Priority Actions</h2></div>
            <div className="task-list">
              {actions.map((action) => (
                <button key={action.label} type="button" onClick={() => setActiveWorkspace(action.workspace)}>
                  <span>{action.label}</span><ChevronRight size={18} />
                </button>
              ))}
            </div>
          </div>

          <WorkspacePanel dashboard={dashboard} activeWorkspace={activeWorkspace} />

          <section className="work-panel quick-panel" aria-labelledby="quick-resources-title">
            <div className="section-heading"><BookMarked size={22} /><h2 id="quick-resources-title">Resource Shelf</h2></div>
            <p className="panel-kicker">Learning Resources</p>
            {resources.slice(0, 3).map((resource) => (
              <div className="detail-row" key={resource.title}>
                <div><strong>{resource.title}</strong><span>{resource.area}</span></div>
                <div><strong>{resource.status}</strong><span>{resource.audience}</span></div>
              </div>
            ))}
          </section>

          <section className="work-panel quick-panel" aria-labelledby="quick-library-title">
            <div className="section-heading"><Library size={22} /><h2 id="quick-library-title">Library Books</h2></div>
            {libraryLoans.slice(0, 3).map((loan) => (
              <div className="detail-row" key={loan.code}>
                <div><strong>{loan.title}</strong><span>{loan.code}</span></div>
                <div><strong>{loan.status}</strong><span>Due {loan.due}</span></div>
              </div>
            ))}
          </section>
          <section className="work-panel people-panel" aria-label="Learners and classes">
            <div className="section-heading"><BookOpen size={22} /><h2>People And Classes</h2></div>
            {dashboard.parentLearners.map((item) => (
              <div className="detail-row" key={item.learner.id}>
                <div><strong>{item.learner.firstName} {item.learner.lastName}</strong><span>{item.learner.admissionNumber}</span></div>
                <div><strong>{item.attendanceRate}%</strong><span>{formatKes(item.balance)}</span></div>
              </div>
            ))}
            {dashboard.classes.map((schoolClass) => (
              <div className="detail-row" key={schoolClass.id}>
                <div><strong>{schoolClass.gradeName} {schoolClass.streamName}</strong><span>Assigned stream</span></div>
                <div><strong>{schoolClass.learners}</strong><span>learners</span></div>
              </div>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}

export default function App({ initialDashboard }: AppProps) {
  const [email, setEmail] = useState("admin@demo.school");
  const [password, setPassword] = useState("AdminPass123!");
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboard ?? null);
  const [error, setError] = useState("");

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

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark"><GraduationCap size={34} /></div>
        <p className="eyebrow">School operations platform</p>
        <h1 id="login-title">{productName}</h1>
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit"><LockKeyhole size={18} /> Sign in</button>
        </form>
        <div className="demo-list" aria-label="Demo accounts">
          {demoAccounts.map(([role, demoEmail, demoPassword]) => (
            <button key={role} type="button" onClick={() => { setEmail(demoEmail); setPassword(demoPassword); }}>
              <span>{role}</span>
              <strong>{demoEmail}</strong>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
