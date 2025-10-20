import prisma from "../config/prisma.js";

export function findRoleByName(name) {
	return prisma.userRole.findFirst({ where: { name } });
}
export async function getOrCreateRole(name) {
	const existing = await findRoleByName(name);
	if (existing) return existing;
	return prisma.userRole.create({ data: { name } });
}
export function getUserRolesWithIds(userId) {
	return prisma.userHasRole.findMany({
		where: { userId },
		select: { roleId: true, status: true, role: { select: { id: true, name: true } } },
	});
}
export function addRolesToUser(userId, roleIds = []) {
	if (!roleIds.length) return Promise.resolve({ count: 0 });
	const data = roleIds.map((roleId) => ({ userId, roleId, status: "active" }));
	return prisma.userHasRole.createMany({ data, skipDuplicates: true });
}
export function removeRolesFromUser(userId, roleIds = []) {
	if (!roleIds.length) return Promise.resolve({ count: 0 });
	return prisma.userHasRole.deleteMany({ where: { userId, roleId: { in: roleIds } } });
}

/** Upsert a role assignment with a given status (active|nonActive) */
export function upsertUserRole(userId, roleId, status = "active") {
	return prisma.userHasRole.upsert({
		where: { userId_roleId: { userId, roleId } },
		update: { status },
		create: { userId, roleId, status },
	});
}

/** Update status for an existing role assignment */
export function updateUserRoleStatus(userId, roleId, status) {
	return prisma.userHasRole.update({ where: { userId_roleId: { userId, roleId } }, data: { status } });
}
export function findUserByEmailOrIdentity(email, identityNumber) {
	const or = [];
	if (email) or.push({ email: String(email).toLowerCase() });
	if (identityNumber) or.push({ identityNumber: String(identityNumber) });
	if (or.length === 0) return null;
	return prisma.user.findFirst({ where: { OR: or } });
}
export function findUserById(id) {
	return prisma.user.findUnique({ where: { id } });
}
export function updateUserById(id, data) {
	return prisma.user.update({ where: { id }, data });
}
export function createUser({ fullName, email, password, identityNumber, identityType, phoneNumber, isVerified = true }) {
	return prisma.user.create({
		data: {
			fullName,
			email: email ? String(email).toLowerCase() : null,
			password,
			identityNumber,
			identityType,
			phoneNumber,
			isVerified,
		},
	});
}
export function findStudentStatusByName(name) {
	return prisma.studentStatus.findFirst({ where: { name } });
}
export function createStudentStatus(name) {
	return prisma.studentStatus.create({ data: { name } });
}
export async function getOrCreateStudentStatus(name) {
	const existing = await findStudentStatusByName(name);
	if (existing) return existing;
	return createStudentStatus(name);
}
export function findStudentByUserId(userId) {
	return prisma.student.findUnique({ where: { userId } });
}
export function createStudentForUser({ userId, studentStatusId, enrollmentYear, skscompleted }) {
	const sks = Number.isInteger(skscompleted) && skscompleted >= 0 ? skscompleted : 0;
	return prisma.student.create({
		data: {
			userId,
			studentStatusId: studentStatusId || null,
			enrollmentYear: enrollmentYear ?? null,
			skscompleted: sks,
		},
	});
}
export function findLecturerByUserId(userId) {
	return prisma.lecturer.findUnique({ where: { userId } });
}
export function createLecturerForUser({ userId, scienceGroupId = null }) {
	return prisma.lecturer.create({
		data: { userId, scienceGroupId },
	});
}
