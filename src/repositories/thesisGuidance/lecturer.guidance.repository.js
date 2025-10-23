import prisma from "../../config/prisma.js";

// Helper to resolve lecturer by userId (JWT sub)
export async function getLecturerByUserId(userId) {
	return prisma.lecturer.findUnique({ where: { userId } });
}

// List students supervised by the lecturer via ThesisParticipant (SUPERVISOR_1/2)
export async function findMyStudents(lecturerId, roles) {
	const where = { lecturerId };
	if (Array.isArray(roles) && roles.length) {
		// Filter by role.name from UserRole
		where.role = { name: { in: roles } };
	}
	const participants = await prisma.thesisParticipant.findMany({
		where,
		include: {
			role: { select: { id: true, name: true } },
			thesis: {
				include: {
					student: {
						include: {
							user: { select: { id: true, fullName: true, email: true, identityNumber: true } },
						},
					},
				},
			},
		},
	});

	// Build unique students (supervised) to avoid duplicates caused by multiple theses/entries
	const seen = new Set();
	const result = [];
	for (const p of participants) {
		if (!p.thesis || !p.thesis.student) continue;
		const sid = p.thesis.student.id;
		if (seen.has(sid)) continue;
		seen.add(sid);
			result.push({
			thesisId: p.thesisId,
			thesisTitle: p.thesis?.title ?? null,
			studentId: sid,
			studentUser: p.thesis.student.user,
				role: p.role?.name || null,
		});
	}
	return result;
}

// List guidance requests assigned to this lecturer that are pending (scheduled without feedback)
export async function findGuidanceRequests(lecturerId) {
	return prisma.thesisGuidance.findMany({
		where: {
			supervisorId: lecturerId,
			status: "scheduled",
			supervisorFeedback: null,
		},
		orderBy: { id: "asc" },
		include: {
			thesis: {
				include: {
					student: { include: { user: true } },
				},
			},
			schedule: true,
		},
	});
}

export async function findGuidanceByIdForLecturer(guidanceId, lecturerId) {
	return prisma.thesisGuidance.findFirst({
		where: { id: guidanceId, supervisorId: lecturerId },
		include: { thesis: { include: { student: { include: { user: true } } } }, schedule: true },
	});
}

export async function approveGuidanceById(guidanceId, { feedback, meetingUrl } = {}) {
	return prisma.thesisGuidance.update({
		where: { id: guidanceId },
		data: {
			supervisorFeedback: feedback ?? "APPROVED",
			meetingUrl: meetingUrl ?? undefined,
			// keep status as scheduled; approval recorded via feedback
		},
		include: { thesis: true },
	});
}

export async function rejectGuidanceById(guidanceId, { feedback } = {}) {
	return prisma.thesisGuidance.update({
		where: { id: guidanceId },
		data: {
			status: "cancelled",
			supervisorFeedback: feedback ?? "REJECTED",
		},
		include: { thesis: true },
	});
}

export async function getLecturerTheses(lecturerId) {
	const parts = await prisma.thesisParticipant.findMany({
		where: { lecturerId, role: { name: { in: ["pembimbing1", "pembimbing2"] } } },
		select: { thesisId: true },
	});
	return parts.map((p) => p.thesisId);
}

export async function countTotalProgressComponents() {
	return prisma.thesisProgressComponent.count();
}

export async function getValidatedCompletionsByThesis(thesisIds = []) {
	if (!thesisIds.length) return [];
	return prisma.thesisProgressCompletion.groupBy({
		by: ["thesisId"],
		where: { thesisId: { in: thesisIds }, validatedBySupervisor: true },
		_count: { _all: true },
	});
}

export async function getStudentActiveThesis(studentId, lecturerId) {
	// Thesis where studentId matches and lecturer is a supervisor
	return prisma.thesis.findFirst({
		where: {
			studentId,
			thesisParticipants: { some: { lecturerId, role: { name: { in: ["pembimbing1", "pembimbing2"] } } } },
		},
		include: { thesisProgressCompletions: true },
	});
}

export async function getAllProgressComponents() {
	return prisma.thesisProgressComponent.findMany({ orderBy: { name: "asc" } });
}

export async function getCompletionsForThesis(thesisId) {
	return prisma.thesisProgressCompletion.findMany({ where: { thesisId } });
}

export async function upsertCompletionsValidated(thesisId, componentIds = []) {
	if (!componentIds.length) return { updated: 0, created: 0 };

	const existing = await prisma.thesisProgressCompletion.findMany({
		where: { thesisId, componentId: { in: componentIds } },
		select: { id: true, componentId: true },
	});
	const existingSet = new Set(existing.map((e) => e.componentId));

	const toUpdateIds = existing.map((e) => e.id);
	const toCreateComponentIds = componentIds.filter((cid) => !existingSet.has(cid));

	const now = new Date();
	const [updateRes, createRes] = await prisma.$transaction([
		toUpdateIds.length
			? prisma.thesisProgressCompletion.updateMany({
					where: { id: { in: toUpdateIds } },
					data: { validatedBySupervisor: true, completedAt: now },
				})
			: Promise.resolve({ count: 0 }),
		toCreateComponentIds.length
			? prisma.thesisProgressCompletion.createMany({
					data: toCreateComponentIds.map((cid) => ({ thesisId, componentId: cid, validatedBySupervisor: true, completedAt: now })),
					skipDuplicates: true,
				})
			: Promise.resolve({ count: 0 }),
	]);

	return { updated: updateRes.count || 0, created: createRes.count || 0 };
}

export async function logThesisActivity(thesisId, userId, activity, notes = null) {
	return prisma.thesisActivityLog.create({ data: { thesisId, userId, activity, notes } });
}

export async function listGuidanceHistory(studentId, lecturerId) {
	return prisma.thesisGuidance.findMany({
		where: {
			thesis: { studentId },
			supervisorId: lecturerId,
		},
		include: { schedule: true },
		orderBy: { id: "asc" },
	});
}

export async function listActivityLogs(studentId) {
	return prisma.thesisActivityLog.findMany({
		where: { thesis: { studentId } },
		orderBy: { createdAt: "desc" },
	});
}

// Count number of unique students where this lecturer served as SUPERVISOR_2 and the student has completed Yudisium
export async function countGraduatedAsSupervisor2(lecturerId) {
	// Get studentIds supervised as SUPERVISOR_2
	const parts = await prisma.thesisParticipant.findMany({
		where: { lecturerId, role: { name: "pembimbing2" } },
		select: { thesis: { select: { studentId: true } } },
	});
	const studentIds = Array.from(new Set(parts.map((p) => p.thesis?.studentId).filter(Boolean)));
	if (!studentIds.length) return 0;

	// Find Yudisium participants where schedule is completed
	const yps = await prisma.yudisiumParticipant.findMany({
		where: {
			applicant: { studentId: { in: studentIds } },
			yudisium: { schedule: { status: "completed" } },
		},
		select: { applicant: { select: { studentId: true } } },
	});
	const graduatedStudentIds = new Set(yps.map((y) => y.applicant?.studentId).filter(Boolean));
	return graduatedStudentIds.size;
}

// Resolve ThesisStatus name->id map (lowercased name keys)
export async function getThesisStatusMap() {
	const statuses = await prisma.thesisStatus.findMany({ select: { id: true, name: true } });
	const map = new Map(statuses.map((s) => [String(s.name || "").toLowerCase(), s.id]));
	return map;
}

// Update thesis status by id
export async function updateThesisStatusById(thesisId, thesisStatusId) {
	return prisma.thesis.update({ where: { id: thesisId }, data: { thesisStatusId } });
}

