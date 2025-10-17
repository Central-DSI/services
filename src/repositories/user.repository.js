import prisma from "../config/prisma.js";

export function findRoleByName(name) {
	return prisma.userRole.findFirst({ where: { name } });
}

export async function getOrCreateRole(name) {
	const existing = await findRoleByName(name);
	if (existing) return existing;
	return prisma.userRole.create({ data: { name } });
}

export function findUserByEmailOrIdentity(email, identityNumber) {
	const or = [];
	if (email) or.push({ email });
	if (identityNumber) or.push({ identityNumber });
	if (or.length === 0) return null;
	return prisma.user.findFirst({ where: { OR: or } });
}

export function createUser({ fullName, email, password, identityNumber, identityType, phoneNumber, isVerified = true }) {
	return prisma.user.create({
		data: { fullName, email, password, identityNumber, identityType, phoneNumber, isVerified },
	});
}

export function addRoleToUser(userId, roleId) {
	return prisma.userHasRole.create({ data: { userId, roleId, status: "active" } });
}

export function hasUserRole(userId, roleId) {
	return prisma.userHasRole.findFirst({ where: { userId, roleId } });
}

export function findStudentStatusByName(name) {
	return prisma.studentStatus.findFirst({ where: { name } });
}

export function createStudentStatus(name) {
	return prisma.studentStatus.create({ data: { name } });
}

export function createStudentForUser({ userId, studentStatusId, enrollmentYear, skscompleted }) {
	return prisma.student.create({
		data: {
			userId,
			studentStatusId: studentStatusId || null,
			enrollmentYear: enrollmentYear ?? null,
			skscompleted,
		},
	});
}



export function findLecturerByUserId(userId) {
	return prisma.lecturer.findUnique({ where: { userId } });
}

export function createLecturerForUser({ userId, scienceGroupId = null }) {
	return prisma.lecturer.create({
		data: {
			userId,
			scienceGroupId,
		},
	});
}
