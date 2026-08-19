import { beforeEach, describe, expect, test } from "vitest";
import { admitApplication, getParentLearnerSummary } from "./admissionsService";
import { createSession } from "./security";
import { markAttendance } from "./attendanceService";
import { resetStore, store } from "./store";

describe("school flows", () => {
  beforeEach(() => resetStore());

  test("admitting an application creates learner, guardian link, placement history, and audit", async () => {
    const admin = await createSession("admissions@demo.school", "AdmissionsPass123!");
    const learner = admitApplication(admin.sessionId, {
      applicationId: "app-001",
      admissionNumber: "ADM-2026-001",
      classStreamId: "stream-grade-4-east",
    });

    const parent = await createSession("parent@demo.school", "ParentPass123!");
    const summary = getParentLearnerSummary(parent.sessionId);

    expect(learner.admissionNumber).toBe("ADM-2026-001");
    expect(summary.some((item) => item.learner.id === learner.id)).toBe(true);
    expect(store.placementHistory.some((placement) => placement.learnerId === learner.id)).toBe(true);
    expect(store.auditLogs.some((log) => log.action === "admissions.admit")).toBe(true);
  });

  test("teacher cannot mark attendance for an unassigned class", async () => {
    const teacher = await createSession("teacher@demo.school", "TeacherPass123!");
    expect(() =>
      markAttendance(teacher.sessionId, {
        classStreamId: "stream-unassigned",
        date: "2026-08-19",
        records: [],
      }),
    ).toThrow("Teacher is not assigned to this class");
  });
});
