import prisma from "../config/prisma.js";

export function findUserByEmailOrIdentity(email, identityNumber) {
	const or = [];
	if (email) or.push({ email });
	if (identityNumber) or.push({ identityNumber });
	if (or.length === 0) return null;
	return prisma.user.findFirst({ where: { OR: or } });
}

export function findUserByEmail(email) {
	if (!email) return null;
	return prisma.user.findFirst({ where: { email } });
}

export function findUserByIdentity(identityNumber) {
	if (!identityNumber) return null;
	return prisma.user.findFirst({ where: { identityNumber } });
}

export function createUser({ fullName, email, password, identityNumber, identityType, isVerified }) {
	return prisma.user.create({
		data: { fullName, email, password, identityNumber, identityType, isVerified },
	});
}

export async function getOrCreateRole(name) {
	try {
		return await prisma.userRole.upsert({
			where: { id: undefined },
			update: {},
			create: { name },
		});
	} catch {
		const existing = await prisma.userRole.findFirst({ where: { name } });
		return await (existing || prisma.userRole.create({ data: { name } }));
	}
}

export function ensureUserRole(userId, roleId) {
	return prisma.userHasRole.upsert({
		where: { userId_roleId: { userId, roleId } },
		update: {},
		create: { userId, roleId, status: "active" },
	});
}

export function ensureStudent(userId, enrollmentYear = null, skscompleted = 0) {
	return prisma.student.upsert({
		where: { userId },
		update: {},
		create: { userId, enrollmentYear, skscompleted: Number.isInteger(skscompleted) && skscompleted >= 0 ? skscompleted : 0 },
	});
}

