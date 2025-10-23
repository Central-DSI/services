import {
  getStudentByUserId,
  getActiveThesisForStudent,
  getSupervisorsForThesis,
  listGuidancesForThesis,
  getGuidanceByIdForStudent,
  createGuidanceSchedule,
  createGuidance,
  updateGuidanceScheduleDate,
  updateGuidanceById,
  listActivityLogsByStudent,
  listGuidanceHistoryByStudent,
  listProgressComponents,
  getCompletionsForThesis,
  upsertStudentCompletions,
} from "../../repositories/thesisGuidance/student.guidance.repository.js";

function ensureStudent(student) {
  if (!student) {
    const err = new Error("Student profile not found for this user");
    err.statusCode = 404;
    throw err;
  }
}

async function getActiveThesisOrThrow(userId) {
  const student = await getStudentByUserId(userId);
  ensureStudent(student);
  const thesis = await getActiveThesisForStudent(student.id);
  if (!thesis) {
    const err = new Error("Active thesis not found for this student");
    err.statusCode = 404;
    throw err;
  }
  return { student, thesis };
}

export async function listMyGuidancesService(userId, status) {
  const { thesis } = await getActiveThesisOrThrow(userId);
  const items = await listGuidancesForThesis(thesis.id, status);
  return { count: items.length, items };
}

export async function getGuidanceDetailService(userId, guidanceId) {
  const student = await getStudentByUserId(userId);
  ensureStudent(student);
  const guidance = await getGuidanceByIdForStudent(guidanceId, student.id);
  if (!guidance) {
    const err = new Error("Guidance not found for this student");
    err.statusCode = 404;
    throw err;
  }
  return { guidance };
}

export async function requestGuidanceService(userId, guidanceDate, studentNotes) {
  const { thesis } = await getActiveThesisOrThrow(userId);
  const supervisors = await getSupervisorsForThesis(thesis.id);
  // prefer pembimbing1 then pembimbing2
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
  const sup1 = supervisors.find((p) => norm(p.role?.name) === "pembimbing1");
  const sup2 = supervisors.find((p) => norm(p.role?.name) === "pembimbing2");
  const supervisorId = sup1?.lecturerId || sup2?.lecturerId || null;
  if (!supervisorId) {
    const err = new Error("No supervisor assigned to this thesis");
    err.statusCode = 400;
    throw err;
  }

  const schedule = await createGuidanceSchedule(guidanceDate);
  const created = await createGuidance({
    thesisId: thesis.id,
    scheduleId: schedule.id,
    supervisorId,
    studentNotes: studentNotes || `Request guidance on ${guidanceDate.toISOString()}`,
    supervisorFeedback: null,
    meetingUrl: null,
    status: "scheduled",
  });
  return { guidance: created };
}

export async function rescheduleGuidanceService(userId, guidanceId, guidanceDate, studentNotes) {
  const student = await getStudentByUserId(userId);
  ensureStudent(student);
  const guidance = await getGuidanceByIdForStudent(guidanceId, student.id);
  if (!guidance) {
    const err = new Error("Guidance not found for this student");
    err.statusCode = 404;
    throw err;
  }
  if (guidance.status === "completed" || guidance.status === "cancelled") {
    const err = new Error("Cannot reschedule a completed or cancelled guidance");
    err.statusCode = 400;
    throw err;
  }
  // update schedule date
  if (guidance.scheduleId) {
    await updateGuidanceScheduleDate(guidance.scheduleId, guidanceDate);
  } else {
    const schedule = await createGuidanceSchedule(guidanceDate);
    await updateGuidanceById(guidance.id, { scheduleId: schedule.id });
  }
  const updated = await updateGuidanceById(guidance.id, {
    studentNotes: studentNotes || guidance.studentNotes || null,
    supervisorFeedback: null, // back to pending
  });
  return { guidance: updated };
}

export async function cancelGuidanceService(userId, guidanceId, reason) {
  const student = await getStudentByUserId(userId);
  ensureStudent(student);
  const guidance = await getGuidanceByIdForStudent(guidanceId, student.id);
  if (!guidance) {
    const err = new Error("Guidance not found for this student");
    err.statusCode = 404;
    throw err;
  }
  if (guidance.status === "completed" || guidance.status === "cancelled") {
    const err = new Error("Cannot cancel this guidance");
    err.statusCode = 400;
    throw err;
  }
  const updated = await updateGuidanceById(guidance.id, { status: "cancelled", studentNotes: reason || guidance.studentNotes });
  return { guidance: updated };
}

export async function updateStudentNotesService(userId, guidanceId, studentNotes) {
  const student = await getStudentByUserId(userId);
  ensureStudent(student);
  const guidance = await getGuidanceByIdForStudent(guidanceId, student.id);
  if (!guidance) {
    const err = new Error("Guidance not found for this student");
    err.statusCode = 404;
    throw err;
  }
  const updated = await updateGuidanceById(guidance.id, { studentNotes });
  return { guidance: updated };
}

export async function getMyProgressService(userId) {
  const { thesis } = await getActiveThesisOrThrow(userId);
  const components = await listProgressComponents();
  const completions = await getCompletionsForThesis(thesis.id);
  const byComponent = new Map(completions.map((c) => [c.componentId, c]));
  const items = components.map((c) => ({
    componentId: c.id,
    name: c.name,
    description: c.description,
    completedAt: byComponent.get(c.id)?.completedAt || null,
    validatedBySupervisor: Boolean(byComponent.get(c.id)?.validatedBySupervisor),
  }));
  return { thesisId: thesis.id, components: items };
}

export async function completeProgressComponentsService(userId, componentIds, completedAt) {
  const { thesis } = await getActiveThesisOrThrow(userId);
  const result = await upsertStudentCompletions(thesis.id, componentIds, completedAt);
  return { thesisId: thesis.id, ...result };
}

export async function guidanceHistoryService(userId) {
  const student = await getStudentByUserId(userId);
  ensureStudent(student);
  const items = await listGuidanceHistoryByStudent(student.id);
  return { count: items.length, items };
}

export async function activityLogService(userId) {
  const student = await getStudentByUserId(userId);
  ensureStudent(student);
  const items = await listActivityLogsByStudent(student.id);
  return { count: items.length, items };
}

export async function listSupervisorsService(userId) {
  const { thesis } = await getActiveThesisOrThrow(userId);
  const parts = await getSupervisorsForThesis(thesis.id);
  const supervisors = parts.map((p) => ({
    lecturerId: p.lecturerId,
    role: p.role?.name || null,
    user: p.lecturer?.user || null,
  }));
  return { thesisId: thesis.id, supervisors };
}
