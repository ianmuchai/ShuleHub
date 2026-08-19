export type LoginResponse = {
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
  };
};

export type Dashboard = {
  role: string;
  user: { id: string; name: string; email: string };
  totals: {
    learners: number;
    guardians: number;
    invoices: number;
    openBalance: number;
    auditEvents: number;
  };
  integrations: Record<string, unknown>;
  parentLearners: Array<{
    learner: { id: string; firstName: string; lastName: string; admissionNumber: string };
    classStream?: { gradeName: string; streamName: string };
    attendanceRate: number;
    balance: number;
  }>;
  classes: Array<{ id: string; gradeName: string; streamName: string; learners: number }>;
  recentAudit: Array<{ id: string; action: string; summary: string; createdAt: string }>;
};

const api = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Request failed");
  }
  return body;
};

export const login = (email: string, password: string) =>
  api<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const getDashboard = (sessionId: string) =>
  api<Dashboard>("/api/dashboard", {
    headers: { Authorization: `Bearer ${sessionId}` },
  });
