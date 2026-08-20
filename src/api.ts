export type LoginResponse = {
  sessionId: string;
  activeRole: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
  };
};

export type Dashboard = {
  role: string;
  user: { id: string; name: string; email: string; roles?: string[] };
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
  const contentType = response.headers?.get("content-type") ?? "";
  const canReadJson = typeof response.json === "function";
  const canReadText = typeof response.text === "function";
  const body = contentType.includes("application/json") || (canReadJson && !canReadText)
    ? await response.json()
    : canReadText
      ? await response.text()
      : null;
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body
      ? (body as { error?: { message?: string } }).error?.message
      : typeof body === "string" && body.trim()
        ? `API request failed (${response.status}): ${body.slice(0, 160)}`
        : `API request failed (${response.status})`;
    throw new Error(message ?? "Request failed");
  }
  if (typeof body === "string") {
    throw new Error(`API request failed (${response.status}): Expected JSON response`);
  }
  return body;
};

export const login = (email: string, password: string, selectedRole: string) =>
  api<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, selectedRole }),
  });

export const switchRole = (sessionId: string, selectedRole: string) =>
  api<LoginResponse>("/api/auth/switch-role", {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionId}` },
    body: JSON.stringify({ selectedRole }),
  });

export const getDashboard = (sessionId: string) =>
  api<Dashboard>("/api/dashboard", {
    headers: { Authorization: `Bearer ${sessionId}` },
  });
