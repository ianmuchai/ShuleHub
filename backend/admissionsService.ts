import { randomUUID } from "node:crypto";
import { appendAudit } from "./audit";
import { AppError } from "./errors";
import { requirePermission } from "./security";
import { getClassStream } from "./schoolService";
import { store } from "./store";
import { AdmitApplicationInput, LearnerProfile, ParentLearnerSummary } from "./types";

export const admitApplication = (sessionId: string, input: AdmitApplicationInput): LearnerProfile => {
  const context = requirePermission(sessionId, "admissions:manage");
  const application = store.applications.find((candidate) => candidate.id === input.applicationId);
  if (!application) {
    throw new AppError("Application was not found", 404, "APPLICATION_NOT_FOUND");
  }

  if (application.status === "admitted") {
    throw new AppError("Application is already admitted", 409, "APPLICATION_ALREADY_ADMITTED");
  }

  if (!getClassStream(input.classStreamId)) {
    throw new AppError("Class stream was not found", 404, "CLASS_STREAM_NOT_FOUND");
  }

  if (store.learners.some((learner) => learner.admissionNumber === input.admissionNumber)) {
    throw new AppError("Admission number already exists", 409, "ADMISSION_NUMBER_EXISTS");
  }

  const learner: LearnerProfile = {
    id: randomUUID(),
    admissionNumber: input.admissionNumber,
    firstName: application.learnerFirstName,
    lastName: application.learnerLastName,
    classStreamId: input.classStreamId,
    status: "active",
  };

  store.learners.push(learner);
  store.guardianLearners.push({
    guardianProfileId: application.guardianProfileId,
    learnerId: learner.id,
    relationship: "Guardian",
  });
  store.placementHistory.push({
    id: randomUUID(),
    learnerId: learner.id,
    classStreamId: input.classStreamId,
    startedAt: new Date().toISOString().slice(0, 10),
  });
  application.status = "admitted";

  appendAudit({
    actorUserId: context.user.id,
    action: "admissions.admit",
    entityType: "LearnerProfile",
    entityId: learner.id,
    summary: `Admitted ${learner.firstName} ${learner.lastName}`,
  });

  return learner;
};

export const getParentLearnerSummary = (sessionId: string): ParentLearnerSummary[] => {
  const context = requirePermission(sessionId, "learner:linked:read");
  const guardianProfileId = context.user.guardianProfileId;
  if (!guardianProfileId) {
    return [];
  }

  const linkedLearnerIds = new Set(
    store.guardianLearners.filter((link) => link.guardianProfileId === guardianProfileId).map((link) => link.learnerId),
  );

  return store.learners
    .filter((learner) => linkedLearnerIds.has(learner.id))
    .map((learner) => {
      const attendance = store.attendance.filter((record) => record.learnerId === learner.id);
      const attended = attendance.filter((record) => record.status === "present" || record.status === "late").length;
      const openInvoices = store.invoices.filter((invoice) => invoice.learnerId === learner.id && invoice.status !== "cancelled");
      return {
        learner,
        classStream: getClassStream(learner.classStreamId),
        attendanceRate: attendance.length === 0 ? 100 : Math.round((attended / attendance.length) * 100),
        balance: openInvoices.reduce((sum, invoice) => sum + invoice.balance, 0),
      };
    });
};
