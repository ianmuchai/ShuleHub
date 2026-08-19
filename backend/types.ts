export type MpesaEnvironment = "sandbox" | "production";

export type AppConfig = {
  port: number;
  sessionSecret: string;
  mpesa: {
    configured: boolean;
    environment: MpesaEnvironment;
    consumerKey?: string;
    consumerSecret?: string;
    shortcode?: string;
    passkey?: string;
    callbackUrl?: string;
  };
  notifications: {
    smsProvider?: string;
    smsApiKey?: string;
    whatsappProvider?: string;
    whatsappAccessToken?: string;
    emailProvider?: string;
    emailApiKey?: string;
  };
};

export type PermissionKey =
  | "school:manage"
  | "admissions:manage"
  | "attendance:mark"
  | "finance:manage"
  | "finance:view"
  | "learner:linked:read"
  | "audit:read";

export type RoleName =
  | "Super Admin"
  | "School Admin"
  | "Admissions Officer"
  | "Finance Officer"
  | "Teacher"
  | "Academic Lead"
  | "Parent";

export type UserStatus = "active" | "inactive";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  status: UserStatus;
  roleIds: string[];
  staffProfileId?: string;
  guardianProfileId?: string;
};

export type Role = {
  id: string;
  name: RoleName;
  permissions: PermissionKey[];
};

export type Session = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
};

export type SessionView = {
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles: RoleName[];
  };
};

export type UserContext = {
  user: User;
  roles: Role[];
  permissions: Set<PermissionKey>;
};

export type AuditInput = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
};

export type AuditLog = AuditInput & {
  id: string;
  createdAt: string;
};

export type School = {
  id: string;
  name: string;
};

export type Campus = {
  id: string;
  schoolId: string;
  name: string;
};

export type ClassStream = {
  id: string;
  campusId: string;
  gradeName: string;
  streamName: string;
  teacherUserId?: string;
};

export type GuardianProfile = {
  id: string;
  userId: string;
  phoneNumber: string;
};

export type LearnerProfile = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  classStreamId: string;
  status: "active" | "transferred" | "graduated";
};

export type GuardianLearner = {
  guardianProfileId: string;
  learnerId: string;
  relationship: string;
};

export type PlacementHistory = {
  id: string;
  learnerId: string;
  classStreamId: string;
  startedAt: string;
};

export type Application = {
  id: string;
  learnerFirstName: string;
  learnerLastName: string;
  guardianProfileId: string;
  status: "submitted" | "offered" | "admitted";
};

export type AttendanceRecord = {
  id: string;
  learnerId: string;
  classStreamId: string;
  date: string;
  status: "present" | "absent" | "late" | "excused" | "sick" | "school_activity";
  markedByUserId: string;
};

export type InvoiceLine = {
  id: string;
  description: string;
  amount: number;
};

export type Invoice = {
  id: string;
  learnerId: string;
  reference: string;
  dueDate: string;
  lines: InvoiceLine[];
  total: number;
  balance: number;
  status: "open" | "paid" | "cancelled";
};

export type PaymentTransaction = {
  id: string;
  invoiceId: string;
  checkoutRequestId: string;
  merchantRequestId: string;
  phoneNumber: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "exception";
  mpesaReceiptNumber?: string;
};

export type Receipt = {
  id: string;
  receiptNumber: string;
  learnerId: string;
  invoiceId: string;
  paymentTransactionId: string;
  amount: number;
  issuedAt: string;
};
