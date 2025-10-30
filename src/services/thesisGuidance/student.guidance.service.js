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

import prisma from "../../config/prisma.js";
// Replace WebSocket realtime with FCM push notifications
import { sendFcmToUsers } from "../../services/push.service.js";
import { createNotificationsForUsers } from "../notification.service.js";
import fs from "fs";
import path from "path";
import { promisify } from "util";
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

async function ensureThesisAcademicYear(thesis) {
  if (thesis.academicYearId) return thesis;
  // Try to attach current academic year based on date window, else latest by year
  const now = new Date();
  const current = await prisma.academicYear.findFirst({
    where: {
      OR: [
        { AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }] },
        // fallback: any with startDate <= now or endDate >= now
        { startDate: { lte: now } },
        { endDate: { gte: now } },
      ],
    },
    orderBy: [
      { year: "desc" },
      { startDate: "desc" },
    ],
  });
  if (current) {
    await prisma.thesis.update({ where: { id: thesis.id }, data: { academicYearId: current.id } });
    return { ...thesis, academicYearId: current.id };
  }
  return thesis;
}

async function getOrCreateDocumentType(name = "Thesis") {
  let dt = await prisma.documentType.findFirst({ where: { name } });
  if (!dt) {
    dt = await prisma.documentType.create({ data: { name } });
  }
  return dt;
}

async function logThesisActivity(thesisId, userId, activity, notes) {
  try {
    await prisma.thesisActivityLog.create({
      data: {
        thesisId,
        userId,
        activity,
        notes: notes || "",
      },
    });
  } catch (e) {
    console.error("Failed to create thesis activity log:", e?.message || e);
  }
}

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
  const rows = await listGuidancesForThesis(thesis.id, status);
  // Defensive: ensure newest-first by schedule date on the service layer as well
  rows.sort((a, b) => {
    const at = a?.schedule?.guidanceDate ? new Date(a.schedule.guidanceDate).getTime() : 0;
    const bt = b?.schedule?.guidanceDate ? new Date(b.schedule.guidanceDate).getTime() : 0;
    if (bt !== at) return bt - at;
    // tie-breaker by id desc
    return String(b.id).localeCompare(String(a.id));
  });
  const items = rows.map((g) => ({
    id: g.id,
    status: g.status,
    scheduledAt: g?.schedule?.guidanceDate || null,
    schedule: g?.schedule
      ? { id: g.schedule.id, guidanceDate: g.schedule.guidanceDate }
      : null,
    supervisorId: g.supervisorId || null,
    supervisorName: g?.supervisor?.user?.fullName || null,
  }));
  // attach thesis document (same for all rows)
  let doc = null;
  try {
    const t = await prisma.thesis.findUnique({ where: { id: thesis.id }, include: { document: true } });
    if (t?.document) {
      doc = {
        id: t.document.id,
        fileName: t.document.fileName,
        filePath: t.document.filePath, // relative path served under /uploads
      };
    }
  } catch (e) {
    console.warn("Failed to load thesis document:", e?.message || e);
  }
  const withDoc = items.map((it) => ({ ...it, document: doc }));
  return { count: withDoc.length, items: withDoc };
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
  const flat = {
    id: guidance.id,
    status: guidance.status,
    scheduledAt: guidance?.schedule?.guidanceDate || null,
    schedule: guidance?.schedule
      ? { id: guidance.schedule.id, guidanceDate: guidance.schedule.guidanceDate }
      : null,
    supervisorId: guidance.supervisorId || null,
    supervisorName: guidance?.supervisor?.user?.fullName || null,
    meetingUrl: guidance.meetingUrl || null,
    notes: guidance.studentNotes || null,
    supervisorFeedback: guidance.supervisorFeedback || null,
  };
  // attach thesis document
  try {
    const t = await prisma.thesis.findUnique({ where: { id: guidance.thesisId }, include: { document: true } });
    if (t?.document) {
      flat.document = {
        id: t.document.id,
        fileName: t.document.fileName,
        filePath: t.document.filePath,
      };
    }
  } catch {}
  return { guidance: flat };
}

