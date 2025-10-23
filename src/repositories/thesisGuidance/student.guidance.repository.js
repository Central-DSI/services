import prisma from "../../config/prisma.js";

export function getStudentByUserId(userId) {
  return prisma.student.findUnique({ where: { userId } });
}

export async function getActiveThesisForStudent(studentId) {
  // Pick the most recent by startDate desc (fallback by id desc)
  const thesis = await prisma.thesis.findFirst({
    where: { studentId },
    orderBy: [
      { startDate: "desc" },
      { id: "desc" },
    ],
  });
  return thesis;
}

export async function getSupervisorsForThesis(thesisId) {
  const parts = await prisma.thesisParticipant.findMany({
    where: { thesisId, role: { name: { in: ["pembimbing1", "pembimbing2"] } } },
    include: {
      lecturer: { include: { user: { select: { id: true, fullName: true, email: true } } } },
      role: { select: { id: true, name: true } },
    },
  });
  return parts;
}

export function listGuidancesForThesis(thesisId, status) {
  const where = { thesisId };
  if (status) where.status = status;
  return prisma.thesisGuidance.findMany({
    where,
    include: { schedule: true, supervisor: { include: { user: true } } },
    orderBy: { id: "asc" },
  });
}

export function getGuidanceByIdForStudent(guidanceId, studentId) {
  return prisma.thesisGuidance.findFirst({
    where: { id: guidanceId, thesis: { studentId } },
    include: { schedule: true, supervisor: { include: { user: true } } },
  });
}

export function createGuidanceSchedule(guidanceDate) {
  return prisma.thesisGuidanceSchedule.create({ data: { guidanceDate } });
}

export function createGuidance(data) {
  return prisma.thesisGuidance.create({ data });
}

export function updateGuidanceScheduleDate(scheduleId, guidanceDate) {
  return prisma.thesisGuidanceSchedule.update({ where: { id: scheduleId }, data: { guidanceDate } });
}

export function updateGuidanceById(id, data) {
  return prisma.thesisGuidance.update({ where: { id }, data, include: { schedule: true } });
}

export function listActivityLogsByStudent(studentId) {
  return prisma.thesisActivityLog.findMany({ where: { thesis: { studentId } }, orderBy: { createdAt: "desc" } });
}

export function listGuidanceHistoryByStudent(studentId) {
  return prisma.thesisGuidance.findMany({
    where: { thesis: { studentId } },
    include: { schedule: true, supervisor: { include: { user: true } } },
    orderBy: { id: "asc" },
  });
}

export function listProgressComponents() {
  return prisma.thesisProgressComponent.findMany({ orderBy: { name: "asc" } });
}

export function getCompletionsForThesis(thesisId) {
  return prisma.thesisProgressCompletion.findMany({ where: { thesisId } });
}

export async function upsertStudentCompletions(thesisId, componentIds = [], completedAt = undefined) {
  if (!componentIds.length) return { updated: 0, created: 0 };
  const existing = await prisma.thesisProgressCompletion.findMany({
    where: { thesisId, componentId: { in: componentIds } },
    select: { id: true, componentId: true },
  });
  const existingSet = new Set(existing.map((e) => e.componentId));

  const toUpdateIds = existing.map((e) => e.id);
  const toCreate = componentIds.filter((cid) => !existingSet.has(cid));

  const when = completedAt || new Date();

  const [updateRes, createRes] = await prisma.$transaction([
    toUpdateIds.length
      ? prisma.thesisProgressCompletion.updateMany({
          where: { id: { in: toUpdateIds } },
          data: { completedAt: when }, // keep validatedBySupervisor as-is
        })
      : Promise.resolve({ count: 0 }),
    toCreate.length
      ? prisma.thesisProgressCompletion.createMany({
          data: toCreate.map((cid) => ({ thesisId, componentId: cid, completedAt: when })),
          skipDuplicates: true,
        })
      : Promise.resolve({ count: 0 }),
  ]);

  return { updated: updateRes.count || 0, created: createRes.count || 0 };
}
