import { randomUUID } from "node:crypto";
import { appendAudit } from "./audit";
import { AppError } from "./errors";
import { requirePermission } from "./security";
import { getClassStream } from "./schoolService";
import { store } from "./store";
import { AttendanceRecord, MarkAttendanceInput } from "./types";

export const markAttendance = (sessionId: string, input: MarkAttendanceInput): AttendanceRecord[] => {
  const context = requirePermission(sessionId, "attendance:mark");
  const classStream = getClassStream(input.classStreamId);
  if (!classStream || classStream.teacherUserId !== context.user.id) {
    throw new AppError("Teacher is not assigned to this class", 403, "TEACHER_NOT_ASSIGNED");
  }

  const classLearnerIds = new Set(store.learners.filter((learner) => learner.classStreamId === input.classStreamId).map((learner) => learner.id));
  const records = input.records.map((record) => {
    if (!classLearnerIds.has(record.learnerId)) {
      throw new AppError("Learner is not in this class", 400, "LEARNER_NOT_IN_CLASS");
    }

    return {
      id: randomUUID(),
      learnerId: record.learnerId,
      classStreamId: input.classStreamId,
      date: input.date,
      status: record.status,
      markedByUserId: context.user.id,
    };
  });

  store.attendance.push(...records);
  appendAudit({
    actorUserId: context.user.id,
    action: "attendance.mark",
    entityType: "ClassStream",
    entityId: input.classStreamId,
    summary: `Marked attendance for ${records.length} learner(s) on ${input.date}`,
  });

  return records;
};