export async function requestGuidanceService(userId, guidanceDate, studentNotes, file, meetingUrl, supervisorId) {
  let { thesis } = await getActiveThesisOrThrow(userId);
  // make sure academic year is set when possible
  thesis = await ensureThesisAcademicYear(thesis);
  const supervisors = await getSupervisorsForThesis(thesis.id);
  // prefer provided supervisor, else pembimbing1, then pembimbing2
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
  const sup1 = supervisors.find((p) => norm(p.role?.name) === "pembimbing1");
  const sup2 = supervisors.find((p) => norm(p.role?.name) === "pembimbing2");
  let selectedSupervisorId = supervisorId || null;
  if (selectedSupervisorId) {
    const allowed = supervisors.some((s) => s.lecturerId === selectedSupervisorId);
    if (!allowed) {
      const err = new Error("Invalid supervisorId for this thesis");
      err.statusCode = 400;
      throw err;
    }
  } else {
    selectedSupervisorId = sup1?.lecturerId || sup2?.lecturerId || null;
  }
  if (!selectedSupervisorId) {
    const err = new Error("No supervisor assigned to this thesis");
    err.statusCode = 400;
    throw err;
  }

  const schedule = await createGuidanceSchedule(guidanceDate);
  const created = await createGuidance({
    thesisId: thesis.id,
    scheduleId: schedule.id,
    supervisorId: selectedSupervisorId,
    studentNotes: studentNotes || `Request guidance on ${guidanceDate.toISOString()}`,
    supervisorFeedback: "",
    meetingUrl: meetingUrl || "",
    status: "scheduled",
  });

  await logThesisActivity(thesis.id, userId, "request-guidance", `Requested at ${guidanceDate.toISOString()}`);

  // Persist notifications for all supervisors and the student
  try {
    const supervisorsUserIds = supervisors.map((p) => p?.lecturer?.user?.id).filter(Boolean);
    const dateStr = guidanceDate instanceof Date ? guidanceDate.toISOString() : String(guidanceDate);
    await createNotificationsForUsers(supervisorsUserIds, {
      title: "Permintaan bimbingan baru",
      message: `Mahasiswa mengajukan bimbingan. Jadwal: ${dateStr}`,
    });
  } catch (e) {
    console.warn("Notify (DB) failed (guidance request):", e?.message || e);
  }

  // Push realtime via FCM to all supervisors and the student
  try {
    const supUserIds = supervisors.map((p) => p?.lecturer?.user?.id).filter(Boolean);
    console.log(`[Guidance] Sending FCM requested -> supervisors=${supUserIds.join(',')} guidanceId=${created.id}`);
    const data = {
      type: "thesis-guidance:requested",
      role: "supervisor",
      guidanceId: String(created.id),
      thesisId: String(thesis.id),
      scheduledAt: schedule?.guidanceDate ? new Date(schedule.guidanceDate).toISOString() : "",
      supervisorId: String(selectedSupervisorId),
      playSound: "true",
    };
    await sendFcmToUsers(supUserIds, {
      title: "Permintaan bimbingan baru",
      body: "Mahasiswa mengajukan bimbingan",
      data,
      dataOnly: true,
    });
  } catch (e) {
    console.warn("FCM notify failed (guidance request):", e?.message || e);
  }

  // If a thesis file was uploaded, persist it and attach as a Document linked to the thesis
  if (file && file.buffer) {
    try {
      const uploadsRoot = path.join(process.cwd(), "uploads", "thesis", thesis.id);
      await mkdir(uploadsRoot, { recursive: true });
      const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const filePath = path.join(uploadsRoot, safeName);
      await writeFile(filePath, file.buffer);

      // store relative path in DB (web servers may serve /uploads)
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

      const docType = await getOrCreateDocumentType("Thesis");
      const doc = await prisma.document.create({
        data: {
          userId: userId,
          documentTypeId: docType.id,
          filePath: relPath,
          fileName: file.originalname,
        },
      });

      // attach document to thesis (do not change schema; update thesis.documentId)
      await prisma.thesis.update({ where: { id: thesis.id }, data: { documentId: doc.id } });

      await logThesisActivity(thesis.id, userId, "upload-thesis-document", `Uploaded ${file.originalname}`);
    } catch (err) {
      // don't fail the whole request if file storage fails; log then continue
      console.error("Failed to store uploaded thesis file:", err.message || err);
    }
  }

  // Return a flat guidance object consistent with other endpoints
  const supMap = new Map(supervisors.map((p) => [p.lecturerId, p]));
  const sup = supMap.get(selectedSupervisorId);
  const flat = {
    id: created.id,
    status: created.status,
    scheduledAt: schedule?.guidanceDate || null,
    scheduleId: schedule?.id || null,
    schedule: schedule ? { id: schedule.id, guidanceDate: schedule.guidanceDate } : null,
    supervisorId: created.supervisorId || null,
    supervisorName: sup?.lecturer?.user?.fullName || null,
    meetingUrl: created.meetingUrl || null,
    notes: created.studentNotes || null,
    supervisorFeedback: created.supervisorFeedback || null,
  };
  return { guidance: flat };
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
    studentNotes: studentNotes || guidance.studentNotes || "",
    supervisorFeedback: "", // back to pending
  });
  await logThesisActivity(guidance.thesisId, userId, "reschedule-guidance", `New date ${guidanceDate.toISOString()}`);
  // Persist notifications
  try {
    const supervisors = await getSupervisorsForThesis(guidance.thesisId);
    const supervisorsUserIds = supervisors.map((p) => p?.lecturer?.user?.id).filter(Boolean);
    const dateStr = guidanceDate instanceof Date ? guidanceDate.toISOString() : String(guidanceDate);
    await createNotificationsForUsers(supervisorsUserIds, {
      title: "Jadwal bimbingan dijadwalkan ulang",
      message: `Mahasiswa menjadwalkan ulang bimbingan ke ${dateStr}`,
    });
    await createNotificationsForUsers([userId], {
      title: "Bimbingan dijadwalkan ulang",
      message: `Jadwal baru: ${dateStr}`,
    });
  } catch (e) {
    console.warn("Notify (DB) failed (reschedule):", e?.message || e);
  }
  // FCM notify all supervisors + student
  try {
    const supervisors = await getSupervisorsForThesis(guidance.thesisId);
    const supUserIds = supervisors.map((p) => p?.lecturer?.user?.id).filter(Boolean);
    const data = {
      type: "thesis-guidance:rescheduled",
      role: "supervisor",
      guidanceId: String(guidance.id),
      thesisId: String(guidance.thesisId),
      scheduledAt: new Date(guidanceDate).toISOString(),
    };
    await sendFcmToUsers(supUserIds, { title: "Jadwal bimbingan diubah", body: "Jadwal baru tersedia", data });
    await sendFcmToUsers([userId], { title: "Bimbingan dijadwalkan ulang", body: "Jadwal baru tersedia", data: { ...data, role: "student" } });
  } catch (e) {
    console.warn("FCM notify failed (guidance reschedule):", e?.message || e);
  }
  const flat = {
    id: updated.id,
    status: updated.status,
    scheduledAt: updated?.schedule?.guidanceDate || null,
    schedule: updated?.schedule
      ? { id: updated.schedule.id, guidanceDate: updated.schedule.guidanceDate }
      : null,
    supervisorId: updated.supervisorId || null,
    supervisorName: null,
    meetingUrl: updated.meetingUrl || null,
    notes: updated.studentNotes || null,
    supervisorFeedback: updated.supervisorFeedback || null,
  };
  return { guidance: flat };
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
  const updated = await updateGuidanceById(guidance.id, { status: "cancelled", studentNotes: reason || guidance.studentNotes || "" });
  await logThesisActivity(guidance.thesisId, userId, "cancel-guidance", reason || "");
  // Persist notifications
  try {
    const supervisors = await getSupervisorsForThesis(guidance.thesisId);
    const supervisorsUserIds = supervisors.map((p) => p?.lecturer?.user?.id).filter(Boolean);
    await createNotificationsForUsers(supervisorsUserIds, {
      title: "Bimbingan dibatalkan",
      message: `Mahasiswa membatalkan bimbingan. Alasan: ${reason || "-"}`,
    });
    await createNotificationsForUsers([userId], {
      title: "Bimbingan dibatalkan",
      message: `Pengajuan bimbingan dibatalkan. ${reason ? "Alasan: " + reason : ""}`,
    });
  } catch (e) {
    console.warn("Notify (DB) failed (cancel):", e?.message || e);
  }
  // FCM notify all supervisors + student
  try {
    const supervisors = await getSupervisorsForThesis(guidance.thesisId);
    const supUserIds = supervisors.map((p) => p?.lecturer?.user?.id).filter(Boolean);
    const data = {
      type: "thesis-guidance:cancelled",
      role: "supervisor",
      guidanceId: String(guidance.id),
      thesisId: String(guidance.thesisId),
      reason: String(reason || ""),
    };
    await sendFcmToUsers(supUserIds, { title: "Bimbingan dibatalkan", body: reason || "", data });
    await sendFcmToUsers([userId], { title: "Bimbingan dibatalkan", body: reason || "", data: { ...data, role: "student" } });
  } catch (e) {
    console.warn("FCM notify failed (guidance cancel):", e?.message || e);
  }
  const flat = {
    id: updated.id,
    status: updated.status,
    scheduledAt: updated?.schedule?.guidanceDate || null,
    schedule: updated?.schedule
      ? { id: updated.schedule.id, guidanceDate: updated.schedule.guidanceDate }
      : null,
    supervisorId: updated.supervisorId || null,
    supervisorName: null,
    meetingUrl: updated.meetingUrl || null,
    notes: updated.studentNotes || null,
    supervisorFeedback: updated.supervisorFeedback || null,
  };
  return { guidance: flat };
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
  const updated = await updateGuidanceById(guidance.id, { studentNotes: studentNotes || "" });
  await logThesisActivity(guidance.thesisId, userId, "update-student-notes", studentNotes || "");
  // Persist notifications
  try {
    const supervisors = await getSupervisorsForThesis(guidance.thesisId);
    const supervisorsUserIds = supervisors.map((p) => p?.lecturer?.user?.id).filter(Boolean);
    const preview = (studentNotes || "").slice(0, 120);
    await createNotificationsForUsers(supervisorsUserIds, {
      title: "Catatan mahasiswa diperbarui",
      message: preview ? `Catatan baru: ${preview}` : "Catatan mahasiswa diperbarui",
    });
    await createNotificationsForUsers([userId], {
      title: "Catatan diperbarui",
      message: preview ? `Catatan: ${preview}` : "Catatan diperbarui",
    });
  } catch (e) {
    console.warn("Notify (DB) failed (notes updated):", e?.message || e);
  }
  // FCM notify all supervisors + student
  try {
    const supervisors = await getSupervisorsForThesis(guidance.thesisId);
    const supUserIds = supervisors.map((p) => p?.lecturer?.user?.id).filter(Boolean);
    const data = {
      type: "thesis-guidance:notes-updated",
      role: "supervisor",
      guidanceId: String(guidance.id),
      thesisId: String(guidance.thesisId),
      notes: String(studentNotes || ""),
    };
    await sendFcmToUsers(supUserIds, { title: "Catatan mahasiswa diperbarui", body: studentNotes || "", data });
    await sendFcmToUsers([userId], { title: "Catatan diperbarui", body: studentNotes || "", data: { ...data, role: "student" } });
  } catch (e) {
    console.warn("FCM notify failed (notes updated):", e?.message || e);
  }
  const flat = {
    id: updated.id,
    status: updated.status,
    scheduledAt: updated?.schedule?.guidanceDate || null,
    schedule: updated?.schedule
      ? { id: updated.schedule.id, guidanceDate: updated.schedule.guidanceDate }
      : null,
    supervisorId: updated.supervisorId || null,
    supervisorName: null,
    meetingUrl: updated.meetingUrl || null,
    notes: updated.studentNotes || null,
    supervisorFeedback: updated.supervisorFeedback || null,
  };
  return { guidance: flat };
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
  const rows = await listGuidanceHistoryByStudent(student.id);
  const items = rows.map((g) => ({
    id: g.id,
    status: g.status,
    scheduledAt: g?.schedule?.guidanceDate || null,
    schedule: g?.schedule
      ? { id: g.schedule.id, guidanceDate: g.schedule.guidanceDate }
      : null,
    supervisorId: g.supervisorId || null,
    supervisorName: g?.supervisor?.user?.fullName || null,
  }));
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
    id: p.lecturerId,
    name: p.lecturer?.user?.fullName || null,
    email: p.lecturer?.user?.email || null,
    role: p.role?.name || null,
  }));
  return { thesisId: thesis.id, supervisors };
}
