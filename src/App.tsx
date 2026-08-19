import { FormEvent, useMemo, useState } from "react";
import { Banknote, BookOpen, CalendarCheck, GraduationCap, LockKeyhole, ReceiptText, ShieldCheck, UsersRound } from "lucide-react";
import { Dashboard, getDashboard, login } from "./api";
import "./styles.css";

const demoAccounts = [
  ["Super Admin", "admin@demo.school", "AdminPass123!"],
  ["Admissions", "admissions@demo.school", "AdmissionsPass123!"],
  ["Finance", "finance@demo.school", "FinancePass123!"],
  ["Teacher", "teacher@demo.school", "TeacherPass123!"],
  ["Parent", "parent@demo.school", "ParentPass123!"],
];

const formatKes = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof UsersRound }) {
  return (
    <article className="metric">
      <Icon aria-hidden="true" size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  const workQueue = useMemo(() => {
    if (dashboard.role === "Parent") return ["Review balances", "Check attendance", "Open receipts"];
    if (dashboard.role === "Teacher") return ["Mark attendance", "Review class list", "Prepare assessment entries"];
    if (dashboard.role === "Finance Officer") return ["Review arrears", "Reconcile M-Pesa", "Issue receipts"];
    if (dashboard.role === "Admissions Officer") return ["Review applications", "Admit learners", "Confirm guardian links"];
    return ["Configure school", "Review audit", "Monitor integrations"];
  }, [dashboard.role]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{dashboard.role}</p>
          <h1>Kenyan School Management System</h1>
        </div>
        <div className="secure-badge"><ShieldCheck size={18} /> Server-side RBAC active</div>
      </header>

      <section className="metrics" aria-label="Operational metrics">
        <Metric label="Learners" value={dashboard.totals.learners} icon={GraduationCap} />
        <Metric label="Guardians" value={dashboard.totals.guardians} icon={UsersRound} />
        <Metric label="Open balance" value={formatKes(dashboard.totals.openBalance)} icon={Banknote} />
        <Metric label="Audit events" value={dashboard.totals.auditEvents} icon={LockKeyhole} />
      </section>

      <section className="workspace">
        <div className="panel primary-panel">
          <div className="panel-title">
            <CalendarCheck size={20} />
            <h2>Today</h2>
          </div>
          <div className="task-list">
            {workQueue.map((task) => <button key={task} type="button">{task}</button>)}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <BookOpen size={20} />
            <h2>Classes</h2>
          </div>
          {dashboard.classes.map((schoolClass) => (
            <div className="row" key={schoolClass.id}>
              <span>{schoolClass.gradeName} {schoolClass.streamName}</span>
              <strong>{schoolClass.learners} learners</strong>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">
            <ReceiptText size={20} />
            <h2>Parent Linked Learners</h2>
          </div>
          {dashboard.parentLearners.length === 0 ? (
            <p className="readable-note">No guardian-linked learner records for this role.</p>
          ) : dashboard.parentLearners.map((item) => (
            <div className="row" key={item.learner.id}>
              <span>{item.learner.firstName} {item.learner.lastName}</span>
              <strong>{formatKes(item.balance)}</strong>
            </div>
          ))}
        </div>

        <div className="panel audit-panel">
          <div className="panel-title">
            <ShieldCheck size={20} />
            <h2>Audit Trail</h2>
          </div>
          {dashboard.recentAudit.map((event) => (
            <div className="audit-row" key={event.id}>
              <strong>{event.action}</strong>
              <span>{event.summary}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [email, setEmail] = useState("admin@demo.school");
  const [password, setPassword] = useState("AdminPass123!");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
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
        <p className="eyebrow">Secure school operations</p>
        <h1 id="login-title">Kenyan School Management System</h1>
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
