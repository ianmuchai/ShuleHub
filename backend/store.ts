import bcrypt from "bcryptjs";
import {
  Application,
  AttendanceRecord,
  AuditLog,
  Campus,
  ClassStream,
  GuardianLearner,
  GuardianProfile,
  Invoice,
  LearnerProfile,
  PaymentTransaction,
  PlacementHistory,
  Receipt,
  Role,
  Session,
  User,
} from "./types";

export type Store = {
  users: User[];
  roles: Role[];
  sessions: Session[];
  auditLogs: AuditLog[];
  campuses: Campus[];
  classStreams: ClassStream[];
  guardianProfiles: GuardianProfile[];
  learners: LearnerProfile[];
  guardianLearners: GuardianLearner[];
  placementHistory: PlacementHistory[];
  applications: Application[];
  attendance: AttendanceRecord[];
  invoices: Invoice[];
  paymentTransactions: PaymentTransaction[];
  receipts: Receipt[];
  paymentExceptions: PaymentTransaction[];
};

const hash = (password: string) => bcrypt.hashSync(password, 10);

const seed = (): Store => {
  const roles: Role[] = [
    {
      id: "role-super-admin",
      name: "Super Admin",
      permissions: ["school:manage", "admissions:manage", "attendance:mark", "finance:manage", "finance:view", "audit:read", "learner:linked:read"],
    },
    {
      id: "role-admissions",
      name: "Admissions Officer",
      permissions: ["admissions:manage", "school:manage"],
    },
    {
      id: "role-finance",
      name: "Finance Officer",
      permissions: ["finance:manage", "finance:view"],
    },
    {
      id: "role-teacher",
      name: "Teacher",
      permissions: ["attendance:mark"],
    },
    {
      id: "role-parent",
      name: "Parent",
      permissions: ["learner:linked:read", "finance:view"],
    },
    {
      id: "role-learner",
      name: "Learner",
      permissions: ["learner:linked:read"],
    },
  ];

  const users: User[] = [
    {
      id: "user-admin",
      email: "admin@demo.school",
      passwordHash: hash("AdminPass123!"),
      name: "Amina Principal",
      status: "active",
      roleIds: ["role-super-admin"],
    },
    {
      id: "user-admissions",
      email: "admissions@demo.school",
      passwordHash: hash("AdmissionsPass123!"),
      name: "Brian Registrar",
      status: "active",
      roleIds: ["role-admissions"],
    },
    {
      id: "user-finance",
      email: "finance@demo.school",
      passwordHash: hash("FinancePass123!"),
      name: "Carol Bursar",
      status: "active",
      roleIds: ["role-finance"],
    },
    {
      id: "user-teacher",
      email: "teacher@demo.school",
      passwordHash: hash("TeacherPass123!"),
      name: "David Class Teacher",
      status: "active",
      roleIds: ["role-teacher", "role-parent", "role-finance"],
      staffProfileId: "staff-teacher",
      guardianProfileId: "guardian-002",
    },
    {
      id: "user-parent",
      email: "parent@demo.school",
      passwordHash: hash("ParentPass123!"),
      name: "Esther Guardian",
      status: "active",
      roleIds: ["role-parent"],
      guardianProfileId: "guardian-001",
    },
  ];

  return {
    users,
    roles,
    sessions: [],
    auditLogs: [],
    campuses: [{ id: "campus-main", schoolId: "school-demo", name: "Main Campus" }],
    classStreams: [
      {
        id: "stream-grade-4-east",
        campusId: "campus-main",
        gradeName: "Grade 4",
        streamName: "East",
        teacherUserId: "user-teacher",
      },
    ],
    guardianProfiles: [
      { id: "guardian-001", userId: "user-parent", phoneNumber: "+254712345678" },
      { id: "guardian-002", userId: "user-teacher", phoneNumber: "+254722345678" },
    ],
    learners: [
      {
        id: "learner-001",
        admissionNumber: "ADM-2026-000",
        firstName: "Nia",
        lastName: "Wanjiku",
        classStreamId: "stream-grade-4-east",
        status: "active",
      },
    ],
    guardianLearners: [
      { guardianProfileId: "guardian-001", learnerId: "learner-001", relationship: "Mother" },
      { guardianProfileId: "guardian-002", learnerId: "learner-001", relationship: "Guardian" },
    ],
    placementHistory: [{ id: "placement-001", learnerId: "learner-001", classStreamId: "stream-grade-4-east", startedAt: "2026-01-05" }],
    applications: [
      {
        id: "app-001",
        learnerFirstName: "Imani",
        learnerLastName: "Otieno",
        guardianProfileId: "guardian-001",
        status: "submitted",
      },
    ],
    attendance: [],
    invoices: [],
    paymentTransactions: [],
    receipts: [],
    paymentExceptions: [],
  };
};

export let store = seed();

export const resetStore = () => {
  store = seed();
};

